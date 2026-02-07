import { Outlet } from "react-router";
import type { Route } from "./+types/inventory";
import { requireUser } from "~/lib/auth.server";

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  return {};
}

export default function InventoryLayout() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Inventory</h1>
        <p className="text-muted-foreground">Track ingredients and supplies</p>
      </div>
      <Outlet />
    </div>
  );
}
