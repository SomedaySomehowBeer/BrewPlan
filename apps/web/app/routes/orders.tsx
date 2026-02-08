import { Outlet } from "react-router";
import type { Route } from "./+types/orders";
import { requireUser } from "~/lib/auth.server";

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  return {};
}

export default function OrdersLayout() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="text-muted-foreground">Track customer orders and deliveries</p>
      </div>
      <Outlet />
    </div>
  );
}
