import type { DocType, PersonType, Role, TaxType } from "./constants";

// Formas de las respuestas de la API (las fechas llegan como texto ISO).

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface SedeDto {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  legalName: string | null;
  nit: string | null;
  active: boolean;
  createdAt: string;
}

export interface MeResponse {
  user: SessionUser;
  tenant: { slug: string; name: string };
  sedes: Pick<SedeDto, "id" | "name">[];
}

export interface UserDto {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  sedeIds: string[];
}

export interface CategoryDto {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: string;
}

export interface ProductDto {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  code: string | null;
  description: string | null;
  price: number;
  taxType: TaxType;
  taxRate: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerDto {
  id: string;
  docType: DocType;
  docNumber: string;
  dv: string | null;
  personType: PersonType;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  active: boolean;
  createdAt: string;
}

export interface ApiErrorBody {
  error: string;
  issues?: { path: string; message: string }[];
}
