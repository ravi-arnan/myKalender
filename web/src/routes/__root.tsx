import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { LogoReveal } from "../components/LogoReveal";

export const Route = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <LogoReveal />
      {import.meta.env.DEV ? <TanStackRouterDevtools /> : null}
    </>
  ),
});
