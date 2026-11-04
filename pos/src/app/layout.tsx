import { NavLink, Outlet, useNavigate } from "react-router";
import { ROLE_LABELS, type Role } from "../shared/constants";
import { useCurrentUser, useLogout, useSede } from "./auth";
import { Button, Select } from "./ui";

const NAV: { to: string; label: string; roles: Role[] }[] = [
  { to: "/", label: "Inicio", roles: ["admin", "cajero", "mesero", "cocina"] },
  { to: "/productos", label: "Productos", roles: ["admin", "cajero", "mesero"] },
  { to: "/categorias", label: "Categorías", roles: ["admin"] },
  { to: "/clientes", label: "Clientes", roles: ["admin", "cajero"] },
  { to: "/sedes", label: "Sedes", roles: ["admin"] },
  { to: "/usuarios", label: "Usuarios", roles: ["admin"] },
];

function SedeSelector() {
  const { sedes } = useCurrentUser();
  const { sedeId, setSedeId } = useSede();
  if (sedes.length === 0) return <span className="text-sm text-amber-700">Sin sede asignada</span>;
  if (sedes.length === 1) return <span className="text-sm text-slate-700">{sedes[0]!.name}</span>;
  return (
    <Select
      aria-label="Sede"
      value={sedeId ?? ""}
      onChange={(e) => setSedeId(e.target.value)}
      inline
      className="py-1.5"
    >
      {sedes.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </Select>
  );
}

export function Layout() {
  const { user, tenant } = useCurrentUser();
  const logout = useLogout();
  const navigate = useNavigate();
  const items = NAV.filter((item) => item.roles.includes(user.role));

  return (
    <div className="flex min-h-full flex-col md:flex-row">
      <aside className="border-b border-slate-200 bg-white md:w-60 md:shrink-0 md:border-r md:border-b-0">
        <div className="px-5 py-4">
          <p className="text-xs font-semibold tracking-wide text-emerald-700 uppercase">POS Restaurantes</p>
          <p className="truncate font-semibold">{tenant.name}</p>
        </div>
        <nav aria-label="Principal" className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive ? "bg-emerald-50 text-emerald-800" : "text-slate-700 hover:bg-slate-100"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-end gap-3 border-b border-slate-200 bg-white px-5 py-3">
          <SedeSelector />
          <span className="text-sm text-slate-600">
            {user.name} · {ROLE_LABELS[user.role]}
          </span>
          <Button
            variant="ghost"
            disabled={logout.isPending}
            onClick={() => logout.mutate(undefined, { onSettled: () => navigate("/login", { replace: true }) })}
          >
            Salir
          </Button>
        </header>
        <main className="flex-1 px-5 py-6 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
