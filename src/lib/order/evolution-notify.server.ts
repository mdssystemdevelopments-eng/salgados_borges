export type EvolutionNotifyResult =
  | { sent: true }
  | { sent: false; reason: "not_configured" | "request_failed"; detail?: string };

type EvolutionConfig = {
  baseUrl: string;
  apiKey: string;
  instance: string;
  notifyNumber: string;
};

function normalizePhoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function getEvolutionConfig(): EvolutionConfig | null {
  const baseUrl = process.env.EVOLUTION_API_URL?.trim();
  const apiKey = process.env.EVOLUTION_API_KEY?.trim();
  const instance = process.env.EVOLUTION_API_INSTANCE?.trim();
  const notifyRaw =
    process.env.EVOLUTION_ORDER_NOTIFY_NUMBER?.trim() || "5517991005213";

  if (!baseUrl || !apiKey || !instance) return null;

  const notifyNumber = normalizePhoneDigits(notifyRaw);
  if (notifyNumber.length < 10) return null;

  return {
    baseUrl: baseUrl.replace(/\/$/, ""),
    apiKey,
    instance,
    notifyNumber,
  };
}

/** Envia texto via Evolution API para o numero configurado (ex.: loja). */
export async function sendOrderEvolutionNotification(message: string): Promise<EvolutionNotifyResult> {
  const config = getEvolutionConfig();
  if (!config) return { sent: false, reason: "not_configured" };

  const url = `${config.baseUrl}/message/sendText/${encodeURIComponent(config.instance)}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: config.apiKey,
      },
      body: JSON.stringify({
        number: config.notifyNumber,
        text: message,
      }),
    });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 300);
      console.error("[evolution] send failed", response.status, detail);
      return { sent: false, reason: "request_failed", detail };
    }

    return { sent: true };
  } catch (error) {
    console.error("[evolution] send error", error);
    return {
      sent: false,
      reason: "request_failed",
      detail: error instanceof Error ? error.message : "unknown",
    };
  }
}
