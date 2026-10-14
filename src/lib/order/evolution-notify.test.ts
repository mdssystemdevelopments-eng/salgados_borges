import { describe, expect, it } from "vitest";

import { normalizeNotifyNumber } from "./evolution-notify.server";

describe("normalizeNotifyNumber", () => {
  it("adiciona DDI 55 para DDD+numero com 11 digitos", () => {
    expect(normalizeNotifyNumber("17991005213")).toBe("5517991005213");
  });

  it("mantem numero ja com DDI 55", () => {
    expect(normalizeNotifyNumber("5517991005213")).toBe("5517991005213");
  });

  it("remove caracteres nao numericos", () => {
    expect(normalizeNotifyNumber("(17) 99100-5213")).toBe("5517991005213");
  });
});
