import { useDeferredValue, useState } from "react";
import type { CategoryDto } from "../../shared/api-types";
import { categorySchema } from "../../shared/schemas";
import { ApiError } from "../api";
import { useForm, useList, useSave } from "../crud";
import { ActiveBadge, Alert, Button, Dialog, Field, PageHeader, Table, Textarea, TextField, Toolbar } from "../ui";

function CategoryDialog({ category, onClose }: { category: CategoryDto | null; onClose: () => void }) {
  const save = useSave<CategoryDto>("categories");
  const form = useForm({ name: category?.name ?? "", description: category?.description ?? "" });

  function submit() {
    const data = form.parse(categorySchema);
    if (!data) return;
    save.mutate(
      { id: category?.id, data },
      {
        onSuccess: onClose,
        onError: (err) => err instanceof ApiError && form.setErrors(err.fieldErrors()),
      },
    );
  }

  return (
    <Dialog
      title={category ? "Editar categoría" : "Nueva categoría"}
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
        value={form.values.name}
        onChange={(e) => form.set("name", e.target.value)}
        error={form.errors.name}
        autoFocus
      />
      <Field label="Descripción (opcional)" error={form.errors.description}>
        {(id) => (
          <Textarea id={id} value={form.values.description} onChange={(e) => form.set("description", e.target.value)} />
        )}
      </Field>
    </Dialog>
  );
}

export function CategoriesPage() {
  const [q, setQ] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState<CategoryDto | "new" | null>(null);
  const list = useList<CategoryDto>("categories", { q: useDeferredValue(q), active: showInactive ? "all" : "true" });
  const toggle = useSave<CategoryDto>("categories");

  return (
    <>
      <PageHeader
        title="Categorías"
        description="Agrupan los productos del menú: entradas, platos fuertes, bebidas…"
        actions={<Button onClick={() => setEditing("new")}>Nueva categoría</Button>}
      />
      <Toolbar q={q} onQ={setQ} placeholder="Buscar categoría" showInactive={showInactive} onShowInactive={setShowInactive} />
      {list.error && <Alert className="mb-4">{list.error.message}</Alert>}
      <Table
        rows={list.data}
        loading={list.isPending}
        empty="Todavía no hay categorías."
        columns={[
          { header: "Nombre", cell: (c) => <span className="font-medium">{c.name}</span> },
          { header: "Descripción", cell: (c) => <span className="text-slate-600">{c.description ?? "—"}</span> },
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
      {editing && <CategoryDialog category={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );
}
