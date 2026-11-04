import { describe, expect, it } from "vitest";
import type { CustomerDto, ProductDto, UserDto } from "../src/shared/api-types";
import { api, createUser, loginAdmin, unique } from "./helpers";

async function createCategory(cookie: string) {
  const res = await api("/categories", { cookie, body: { name: unique("Categoría") } });
  expect(res.status).toBe(201);
  return ((await res.json()) as { id: string }).id;
}

describe("roles", () => {
  it("el mesero ve el menú pero no puede cambiarlo", async () => {
    const admin = await loginAdmin();
    const mesero = await createUser(admin, "mesero");
    expect((await api("/products", { cookie: mesero.cookie })).status).toBe(200);
    const res = await api("/categories", { cookie: mesero.cookie, body: { name: unique("No") } });
    expect(res.status).toBe(403);
    expect((await api("/users", { cookie: mesero.cookie })).status).toBe(403);
  });

  it("el cajero puede registrar clientes", async () => {
    const admin = await loginAdmin();
    const cajero = await createUser(admin, "cajero");
    const res = await api("/customers", {
      cookie: cajero.cookie,
      body: { docType: "CC", docNumber: String(Date.now()), personType: "natural", name: "Ana Pérez" },
    });
    expect(res.status).toBe(201);
  });
});

describe("productos", () => {
  it("crea un producto con INC del 8 % y devuelve el nombre de la categoría", async () => {
    const cookie = await loginAdmin();
    const categoryId = await createCategory(cookie);
    const res = await api("/products", {
      cookie,
      body: { name: unique("Bandeja paisa"), categoryId, price: 32000, taxType: "INC", taxRate: 800, code: "" },
    });
    expect(res.status).toBe(201);
    const product = (await res.json()) as ProductDto;
    expect(product).toMatchObject({ price: 32000, taxType: "INC", taxRate: 800, code: null });
    expect(product.categoryName).toMatch(/^Categoría/);
  });

  it("rechaza tarifas que no cuadran con el tipo de impuesto", async () => {
    const cookie = await loginAdmin();
    const categoryId = await createCategory(cookie);
    const excluido = await api("/products", {
      cookie,
      body: { name: unique("Agua"), categoryId, price: 3000, taxType: "EXCLUIDO", taxRate: 800 },
    });
    expect(excluido.status).toBe(400);

    const ok = await api("/products", {
      cookie,
      body: { name: unique("Jugo"), categoryId, price: 6000, taxType: "INC", taxRate: 800 },
    });
    const product = (await ok.json()) as ProductDto;
    const patch = await api(`/products/${product.id}`, { cookie, method: "PATCH", body: { taxType: "EXCLUIDO" } });
    expect(patch.status).toBe(400);
  });

  it("no acepta precios con decimales", async () => {
    const cookie = await loginAdmin();
    const categoryId = await createCategory(cookie);
    const res = await api("/products", {
      cookie,
      body: { name: unique("Café"), categoryId, price: 2500.5, taxType: "INC", taxRate: 800 },
    });
    expect(res.status).toBe(400);
  });

  it("avisa cuando el nombre ya existe", async () => {
    const cookie = await loginAdmin();
    const categoryId = await createCategory(cookie);
    const name = unique("Limonada");
    const body = { name, categoryId, price: 5000, taxType: "INC", taxRate: 800 };
    expect((await api("/products", { cookie, body })).status).toBe(201);
    const dup = await api("/products", { cookie, body });
    expect(dup.status).toBe(409);
    expect(await dup.json()).toEqual({ error: "Ya existe un producto con ese nombre" });
  });

  it("busca sin interpretar % como comodín", async () => {
    const cookie = await loginAdmin();
    const res = await api("/products?q=%25", { cookie });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });
});

describe("clientes", () => {
  it("calcula el dígito de verificación del NIT", async () => {
    const cookie = await loginAdmin();
    const res = await api("/customers", {
      cookie,
      body: { docType: "NIT", docNumber: "800197268", personType: "juridica", name: "DIAN", email: "" },
    });
    expect(res.status).toBe(201);
    const customer = (await res.json()) as CustomerDto;
    expect(customer).toMatchObject({ dv: "4", email: null });
  });

  it("rechaza letras en una cédula", async () => {
    const cookie = await loginAdmin();
    const res = await api("/customers", {
      cookie,
      body: { docType: "CC", docNumber: "12AB34", personType: "natural", name: "Juan" },
    });
    expect(res.status).toBe(400);
  });
});

describe("usuarios", () => {
  it("asigna sedes a un usuario", async () => {
    const cookie = await loginAdmin();
    const sede = await api("/sedes", { cookie, body: { name: unique("Sede") } });
    const { id: sedeId } = (await sede.json()) as { id: string };
    const res = await api("/users", {
      cookie,
      body: { name: "Caja 1", email: `caja-${Date.now()}@prueba.co`, role: "cajero", password: "clave-segura-1", sedeIds: [sedeId] },
    });
    expect(res.status).toBe(201);
    expect(((await res.json()) as UserDto).sedeIds).toEqual([sedeId]);
  });

  it("no deja que el administrador se desactive a sí mismo", async () => {
    const cookie = await loginAdmin();
    const res = await api("/users/admin", { cookie, method: "PATCH", body: { active: false } });
    expect(res.status).toBe(400);
  });
});
