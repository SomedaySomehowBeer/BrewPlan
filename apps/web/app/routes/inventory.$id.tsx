import { useLoaderData, Outlet, Link } from "react-router";
import type { Route } from "./+types/inventory.$id";
import { requireUser } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { ArrowLeft, Pencil } from "lucide-react";

const categoryLabels: Record<string, string> = {
  grain: "Grain",
  hop: "Hop",
  yeast: "Yeast",
  adjunct: "Adjunct",
  water_chemistry: "Water Chemistry",
  packaging: "Packaging",
  cleaning: "Cleaning",
  other: "Other",
};

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireUser(request);

  const item = queries.inventory.get(params.id);
  if (!item) {
    throw new Response("Inventory item not found", { status: 404 });
  }

  return { item };
}

export default function InventoryItemLayout() {
  const { item } = useLoaderData<typeof loader>();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2">
          <Link to="/inventory">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Inventory
          </Link>
        </Button>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold">{item.name}</h2>
              <Badge variant="outline">
                {categoryLabels[item.category] ?? item.category}
              </Badge>
              {item.isGlutenFree && (
                <Badge variant="success">GF</Badge>
              )}
            </div>
            {item.sku && (
              <p className="text-sm text-muted-foreground">
                SKU: {item.sku}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to={`/inventory/${item.id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
          </div>
        </div>

        {/* Sub-navigation */}
        <div className="mt-4 flex gap-1 border-b overflow-x-auto">
          <Link
            to={`/inventory/${item.id}`}
            className="inline-flex min-h-[44px] items-center whitespace-nowrap border-b-2 border-transparent px-3 text-sm font-medium text-muted-foreground hover:text-foreground [&.active]:border-primary [&.active]:text-foreground"
          >
            Overview
          </Link>
          <Link
            to={`/inventory/${item.id}/lots`}
            className="inline-flex min-h-[44px] items-center whitespace-nowrap border-b-2 border-transparent px-3 text-sm font-medium text-muted-foreground hover:text-foreground [&.active]:border-primary [&.active]:text-foreground"
          >
            Lots
          </Link>
          <Link
            to={`/inventory/${item.id}/movements`}
            className="inline-flex min-h-[44px] items-center whitespace-nowrap border-b-2 border-transparent px-3 text-sm font-medium text-muted-foreground hover:text-foreground [&.active]:border-primary [&.active]:text-foreground"
          >
            Movements
          </Link>
        </div>
      </div>

      <Outlet />
    </div>
  );
}
