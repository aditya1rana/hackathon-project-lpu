import type { ComponentType } from "react";
import { createBrowserRouter } from "react-router";
import AuthGuard from "./components/auth/AuthGuard";

type RouteModule = {
  default: ComponentType;
};

const lazyRoute = (importer: () => Promise<RouteModule>) => async () => {
  const module = await importer();
  return { Component: module.default };
};

export const router = createBrowserRouter([
  {
    path: "/login",
    lazy: lazyRoute(() => import("./pages/login")),
  },
  {
    path: "/",
    Component: AuthGuard,
    children: [
      {
        path: "/",
        lazy: lazyRoute(() => import("./layouts/dashboard-layout")),
        children: [
          { index: true, lazy: lazyRoute(() => import("./pages/dashboard")) },
          { path: "inventory", lazy: lazyRoute(() => import("./pages/inventory")) },
          { path: "inventory/:id", lazy: lazyRoute(() => import("./pages/item-details")) },
          { path: "analytics", lazy: lazyRoute(() => import("./pages/analytics")) },
          { path: "predictions", lazy: lazyRoute(() => import("./pages/predictions")) },
          { path: "procurement", lazy: lazyRoute(() => import("./pages/procurement")) },
          { path: "requests", lazy: lazyRoute(() => import("./pages/requests")) },
          { path: "suppliers", lazy: lazyRoute(() => import("./pages/suppliers")) },
          { path: "users", lazy: lazyRoute(() => import("./pages/users")) },
          { path: "settings", lazy: lazyRoute(() => import("./pages/settings")) },
        ],
      },
      {
        path: "/user",
        lazy: lazyRoute(() => import("./layouts/user-layout")),
        children: [
          { index: true, lazy: lazyRoute(() => import("./pages/user-catalog")) },
          { path: "requests", lazy: lazyRoute(() => import("./pages/user-requests")) },
        ]
      }
    ]
  }
]);
