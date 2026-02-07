import { Outlet } from "react-router";
import type { Route } from "./+types/planning";
import { requireUser } from "~/lib/auth.server";

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  return {};
}

export default function PlanningLayout() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Planning</h1>
        <p className="text-muted-foreground">Production planning and scheduling</p>
      </div>
      <Outlet />
    </div>
  );
}
