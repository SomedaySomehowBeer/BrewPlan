import { Outlet } from "react-router";
import type { Route } from "./+types/recipes";
import { requireUser } from "~/lib/auth.server";

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  return {};
}

export default function RecipesLayout() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Recipes</h1>
        <p className="text-muted-foreground">Manage your beer recipes</p>
      </div>
      <Outlet />
    </div>
  );
}
