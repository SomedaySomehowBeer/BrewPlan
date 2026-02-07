import { Outlet } from "react-router";
import type { Route } from "./+types/vessels";
import { requireUser } from "~/lib/auth.server";

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  return {};
}

export default function VesselsLayout() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Vessels</h1>
        <p className="text-muted-foreground">Manage your brewing vessels</p>
      </div>
      <Outlet />
    </div>
  );
}
