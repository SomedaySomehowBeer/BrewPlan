import { Outlet } from "react-router";
import type { Route } from "./+types/batches";
import { requireUser } from "~/lib/auth.server";

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  return {};
}

export default function BatchesLayout() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Batches</h1>
        <p className="text-muted-foreground">Track your brew batches</p>
      </div>
      <Outlet />
    </div>
  );
}
