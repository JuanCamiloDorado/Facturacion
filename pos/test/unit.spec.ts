import { describe, expect, it } from "vitest";
import { nitCheckDigit } from "../src/shared/nit";
import { hashPassword, verifyPassword } from "../src/worker/lib/password";
import { tenantSlugFromHost } from "../src/worker/lib/tenant";

describe("tenantSlugFromHost", () => {
  it("toma el subdominio del dominio base", () => {
    expect(tenantSlugFromHost("lacasona.supos.com", "supos.com", "")).toBe("lacasona");
    expect(tenantSlugFromHost("demo.localhost:5173", "localhost", "demo")).toBe("demo");
  });

  it("usa el cliente por defecto cuando no hay subdominio", () => {
    expect(tenantSlugFromHost("localhost:5173", "localhost", "demo")).toBe("demo");
    expect(tenantSlugFromHost("supos.com", "supos.com", "")).toBeNull();
  });

  it("rechaza subdominios de varios niveles o con caracteres raros", () => {
    expect(tenantSlugFromHost("a.b.supos.com", "supos.com", "")).toBeNull();
    expect(tenantSlugFromHost("-mal.supos.com", "supos.com", "")).toBeNull();
  });
});

describe("nitCheckDigit", () => {
  it("calcula el dígito de verificación de la DIAN", () => {
    expect(nitCheckDigit("800197268")).toBe("4");
    expect(nitCheckDigit("860002964")).toBe("4");
  });
});

describe("contraseñas", () => {
  it("verifica la contraseña correcta y rechaza las demás", async () => {
    const hash = await hashPassword("clave-segura-1");
    expect(hash.startsWith("pbkdf2$100000$")).toBe(true);
    expect(await verifyPassword("clave-segura-1", hash)).toBe(true);
    expect(await verifyPassword("otra-clave", hash)).toBe(false);
    expect(await verifyPassword("clave-segura-1", "formato-raro")).toBe(false);
  });
});
