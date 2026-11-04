import { useDeferredValue, useState } from "react";
import type { SedeDto, UserDto } from "../../shared/api-types";
import { ROLE_LABELS, ROLES, type Role } from "../../shared/constants";
import { userCreateSchema, userUpdateSchema } from "../../shared/schemas";
import { ApiError } from "../api";
import { useCurrentUser } from "../auth";
import { useForm, useList, useSave } from "../crud";
import { formatDateTime } from "../format";
import { ActiveBadge, Alert, Badge, Button, Dialog, Field, PageHeader, Select, Table, TextField, Toolbar } from "../ui";

function UserDialog({ user, sedes, onClose }: { user: UserDto | null; sedes: SedeDto[]; onClose: () => void }) {
  const save = useSave<UserDto>("users");
  const me = useCurrentUser().user;
  const isSelf = user?.id === me.id;
  const form = useForm({
    name: user?.name ?? "",
    email: user?.email ?? "",
    role: user?.role ?? ("cajero" as Role),
    password: "",
    sedeIds: user?.sedeIds ?? (sedes.length === 1 ? [sedes[0]!.id] : []),
  });
  const { values } = form;

  function toggleSede(id: string) {
    form.set("sedeIds", values.sedeIds.includes(id) ? values.sedeIds.filter((s) => s !== id) : [...values.sedeIds, id]);
  }

  function submit() {
    const data = user
      ? form.parse(userUpdateSchema, { ...values, password: values.password || undefined })
      : form.parse(userCreateSchema);
    if (!data) return;
    save.mutate(
      { id: user?.id, data },
      { onSuccess: onClose, onError: (err) => err instanceof ApiError && form.setErrors(err.fieldErrors()) },
    );
  }

  return (
    <Dialog
      title={user ? "Editar usuario" : "Nuevo usuario"}
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
        <TextField
          label="Correo"
          type="email"
          autoComplete="off"
          value={values.email}
          onChange={(e) => form.set("email", e.target.value)}
          error={form.errors.email}
        />
        <Field label="Rol" error={form.errors.role} hint={isSelf ? "No puedes cambiar tu propio rol" : undefined}>
          {(id, describedBy) => (
            <Select
              id={id}
              aria-describedby={describedBy}
              value={values.role}
              disabled={isSelf}
              onChange={(e) => form.set("role", e.target.value as Role)}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      <TextField
        label={user ? "Nueva contraseña (opcional)" : "Contraseña"}
        type="password"
        autoComplete="new-password"
        value={values.password}
        onChange={(e) => form.set("password", e.target.value)}
        error={form.errors.password}
        hint={user ? "Déjala vacía para no cambiarla. Si la cambias, se cierran sus sesiones abiertas." : "Mínimo 8 caracteres"}
      />
      {values.role === "admin" ? (
        <p className="text-sm text-slate-600">Los administradores tienen acceso a todas las sedes.</p>
      ) : (
        <fieldset>
          <legend className="text-sm font-medium text-slate-700">Sedes donde trabaja</legend>
          {sedes.length === 0 && <p className="mt-1 text-sm text-amber-700">Primero crea una sede.</p>}
          <div className="mt-2 flex flex-wrap gap-3">
            {sedes.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={values.sedeIds.includes(s.id)}
                  onChange={() => toggleSede(s.id)}
                  className="size-4 rounded border-slate-300 text-emerald-700"
                />
                {s.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </Dialog>
  );
}

export function UsersPage() {
  const me = useCurrentUser().user;
  const [q, setQ] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState<UserDto | "new" | null>(null);
  const list = useList<UserDto>("users", { q: useDeferredValue(q), active: showInactive ? "all" : "true" });
  const sedes = useList<SedeDto>("sedes");
  const toggle = useSave<UserDto>("users");
  const sedeName = new Map(sedes.data?.map((s) => [s.id, s.name]));

  return (
    <>
      <PageHeader
        title="Usuarios"
        description="Quién puede entrar al sistema y qué puede hacer."
        actions={<Button onClick={() => setEditing("new")}>Nuevo usuario</Button>}
      />
      <Toolbar q={q} onQ={setQ} placeholder="Buscar usuario" showInactive={showInactive} onShowInactive={setShowInactive} />
      {(list.error ?? toggle.error) && <Alert className="mb-4">{(list.error ?? toggle.error)!.message}</Alert>}
      <Table
        rows={list.data}
        loading={list.isPending}
        empty="No hay usuarios con estos filtros."
        columns={[
          {
            header: "Usuario",
            cell: (u) => (
              <div>
                <p className="font-medium">
                  {u.name} {u.id === me.id && <Badge>Tú</Badge>}
                </p>
                <p className="text-xs text-slate-500">{u.email}</p>
              </div>
            ),
          },
          { header: "Rol", cell: (u) => ROLE_LABELS[u.role] },
          {
            header: "Sedes",
            cell: (u) =>
              u.role === "admin" ? (
                <span className="text-slate-600">Todas</span>
              ) : (
                <span className="text-slate-600">{u.sedeIds.map((id) => sedeName.get(id)).filter(Boolean).join(", ") || "—"}</span>
              ),
          },
          { header: "Último ingreso", cell: (u) => <span className="text-slate-600">{formatDateTime(u.lastLoginAt)}</span> },
          { header: "Estado", cell: (u) => <ActiveBadge active={u.active} /> },
          {
            header: "Acciones",
            className: "text-right",
            cell: (u) => (
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setEditing(u)}>
                  Editar
                </Button>
                {u.id !== me.id && (
                  <Button
                    variant={u.active ? "danger" : "secondary"}
                    disabled={toggle.isPending}
                    onClick={() => toggle.mutate({ id: u.id, data: { active: !u.active } })}
                  >
                    {u.active ? "Desactivar" : "Activar"}
                  </Button>
                )}
              </div>
            ),
          },
        ]}
      />
      {editing && sedes.data && (
        <UserDialog user={editing === "new" ? null : editing} sedes={sedes.data} onClose={() => setEditing(null)} />
      )}
    </>
  );
}
