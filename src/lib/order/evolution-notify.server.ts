export type EvolutionNotifyResult =
  | { sent: true }
  | {
      sent: false;
      reason: "not_configured" | "request_failed" | "invalid_recipient";
      detail?: string;
    };

type EvolutionConfig = {
  baseUrl: string;
  apiKey: string;
  instance: string;
  notifyNumber: string;
};

type SendPayload = Record<string, unknown>;

type SendAttempt = {
  url: string;
  useBearer: boolean;
  body: SendPayload;
};

function normalizePhoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Numero BR para WhatsApp: sempre DDI 55 + DDD + numero (ex.: 5517991005213).
 * Env comum errado: 17991005213 (11 digitos sem 55).
 */
export function normalizeNotifyNumber(digits: string): string {
  let d = digits.replace(/\D/g, "").replace(/^0+/, "");
  if (!d) return d;

  if (d.startsWith("55") && d.length >= 12) {
    return d;
  }

  if (d.length === 10 || d.length === 11) {
    return `55${d}`;
  }

  if (!d.startsWith("55") && d.length >= 8 && d.length <= 11) {
    return `55${d}`;
  }

  return d;
}

function evolutionResponseInvalidRecipient(detail: string): boolean {
  return /"exists"\s*:\s*false/i.test(detail);
}

function normalizeEvolutionBaseUrl(raw: string): string {
  let base = raw.trim().replace(/\/$/, "");
  base = base.replace(/\/message\/sendText(\/.*)?$/i, "");
  return base;
}

function evolutionRecipientJid(digits: string): string {
  if (digits.includes("@")) return digits;
  return `${digits}@s.whatsapp.net`;
}

function getEvolutionConfig(): EvolutionConfig | null {
  const baseUrl = process.env.EVOLUTION_API_URL?.trim();
  const apiKey = process.env.EVOLUTION_API_KEY?.trim();
  const instance = process.env.EVOLUTION_API_INSTANCE?.trim();
  const notifyRaw =
    process.env.EVOLUTION_ORDER_NOTIFY_NUMBER?.trim() || "5517991005213";

  if (!baseUrl || !apiKey || !instance) return null;

  const notifyNumber = normalizeNotifyNumber(normalizePhoneDigits(notifyRaw));
  if (notifyNumber.length < 12 || !notifyNumber.startsWith("55")) return null;

  return {
    baseUrl: normalizeEvolutionBaseUrl(baseUrl),
    apiKey,
    instance: instance.trim(),
    notifyNumber,
  };
}

function buildSendUrls(baseUrl: string, instance: string): string[] {
  const encoded = encodeURIComponent(instance);
  const urls = [`${baseUrl}/message/sendText/${encoded}`];
  if (!/\/v\d+$/i.test(baseUrl)) {
    urls.push(`${baseUrl}/v2/message/sendText/${encoded}`);
    urls.push(`${baseUrl}/v1/message/sendText/${encoded}`);
  }
  return urls;
}

function buildAttempts(config: EvolutionConfig, message: string): SendAttempt[] {
  const digits = config.notifyNumber;
  const jid = evolutionRecipientJid(digits);
  const v2 = (number: string): SendPayload => ({
    number,
    text: message,
    linkPreview: false,
  });
  const v1 = (number: string): SendPayload => ({
    number,
    textMessage: { text: message },
    linkPreview: false,
  });

  const attempts: SendAttempt[] = [];
  for (const url of buildSendUrls(config.baseUrl, config.instance)) {
    attempts.push({ url, useBearer: false, body: v2(digits) });
    attempts.push({ url, useBearer: false, body: v1(digits) });
    attempts.push({ url, useBearer: false, body: v2(jid) });
    attempts.push({ url, useBearer: true, body: v2(digits) });
  }
  return attempts;
}

async function postEvolutionSend(
  url: string,
  apiKey: string,
  body: SendPayload,
  useBearer: boolean,
): Promise<Response> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (useBearer) headers.Authorization = `Bearer ${apiKey}`;
  else headers.apikey = apiKey;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 28_000);
  try {
    return await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

/** Envia texto via Evolution API para o numero configurado (ex.: loja). */
export async function sendOrderEvolutionNotification(message: string): Promise<EvolutionNotifyResult> {
  const config = getEvolutionConfig();
  if (!config) return { sent: false, reason: "not_configured" };

  console.info("[evolution] sending order notify to", config.notifyNumber);

  let lastDetail = "";

  try {
    for (const attempt of buildAttempts(config, message)) {
      const response = await postEvolutionSend(
        attempt.url,
        config.apiKey,
        attempt.body,
        attempt.useBearer,
      );
      if (response.ok) {
        return { sent: true };
      }

      const detail = (await response.text()).slice(0, 400);
      lastDetail = `[${response.status}] ${detail || response.statusText}`;
      console.error("[evolution] attempt failed", attempt.url, lastDetail);

      if (response.status === 401 || response.status === 404) {
        return { sent: false, reason: "request_failed", detail: lastDetail };
      }

      if (response.status === 400 && evolutionResponseInvalidRecipient(lastDetail)) {
        return { sent: false, reason: "invalid_recipient", detail: lastDetail };
      }
    }

    console.error("[evolution] send failed after retries", lastDetail);
    return { sent: false, reason: "request_failed", detail: lastDetail };
  } catch (error) {
    console.error("[evolution] send error", error);
    return {
      sent: false,
      reason: "request_failed",
      detail: error instanceof Error ? error.message : "unknown",
    };
  }
}
