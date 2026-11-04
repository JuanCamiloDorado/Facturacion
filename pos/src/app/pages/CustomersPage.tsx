import { useDeferredValue, useState } from "react";
import type { CustomerDto } from "../../shared/api-types";
import { DOC_LABELS, DOC_TYPES, type DocType, type PersonType } from "../../shared/constants";
import { nitCheckDigit } from "../../shared/nit";
import { customerSchema } from "../../shared/schemas";
import { ApiError } from "../api";
import { useForm, useList, useSave } from "../crud";
import { ActiveBadge, Alert, Button, Dialog, Field, PageHeader, Select, Table, TextField, Toolbar } from "../ui";

function safeCheckDigit(docNumber: string) {
  try {
    return /^\d+$/.test(docNumber) ? nitCheckDigit(docNumber) : null;
  } catch {
    return null;
  }
}

function CustomerDialog({ customer, onClose }: { customer: CustomerDto | null; onClose: () => void }) {
  const save = useSave<CustomerDto>("customers");
  const form = useForm({
    docType: customer?.docType ?? ("CC" as DocType),
    docNumber: customer?.docNumber ?? "",
    personType: customer?.personType ?? ("natural" as PersonType),
    name: customer?.name ?? "",
    email: customer?.email ?? "",
    phone: customer?.phone ?? "",
    address: customer?.address ?? "",
    city: customer?.city ?? "",
  });
  const { values } = form;
  const dv = values.docType === "NIT" ? safeCheckDigit(values.docNumber) : null;

  function submit() {
    const data = form.parse(customerSchema);
    if (!data) return;
    save.mutate(
      { id: customer?.id, data },
      { onSuccess: onClose, onError: (err) => err instanceof ApiError && form.setErrors(err.fieldErrors()) },
    );
  }

  return (
    <Dialog
      title={customer ? "Editar cliente" : "Nuevo cliente"}
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
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tipo de documento" error={form.errors.docType}>
          {(id) => (
            <Select
              id={id}
              value={values.docType}
              onChange={(e) => {
                const docType = e.target.value as DocType;
                form.set("docType", docType);
                form.set("personType", docType === "NIT" ? "juridica" : "natural");
              }}
            >
              {DOC_TYPES.map((d) => (
                <option key={d} value={d}>
                  {DOC_LABELS[d]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <TextField
          label="Número"
          value={values.docNumber}
          onChange={(e) => form.set("docNumber", e.target.value.replace(/[.\-\s]/g, ""))}
          error={form.errors.docNumber}
          hint={dv !== null ? `Dígito de verificación: ${dv}` : "Sin puntos ni guiones"}
          autoFocus
        />
      </div>
      <Field label="Tipo de persona" error={form.errors.personType}>
        {(id) => (
          <Select id={id} value={values.personType} onChange={(e) => form.set("personType", e.target.value as PersonType)}>
            <option value="natural">Persona natural</option>
            <option value="juridica">Empresa (persona jurídica)</option>
          </Select>
        )}
      </Field>
      <TextField
        label={values.personType === "juridica" ? "Razón social" : "Nombre completo"}
        value={values.name}
        onChange={(e) => form.set("name", e.target.value)}
        error={form.errors.name}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Correo (opcional)"
          type="email"
          value={values.email}
          onChange={(e) => form.set("email", e.target.value)}
          error={form.errors.email}
          hint="Para enviarle la factura"
        />
        <TextField
          label="Teléfono (opcional)"
          type="tel"
          value={values.phone}
          onChange={(e) => form.set("phone", e.target.value)}
          error={form.errors.phone}
        />
        <TextField
          label="Dirección (opcional)"
          value={values.address}
          onChange={(e) => form.set("address", e.target.value)}
          error={form.errors.address}
        />
        <TextField
          label="Ciudad (opcional)"
          value={values.city}
          onChange={(e) => form.set("city", e.target.value)}
          error={form.errors.city}
        />
      </div>
    </Dialog>
  );
}

export function CustomersPage() {
  const [q, setQ] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState<CustomerDto | "new" | null>(null);
  const list = useList<CustomerDto>("customers", { q: useDeferredValue(q), active: showInactive ? "all" : "true", limit: 100 });
  const toggle = useSave<CustomerDto>("customers");

  return (
    <>
      <PageHeader
        title="Clientes"
        description="Personas y empresas a las que se les factura."
        actions={<Button onClick={() => setEditing("new")}>Nuevo cliente</Button>}
      />
      <Toolbar q={q} onQ={setQ} placeholder="Buscar por nombre o documento" showInactive={showInactive} onShowInactive={setShowInactive} />
      {list.error && <Alert className="mb-4">{list.error.message}</Alert>}
      <Table
        rows={list.data}
        loading={list.isPending}
        empty="No hay clientes con estos filtros."
        columns={[
          { header: "Nombre", cell: (c) => <span className="font-medium">{c.name}</span> },
          {
            header: "Documento",
            cell: (c) => (
              <span className="tabular-nums">
                {c.docType} {c.docNumber}
                {c.dv !== null && `-${c.dv}`}
              </span>
            ),
          },
          { header: "Contacto", cell: (c) => <span className="text-slate-600">{c.email ?? c.phone ?? "—"}</span> },
          { header: "Estado", cell: (c) => <ActiveBadge active={c.active} /> },
          {
            header: "Acciones",
            className: "text-right",
            cell: (c) => (
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setEditing(c)}>
                  Editar
                </Button>
                <Button
                  variant={c.active ? "danger" : "secondary"}
                  disabled={toggle.isPending}
                  onClick={() => toggle.mutate({ id: c.id, data: { active: !c.active } })}
                >
                  {c.active ? "Desactivar" : "Activar"}
                </Button>
              </div>
            ),
          },
        ]}
      />
      {editing && <CustomerDialog customer={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );
}
