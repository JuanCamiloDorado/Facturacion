import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import { ApiError } from "./api";
import { ME_KEY, RequireAuth, RequireRole } from "./auth";
import "./index.css";
import { Layout } from "./layout";
import { CategoriesPage } from "./pages/CategoriesPage";
import { CustomersPage } from "./pages/CustomersPage";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { ProductsPage } from "./pages/ProductsPage";
import { SedesPage } from "./pages/SedesPage";
import { UsersPage } from "./pages/UsersPage";

// Si cualquier petición responde 401, la sesión terminó: se vuelve al login.
function onApiError(error: Error) {
  if (error instanceof ApiError && error.status === 401) queryClient.setQueryData(ME_KEY, null);
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: onApiError }),
  mutationCache: new MutationCache({ onError: onApiError }),
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: (
      <RequireAuth>
        <Layout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <HomePage /> },
      {
        path: "productos",
        element: (
          <RequireRole roles={["admin", "cajero", "mesero"]}>
            <ProductsPage />
          </RequireRole>
        ),
      },
      {
        path: "categorias",
        element: (
          <RequireRole roles={["admin"]}>
            <CategoriesPage />
          </RequireRole>
        ),
      },
      {
        path: "clientes",
        element: (
          <RequireRole roles={["admin", "cajero"]}>
            <CustomersPage />
          </RequireRole>
        ),
      },
      {
        path: "sedes",
        element: (
          <RequireRole roles={["admin"]}>
            <SedesPage />
          </RequireRole>
        ),
      },
      {
        path: "usuarios",
        element: (
          <RequireRole roles={["admin"]}>
            <UsersPage />
          </RequireRole>
        ),
      },
      { path: "*", element: <p className="text-slate-600">Esta página no existe.</p> },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
