import { describe, expect, it } from "vitest";
import type { MeResponse } from "../src/shared/api-types";
import { api, createUser, login, loginAdmin } from "./helpers";
import { ADMIN_EMAIL, TENANTS } from "./setup";

describe("clientes (tenants)", () => {
  it("responde 404 si el subdominio no es de ningún cliente", async () => {
    const res = await api("/auth/me", { tenant: "noexiste" });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Este negocio no existe o está suspendido" });
  });

  it("no deja entrar a un cliente suspendido", async () => {
    const res = await api("/auth/login", { tenant: "suspendido", body: { email: ADMIN_EMAIL, password: "x" } });
    expect(res.status).toBe(404);
  });

  it("cada cliente tiene sus propios usuarios y sesiones", async () => {
    // Mismo correo, pero la contraseña de "otro" no sirve en "demo".
    const wrong = await api("/auth/login", {
      tenant: "demo",
      body: { email: ADMIN_EMAIL, password: TENANTS.otro.password },
    });
    expect(wrong.status).toBe(401);

    // Una sesión de "demo" no sirve en "otro".
    const demoCookie = await loginAdmin("demo");
    const crossed = await api("/auth/me", { tenant: "otro", cookie: demoCookie });
    expect(crossed.status).toBe(401);

    const me = await api("/auth/me", { tenant: "demo", cookie: demoCookie });
    expect(((await me.json()) as MeResponse).tenant.slug).toBe("demo");
  });

  it("los datos creados en un cliente no aparecen en otro", async () => {
    const demoCookie = await loginAdmin("demo");
    const otroCookie = await loginAdmin("otro");
    const created = await api("/categories", { cookie: demoCookie, body: { name: "Solo en demo" } });
    expect(created.status).toBe(201);

    const res = await api("/categories?q=Solo%20en%20demo", { tenant: "otro", cookie: otroCookie });
    expect(await res.json()).toEqual([]);
  });
});

describe("login", () => {
  it("rechaza la contraseña incorrecta con un mensaje genérico", async () => {
    const res = await api("/auth/login", { body: { email: ADMIN_EMAIL, password: "incorrecta" } });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Correo o contraseña incorrectos" });
  });

  it("entra, devuelve la sesión y permite cerrarla", async () => {
    const cookie = await loginAdmin();
    const me = await api("/auth/me", { cookie });
    expect(me.status).toBe(200);
    const body = (await me.json()) as MeResponse;
    expect(body.user).toMatchObject({ email: ADMIN_EMAIL, role: "admin" });

    const logout = await api("/auth/logout", { cookie, method: "POST" });
    expect(logout.status).toBe(200);
    expect((await api("/auth/me", { cookie })).status).toBe(401);
  });

  it("la cookie de sesión es HttpOnly y SameSite=Lax", async () => {
    const res = await api("/auth/login", { body: { email: ADMIN_EMAIL, password: TENANTS.demo.password } });
    const header = res.headers.get("set-cookie") ?? "";
    expect(header).toMatch(/HttpOnly/i);
    expect(header).toMatch(/SameSite=Lax/i);
  });

  it("bloquea el correo después de 10 intentos fallidos", async () => {
    const admin = await loginAdmin();
    const victim = await createUser(admin, "cajero");
    for (let i = 0; i < 10; i++) {
      const res = await api("/auth/login", { body: { email: victim.email, password: "mala" } });
      expect(res.status).toBe(401);
    }
    const locked = await api("/auth/login", { body: { email: victim.email, password: victim.password } });
    expect(locked.status).toBe(429);
  });

  it("sin sesión, la API responde 401", async () => {
    expect((await api("/products")).status).toBe(401);
  });
});

describe("seguridad", () => {
  it("rechaza formularios enviados desde otro sitio (CSRF)", async () => {
    const cookie = await loginAdmin();
    const res = await api("/categories", {
      cookie,
      method: "POST",
      headers: { Origin: "https://sitio-malicioso.com", "Content-Type": "application/x-www-form-urlencoded" },
    });
    expect(res.status).toBe(403);
  });

  it("un usuario desactivado pierde su sesión", async () => {
    const admin = await loginAdmin();
    const cajero = await createUser(admin, "cajero");
    expect((await api("/auth/me", { cookie: cajero.cookie })).status).toBe(200);

    await api(`/users/${cajero.id}`, { cookie: admin, method: "PATCH", body: { active: false } });
    expect((await api("/auth/me", { cookie: cajero.cookie })).status).toBe(401);
    const again = await api("/auth/login", { body: { email: cajero.email, password: cajero.password } });
    expect(again.status).toBe(401);
  });

  it("cambiar la contraseña cierra las otras sesiones", async () => {
    const admin = await loginAdmin();
    const mesero = await createUser(admin, "mesero");
    await api(`/users/${mesero.id}`, { cookie: admin, method: "PATCH", body: { password: "nueva-clave-99" } });
    expect((await api("/auth/me", { cookie: mesero.cookie })).status).toBe(401);
    await login(mesero.email, "nueva-clave-99");
  });
});
