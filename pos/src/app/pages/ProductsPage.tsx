import { useDeferredValue, useState } from "react";
import type { CategoryDto, ProductDto } from "../../shared/api-types";
import { TAX_LABELS, TAX_TYPES, TAXES_WITH_RATE, type TaxType } from "../../shared/constants";
import { productSchema } from "../../shared/schemas";
import { ApiError } from "../api";
import { useHasRole } from "../auth";
import { useForm, useList, useSave } from "../crud";
import { formatMoney, formatRate, splitTax } from "../format";
import {
  ActiveBadge,
  Alert,
  Badge,
  Button,
  Dialog,
  Field,
  PageHeader,
  Select,
  Table,
  Textarea,
  TextField,
  Toolbar,
} from "../ui";

// Tarifas usuales en Colombia, en puntos básicos.
const RATES: Partial<Record<TaxType, number[]>> = { INC: [800], IVA: [1900, 500] };
const DEFAULT_RATE: Record<TaxType, number> = { INC: 800, IVA: 1900, EXENTO: 0, EXCLUIDO: 0, NINGUNO: 0 };

function ProductDialog({
  product,
  categories,
  onClose,
}: {
  product: ProductDto | null;
  categories: CategoryDto[];
  onClose: () => void;
}) {
  const save = useSave<ProductDto>("products");
  const form = useForm({
    name: product?.name ?? "",
    categoryId: product?.categoryId ?? categories[0]?.id ?? "",
    code: product?.code ?? "",
    description: product?.description ?? "",
    price: product ? String(product.price) : "",
    taxType: product?.taxType ?? ("INC" as TaxType),
    taxRate: product?.taxRate ?? 800,
  });
  const { values } = form;
  const price = Number(values.price);
  const { base, tax } = splitTax(Number.isFinite(price) ? price : 0, values.taxRate);
  const hasRate = TAXES_WITH_RATE.includes(values.taxType);

  function submit() {
    const data = form.parse(productSchema, { ...values, price: values.price === "" ? Number.NaN : Number(values.price) });
    if (!data) return;
    save.mutate(
      { id: product?.id, data },
      { onSuccess: onClose, onError: (err) => err instanceof ApiError && form.setErrors(err.fieldErrors()) },
    );
  }

  return (
    <Dialog
      title={product ? "Editar producto" : "Nuevo producto"}
      onClose={onClose}
      onSubmit={submit}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={save.isPending}>
            Guardar
          </Button>
        </>
      }
    >
      {save.error && <Alert>{save.error.message}</Alert>}
      <TextField
        label="Nombre"
        value={values.name}
        onChange={(e) => form.set("name", e.target.value)}
        error={form.errors.name}
        autoFocus
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Categoría" error={form.errors.categoryId}>
          {(id) => (
            <Select id={id} value={values.categoryId} onChange={(e) => form.set("categoryId", e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <TextField
          label="Código (opcional)"
          value={values.code}
          onChange={(e) => form.set("code", e.target.value)}
          error={form.errors.code}
          hint="Código interno o de barras"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField
          label="Precio al público"
          type="number"
          inputMode="numeric"
          min={0}
          step={50}
          value={values.price}
          onChange={(e) => form.set("price", e.target.value)}
          error={form.errors.price}
          hint="En pesos, con impuesto incluido"
        />
        <Field label="Impuesto" error={form.errors.taxType}>
          {(id) => (
            <Select
              id={id}
              value={values.taxType}
              onChange={(e) => {
                const taxType = e.target.value as TaxType;
                form.set("taxType", taxType);
                form.set("taxRate", DEFAULT_RATE[taxType]);
              }}
            >
              {TAX_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TAX_LABELS[t]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        {hasRate && (
          <Field label="Tarifa" error={form.errors.taxRate}>
            {(id) => (
              <Select id={id} value={values.taxRate} onChange={(e) => form.set("taxRate", Number(e.target.value))}>
                {(RATES[values.taxType] ?? []).map((r) => (
                  <option key={r} value={r}>
                    {formatRate(r)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
      </div>
      {hasRate && price > 0 && (
        <p className="text-sm text-slate-600">
          Base {formatMoney(base)} + {values.taxType} {formatMoney(tax)} = {formatMoney(price)}
        </p>
      )}
      <Field label="Descripción (opcional)" error={form.errors.description}>
        {(id) => <Textarea id={id} value={values.description} onChange={(e) => form.set("description", e.target.value)} />}
      </Field>
    </Dialog>
  );
}

export function ProductsPage() {
  const canEdit = useHasRole("admin");
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState<ProductDto | "new" | null>(null);
  const categories = useList<CategoryDto>("categories");
  const list = useList<ProductDto>("products", {
    q: useDeferredValue(q),
    categoryId,
    active: showInactive ? "all" : "true",
  });
  const toggle = useSave<ProductDto>("products");
  const noCategories = categories.data?.length === 0;

  return (
    <>
      <PageHeader
        title="Productos"
        description="El menú de los restaurantes. El precio ya incluye el impuesto."
        actions={
          canEdit && (
            <Button onClick={() => setEditing("new")} disabled={!categories.data || noCategories}>
              Nuevo producto
            </Button>
          )
        }
      />
      {canEdit && noCategories && <Alert tone="info" className="mb-4">Primero crea una categoría en la sección Categorías.</Alert>}
      <Toolbar q={q} onQ={setQ} placeholder="Buscar por nombre o código" showInactive={showInactive} onShowInactive={setShowInactive}>
        <Select aria-label="Categoría" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} inline>
          <option value="">Todas las categorías</option>
          {categories.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Toolbar>
      {list.error && <Alert className="mb-4">{list.error.message}</Alert>}
      <Table
        rows={list.data}
        loading={list.isPending}
        empty="No hay productos con estos filtros."
        columns={[
          {
            header: "Producto",
            cell: (p) => (
              <div>
                <p className="font-medium">{p.name}</p>
                {p.code && <p className="text-xs text-slate-500">{p.code}</p>}
              </div>
            ),
          },
          { header: "Categoría", cell: (p) => p.categoryName },
          { header: "Precio", className: "text-right tabular-nums", cell: (p) => formatMoney(p.price) },
          {
            header: "Impuesto",
            cell: (p) => <Badge>{TAXES_WITH_RATE.includes(p.taxType) ? `${p.taxType} ${formatRate(p.taxRate)}` : TAX_LABELS[p.taxType]}</Badge>,
          },
          { header: "Estado", cell: (p) => <ActiveBadge active={p.active} /> },
          ...(canEdit
            ? [
                {
                  header: "Acciones",
                  className: "text-right",
                  cell: (p: ProductDto) => (
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" onClick={() => setEditing(p)}>
                        Editar
                      </Button>
                      <Button
                        variant={p.active ? "danger" : "secondary"}
                        disabled={toggle.isPending}
                        onClick={() => toggle.mutate({ id: p.id, data: { active: !p.active } })}
                      >
                        {p.active ? "Desactivar" : "Activar"}
                      </Button>
                    </div>
                  ),
                },
              ]
            : []),
        ]}
      />
      {editing && categories.data && (
        <ProductDialog
          product={editing === "new" ? null : editing}
          categories={categories.data}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
