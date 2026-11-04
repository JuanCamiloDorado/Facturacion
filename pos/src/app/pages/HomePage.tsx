import { Link } from "react-router";
import { useCurrentUser, useSede } from "../auth";
import { Alert, PageHeader } from "../ui";

const SHORTCUTS = [
  { to: "/productos", title: "Productos", text: "Menú, precios e impuestos", roles: ["admin", "cajero", "mesero"] },
  { to: "/clientes", title: "Clientes", text: "Datos para facturar", roles: ["admin", "cajero"] },
  { to: "/sedes", title: "Sedes", text: "Los restaurantes del negocio", roles: ["admin"] },
  { to: "/usuarios", title: "Usuarios", text: "Cajeros, meseros y cocina", roles: ["admin"] },
];

export function HomePage() {
  const { user, sedes } = useCurrentUser();
  const { sedeId } = useSede();
  const sede = sedes.find((s) => s.id === sedeId);
  const shortcuts = SHORTCUTS.filter((s) => s.roles.includes(user.role));

  return (
    <>
      <PageHeader title={`Hola, ${user.name.split(" ")[0]}`} description={sede ? `Trabajando en ${sede.name}` : undefined} />
      {sedes.length === 0 && (
        <Alert tone="info">
          {user.role === "admin"
            ? "Crea la primera sede del negocio para empezar a vender."
            : "Pídele al administrador que te asigne una sede."}
        </Alert>
      )}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {shortcuts.map((s) => (
          <Link
            key={s.to}
            to={s.to}
            className="rounded-xl bg-white p-5 ring-1 ring-slate-200 transition hover:ring-emerald-600"
          >
            <p className="font-semibold">{s.title}</p>
            <p className="mt-1 text-sm text-slate-600">{s.text}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
