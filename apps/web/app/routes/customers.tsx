import { Outlet } from "react-router";
import type { Route } from "./+types/customers";
import { requireUser } from "~/lib/auth.server";

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  return {};
}

export default function CustomersLayout() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Customers</h1>
        <p className="text-muted-foreground">Manage venues, shops, and distributors</p>
      </div>
      <Outlet />
    </div>
  );
}
