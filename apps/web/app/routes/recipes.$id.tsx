import {
  useLoaderData,
  Outlet,
  Link,
  Form,
  useNavigation,
} from "react-router";
import type { Route } from "./+types/recipes.$id";
import { requireUser } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { Button } from "~/components/ui/button";
import { StatusBadge } from "~/components/shared/status-badge";
import { ArrowLeft, Pencil, Archive, CheckCircle, Plus } from "lucide-react";
import { redirect } from "react-router";

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireUser(request);

  const recipe = queries.recipes.get(params.id);
  if (!recipe) {
    throw new Response("Recipe not found", { status: 404 });
  }

  return { recipe };
}

export async function action({ request, params }: Route.ActionArgs) {
  await requireUser(request);

  const formData = await request.formData();
  const intent = String(formData.get("intent"));

  if (intent === "activate") {
    queries.recipes.setStatus(params.id, "active");
    return { ok: true };
  }

  if (intent === "archive") {
    queries.recipes.setStatus(params.id, "archived");
    return { ok: true };
  }

  if (intent === "reactivate") {
    queries.recipes.setStatus(params.id, "active");
    return { ok: true };
  }

  if (intent === "create-batch") {
    return redirect(`/batches/new?recipeId=${params.id}`);
  }

  return { ok: false };
}

export default function RecipeLayout() {
  const { recipe } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2">
          <Link to="/recipes">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Recipes
          </Link>
        </Button>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold">{recipe.name}</h2>
              <StatusBadge status={recipe.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {recipe.style} &middot; v{recipe.version}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to={`/recipes/${recipe.id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>

            {recipe.status === "draft" && (
              <Form method="post">
                <input type="hidden" name="intent" value="activate" />
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  disabled={isSubmitting}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Activate
                </Button>
              </Form>
            )}

            {recipe.status === "active" && (
              <>
                <Form method="post">
                  <input type="hidden" name="intent" value="archive" />
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    disabled={isSubmitting}
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    Archive
                  </Button>
                </Form>
                <Form method="post">
                  <input type="hidden" name="intent" value="create-batch" />
                  <Button type="submit" size="sm" disabled={isSubmitting}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Batch
                  </Button>
                </Form>
              </>
            )}

            {recipe.status === "archived" && (
              <Form method="post">
                <input type="hidden" name="intent" value="reactivate" />
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  disabled={isSubmitting}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Reactivate
                </Button>
              </Form>
            )}
          </div>
        </div>

        {/* Sub-navigation */}
        <div className="mt-4 flex gap-1 border-b">
          <Link
            to={`/recipes/${recipe.id}`}
            className="inline-flex min-h-[44px] items-center border-b-2 border-transparent px-3 text-sm font-medium text-muted-foreground hover:text-foreground [&.active]:border-primary [&.active]:text-foreground"
          >
            Details
          </Link>
          <Link
            to={`/recipes/${recipe.id}/ingredients`}
            className="inline-flex min-h-[44px] items-center border-b-2 border-transparent px-3 text-sm font-medium text-muted-foreground hover:text-foreground [&.active]:border-primary [&.active]:text-foreground"
          >
            Ingredients
          </Link>
        </div>
      </div>

      <Outlet />
    </div>
  );
}
