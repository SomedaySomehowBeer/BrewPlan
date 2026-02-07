import { useLoaderData, Link, useSearchParams } from "react-router";
import type { Route } from "./+types/recipes._index";
import { requireUser } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { StatusBadge } from "~/components/shared/status-badge";
import { UnitDisplay } from "~/components/shared/unit-display";
import { EmptyState } from "~/components/shared/empty-state";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import { Plus, ClipboardList } from "lucide-react";
import type { RecipeStatus } from "@brewplan/shared";

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);

  const url = new URL(request.url);
  const statusFilter = url.searchParams.get("status") as RecipeStatus | null;

  const recipes = statusFilter
    ? queries.recipes.list({ status: statusFilter })
    : queries.recipes.list();

  return { recipes, statusFilter };
}

export default function RecipesIndex() {
  const { recipes, statusFilter } = useLoaderData<typeof loader>();
  const [, setSearchParams] = useSearchParams();

  function handleStatusChange(value: string) {
    if (value === "all") {
      setSearchParams({});
    } else {
      setSearchParams({ status: value });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Tabs
          value={statusFilter ?? "all"}
          onValueChange={handleStatusChange}
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="draft">Draft</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="archived">Archived</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button asChild>
          <Link to="/recipes/new">
            <Plus className="mr-2 h-4 w-4" />
            New Recipe
          </Link>
        </Button>
      </div>

      {recipes.length === 0 ? (
        <EmptyState
          title="No recipes found"
          description={
            statusFilter
              ? `No ${statusFilter} recipes yet.`
              : "Create your first recipe to get started."
          }
          actionLabel="New Recipe"
          actionTo="/recipes/new"
        />
      ) : (
        <div className="grid gap-3">
          {recipes.map((recipe) => (
            <Link key={recipe.id} to={`/recipes/${recipe.id}`}>
              <Card className="hover:border-primary/50 transition-colors">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="font-medium truncate">
                        {recipe.name}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                      <span>{recipe.style}</span>
                      <span>
                        <UnitDisplay
                          value={recipe.batchSizeLitres}
                          unit="L"
                          decimals={0}
                        />
                      </span>
                    </div>
                  </div>
                  <div className="ml-3 flex items-center gap-2">
                    <StatusBadge status={recipe.status} />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
