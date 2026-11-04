import {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useEffect,
  useId,
  useRef,
} from "react";

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "danger" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-emerald-700 text-white hover:bg-emerald-800 focus-visible:outline-emerald-700",
  secondary: "bg-white text-slate-800 ring-1 ring-slate-300 hover:bg-slate-50 focus-visible:outline-slate-500",
  danger: "bg-white text-red-700 ring-1 ring-red-300 hover:bg-red-50 focus-visible:outline-red-600",
  ghost: "text-slate-700 hover:bg-slate-100 focus-visible:outline-slate-500",
};

export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type={type}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition",
        "focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}

const control =
  "block rounded-lg border-0 bg-white px-3 py-2 text-sm text-slate-900 ring-1 ring-slate-300 ring-inset " +
  "placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-600 disabled:bg-slate-100";

interface ControlProps {
  invalid?: boolean;
  // Ancho según el contenido en vez de ocupar toda la fila.
  inline?: boolean;
}

const controlClass = ({ invalid, inline }: ControlProps, className?: string) =>
  cx(control, inline ? "w-auto" : "w-full", invalid && "ring-red-500", className);

export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: ReactNode;
  children: (id: string, describedBy: string | undefined) => ReactNode;
}) {
  const id = useId();
  const messageId = `${id}-msg`;
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children(id, error || hint ? messageId : undefined)}
      {error ? (
        <p id={messageId} className="text-xs text-red-700">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ invalid, inline, className, ...props }: InputHTMLAttributes<HTMLInputElement> & ControlProps) {
  return <input aria-invalid={invalid || undefined} className={controlClass({ invalid, inline }, className)} {...props} />;
}

export function Select({ invalid, inline, className, ...props }: SelectHTMLAttributes<HTMLSelectElement> & ControlProps) {
  return <select aria-invalid={invalid || undefined} className={controlClass({ invalid, inline }, className)} {...props} />;
}

export function Textarea({ invalid, className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & ControlProps) {
  return <textarea aria-invalid={invalid || undefined} rows={3} className={controlClass({ invalid }, className)} {...props} />;
}

export function TextField({
  label,
  error,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: ReactNode }) {
  return (
    <Field label={label} error={error} hint={hint}>
      {(id, describedBy) => <Input id={id} aria-describedby={describedBy} invalid={!!error} {...props} />}
    </Field>
  );
}

export function Alert({
  children,
  tone = "error",
  className,
}: {
  children: ReactNode;
  tone?: "error" | "info";
  className?: string;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cx(
        "rounded-lg px-3 py-2 text-sm",
        className,
        tone === "error" ? "bg-red-50 text-red-800 ring-1 ring-red-200" : "bg-sky-50 text-sky-900 ring-1 ring-sky-200",
      )}
    >
      {children}
    </div>
  );
}

export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "green" | "amber" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-50 text-emerald-800",
    amber: "bg-amber-50 text-amber-800",
  };
  return <span className={cx("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", tones[tone])}>{children}</span>;
}

export function ActiveBadge({ active }: { active: boolean }) {
  return active ? <Badge tone="green">Activo</Badge> : <Badge tone="amber">Inactivo</Badge>;
}

export function Dialog({
  title,
  onClose,
  children,
  footer,
  onSubmit,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
  onSubmit: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    dialog.showModal();
    // showModal enfoca el botón de cerrar; mejor el primer campo del formulario.
    dialog.querySelector<HTMLElement>(".dialog-body :is(input, select, textarea)")?.focus();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="m-auto w-[min(36rem,calc(100vw-2rem))] rounded-2xl bg-white p-0 shadow-xl"
    >
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-500 hover:bg-slate-100" aria-label="Cerrar">
            ✕
          </button>
        </header>
        <div className="dialog-body max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">{children}</div>
        <footer className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">{footer}</footer>
      </form>
    </dialog>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Toolbar({
  q,
  onQ,
  placeholder,
  showInactive,
  onShowInactive,
  children,
}: {
  q: string;
  onQ: (q: string) => void;
  placeholder: string;
  showInactive: boolean;
  onShowInactive: (value: boolean) => void;
  children?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <Input
        type="search"
        value={q}
        onChange={(e) => onQ(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="max-w-xs"
      />
      {children}
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={showInactive}
          onChange={(e) => onShowInactive(e.target.checked)}
          className="size-4 rounded border-slate-300 text-emerald-700"
        />
        Mostrar inactivos
      </label>
    </div>
  );
}

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

export function Table<T extends { id: string }>({
  columns,
  rows,
  loading,
  empty,
}: {
  columns: Column<T>[];
  rows: T[] | undefined;
  loading: boolean;
  empty: string;
}) {
  return (
    <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold tracking-wide text-slate-600 uppercase">
          <tr>
            {columns.map((col) => (
              <th key={col.header} scope="col" className={cx("px-4 py-3", col.className)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows?.map((row) => (
            <tr key={row.id} className="hover:bg-slate-50">
              {columns.map((col) => (
                <td key={col.header} className={cx("px-4 py-3 align-middle", col.className)}>
                  {col.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!loading && rows?.length === 0 && <p className="px-4 py-10 text-center text-sm text-slate-500">{empty}</p>}
      {loading && !rows && <p className="px-4 py-10 text-center text-sm text-slate-500">Cargando…</p>}
    </div>
  );
}
