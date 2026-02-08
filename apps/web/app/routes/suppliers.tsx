import { Outlet } from "react-router";
import type { Route } from "./+types/suppliers";
import { requireUser } from "~/lib/auth.server";

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  return {};
}

export default function SuppliersLayout() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Suppliers</h1>
        <p className="text-muted-foreground">Manage ingredient and packaging suppliers</p>
      </div>
      <Outlet />
    </div>
  );
}
