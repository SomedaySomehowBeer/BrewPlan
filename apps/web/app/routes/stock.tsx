import { Outlet } from "react-router";
import type { Route } from "./+types/stock";
import { requireUser } from "~/lib/auth.server";

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  return {};
}

export default function StockLayout() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Finished Goods</h1>
        <p className="text-muted-foreground">Packaged beer ready for sale</p>
      </div>
      <Outlet />
    </div>
  );
}
