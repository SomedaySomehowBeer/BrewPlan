import { redirect } from "react-router";
import type { Route } from "./+types/recipes.$id.clone";
import { requireMutationAccess } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";

export async function action({ request, params }: Route.ActionArgs) {
  await requireMutationAccess(request);

  const recipe = queries.recipes.get(params.id);
  if (!recipe) {
    throw new Response("Recipe not found", { status: 404 });
  }

  const cloned = queries.recipes.cloneAsNewVersion(params.id);
  return redirect(`/recipes/${cloned.id}`);
}
