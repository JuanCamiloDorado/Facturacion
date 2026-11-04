export const ROLES = ["admin", "cajero", "mesero", "cocina"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  cajero: "Cajero",
  mesero: "Mesero",
  cocina: "Cocina",
};

// INC: impuesto al consumo (restaurantes, 8 %). IVA: franquicias y otros productos.
// NINGUNO: el negocio no es responsable del impuesto.
export const TAX_TYPES = ["INC", "IVA", "EXENTO", "EXCLUIDO", "NINGUNO"] as const;
export type TaxType = (typeof TAX_TYPES)[number];

export const TAX_LABELS: Record<TaxType, string> = {
  INC: "INC (consumo)",
  IVA: "IVA",
  EXENTO: "Exento",
  EXCLUIDO: "Excluido",
  NINGUNO: "Sin impuesto",
};

export const TAXES_WITH_RATE: readonly TaxType[] = ["INC", "IVA"];

export const DOC_TYPES = ["CC", "NIT", "CE", "PP", "TI", "DIE"] as const;
export type DocType = (typeof DOC_TYPES)[number];

export const DOC_LABELS: Record<DocType, string> = {
  CC: "Cédula de ciudadanía",
  NIT: "NIT",
  CE: "Cédula de extranjería",
  PP: "Pasaporte",
  TI: "Tarjeta de identidad",
  DIE: "Documento de identificación extranjero",
};

export const PERSON_TYPES = ["natural", "juridica"] as const;
export type PersonType = (typeof PERSON_TYPES)[number];

// Documento que la DIAN usa para las ventas a "consumidor final".
export const FINAL_CONSUMER_DOC = "222222222222";
