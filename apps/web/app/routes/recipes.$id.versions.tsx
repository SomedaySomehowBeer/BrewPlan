import { useLoaderData, Link } from "react-router";
import type { Route } from "./+types/recipes.$id.versions";
import { requireUser } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { StatusBadge } from "~/components/shared/status-badge";
import { formatDate } from "~/lib/utils";
import { GitBranch } from "lucide-react";

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireUser(request);

  const recipe = queries.recipes.get(params.id);
  if (!recipe) {
    throw new Response("Recipe not found", { status: 404 });
  }

  const versions = queries.recipes.getVersionHistory(params.id);
  return { recipe, versions, currentId: params.id };
}

export default function RecipeVersions() {
  const { recipe, versions, currentId } = useLoaderData<typeof loader>();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <GitBranch className="h-4 w-4" />
          Version History ({versions.length} versions)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {versions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No version history found.</p>
        ) : (
          <div className="space-y-2">
            {versions.map((v) => (
              <Link
                key={v.id}
                to={`/recipes/${v.id}`}
                className={`block rounded-lg border p-3 min-h-[44px] transition-colors hover:bg-accent ${
                  v.id === currentId
                    ? "border-primary bg-primary/5"
                    : "border-border"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">v{v.version}</span>
                    <span className="text-sm text-muted-foreground">
                      {v.name}
                    </span>
                    {v.id === currentId && (
                      <span className="text-xs text-primary font-medium">
                        (current)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={v.status} />
                    <span className="text-xs text-muted-foreground">
                      {formatDate(v.createdAt)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
