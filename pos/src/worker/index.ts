import { Hono } from "hono";
import { csrf } from "hono/csrf";
import { secureHeaders } from "hono/secure-headers";
import type { ApiErrorBody } from "../shared/api-types";
import { handleError } from "./lib/http";
import { tenantMiddleware } from "./lib/tenant";
import { authRoutes } from "./routes/auth";
import { categoryRoutes } from "./routes/categories";
import { customerRoutes } from "./routes/customers";
import { productRoutes } from "./routes/products";
import { sedeRoutes } from "./routes/sedes";
import { userRoutes } from "./routes/users";
import type { AppEnv } from "./types";

// Solo /api/* llega aquí; el resto lo sirve Cloudflare como archivos estáticos (la app de React).
const app = new Hono<AppEnv>().basePath("/api");

app.use(secureHeaders());
app.use(csrf());
app.use(tenantMiddleware);

app.route("/auth", authRoutes);
app.route("/sedes", sedeRoutes);
app.route("/users", userRoutes);
app.route("/categories", categoryRoutes);
app.route("/products", productRoutes);
app.route("/customers", customerRoutes);

app.notFound((c) => c.json<ApiErrorBody>({ error: "Ruta no encontrada" }, 404));
app.onError(handleError);

export default app;
