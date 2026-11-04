import { useQueryClient } from "@tanstack/react-query";
import { useDeferredValue, useState } from "react";
import type { SedeDto } from "../../shared/api-types";
import { nitCheckDigit } from "../../shared/nit";
import { sedeSchema } from "../../shared/schemas";
import { ApiError } from "../api";
import { ME_KEY } from "../auth";
import { useForm, useList, useSave } from "../crud";
import { ActiveBadge, Alert, Button, Dialog, PageHeader, Table, TextField, Toolbar } from "../ui";

function SedeDialog({ sede, onClose }: { sede: SedeDto | null; onClose: () => void }) {
  const save = useSave<SedeDto>("sedes");
  const queryClient = useQueryClient();
  const form = useForm({
    name: sede?.name ?? "",
    address: sede?.address ?? "",
    phone: sede?.phone ?? "",
    legalName: sede?.legalName ?? "",
    nit: sede?.nit ?? "",
  });
  const { values } = form;
  const dv = /^\d{1,15}$/.test(values.nit) ? nitCheckDigit(values.nit) : null;

  function submit() {
    const data = form.parse(sedeSchema);
    if (!data) return;
    save.mutate(
      { id: sede?.id, data },
      {
        onSuccess: () => {
          // El selector de sede del encabezado sale de /auth/me.
          void queryClient.invalidateQueries({ queryKey: ME_KEY });
          onClose();
        },
        onError: (err) => err instanceof ApiError && form.setErrors(err.fieldErrors()),
      },
    );
  }

  return (
    <Dialog
      title={sede ? "Editar sede" : "Nueva sede"}
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
        hint="Por ejemplo: Restaurante Centro"
        autoFocus
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Dirección (opcional)"
          value={values.address}
          onChange={(e) => form.set("address", e.target.value)}
          error={form.errors.address}
        />
        <TextField
          label="Teléfono (opcional)"
          type="tel"
          value={values.phone}
          onChange={(e) => form.set("phone", e.target.value)}
          error={form.errors.phone}
        />
      </div>
      <fieldset className="space-y-4 rounded-xl bg-slate-50 p-4">
        <legend className="px-1 text-sm font-medium text-slate-700">Solo si esta sede factura con otro NIT</legend>
        <TextField
          label="Razón social"
          value={values.legalName}
          onChange={(e) => form.set("legalName", e.target.value)}
          error={form.errors.legalName}
        />
        <TextField
          label="NIT"
          inputMode="numeric"
          value={values.nit}
          onChange={(e) => form.set("nit", e.target.value.replace(/\D/g, ""))}
          error={form.errors.nit}
          hint={dv !== null ? `Dígito de verificación: ${dv}` : "Sin el dígito de verificación"}
        />
      </fieldset>
    </Dialog>
  );
}

export function SedesPage() {
  const [q, setQ] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState<SedeDto | "new" | null>(null);
  const list = useList<SedeDto>("sedes", { q: useDeferredValue(q), active: showInactive ? "all" : "true" });
  const toggle = useSave<SedeDto>("sedes");
  const queryClient = useQueryClient();

  return (
    <>
      <PageHeader
        title="Sedes"
        description="Cada restaurante del negocio, con su propia caja e inventario."
        actions={<Button onClick={() => setEditing("new")}>Nueva sede</Button>}
      />
      <Toolbar q={q} onQ={setQ} placeholder="Buscar sede" showInactive={showInactive} onShowInactive={setShowInactive} />
      {list.error && <Alert className="mb-4">{list.error.message}</Alert>}
      <Table
        rows={list.data}
        loading={list.isPending}
        empty="Todavía no hay sedes."
        columns={[
          { header: "Nombre", cell: (s) => <span className="font-medium">{s.name}</span> },
          { header: "Dirección", cell: (s) => <span className="text-slate-600">{s.address ?? "—"}</span> },
          { header: "NIT propio", cell: (s) => (s.nit ? `${s.nit}-${nitCheckDigit(s.nit)}` : "—") },
          { header: "Estado", cell: (s) => <ActiveBadge active={s.active} /> },
          {
            header: "Acciones",
            className: "text-right",
            cell: (s) => (
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setEditing(s)}>
                  Editar
                </Button>
                <Button
                  variant={s.active ? "danger" : "secondary"}
                  disabled={toggle.isPending}
                  onClick={() =>
                    toggle.mutate(
                      { id: s.id, data: { active: !s.active } },
                      { onSuccess: () => void queryClient.invalidateQueries({ queryKey: ME_KEY }) },
                    )
                  }
                >
                  {s.active ? "Desactivar" : "Activar"}
                </Button>
              </div>
            ),
          },
        ]}
      />
      {editing && <SedeDialog sede={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );
}
