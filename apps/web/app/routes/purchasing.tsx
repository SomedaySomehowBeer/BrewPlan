import { Outlet } from "react-router";
import type { Route } from "./+types/purchasing";
import { requireUser } from "~/lib/auth.server";

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  return {};
}

export default function PurchasingLayout() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Purchase Orders</h1>
        <p className="text-muted-foreground">Track supplier orders and receiving</p>
      </div>
      <Outlet />
    </div>
  );
}
