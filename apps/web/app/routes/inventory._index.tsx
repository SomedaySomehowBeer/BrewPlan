import { useLoaderData, Link, useSearchParams } from "react-router";
import type { Route } from "./+types/inventory._index";
import { requireUser } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { UnitDisplay } from "~/components/shared/unit-display";
import { EmptyState } from "~/components/shared/empty-state";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Plus, Package, AlertTriangle, Download } from "lucide-react";
import { InventoryCategory } from "@brewplan/shared";
import type { InventoryCategory as InventoryCategoryType } from "@brewplan/shared";

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

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);

  const url = new URL(request.url);
  const categoryFilter = url.searchParams.get(
    "category"
  ) as InventoryCategoryType | null;

  const allItems = queries.inventory.getPositionAll();

  const filteredItems = categoryFilter
    ? allItems.filter((item) => item.category === categoryFilter)
    : allItems;

  return { items: filteredItems, categoryFilter, userRole: user.role };
}

export default function InventoryIndex() {
  const { items, categoryFilter, userRole } = useLoaderData<typeof loader>();
  const [, setSearchParams] = useSearchParams();

  function handleCategoryChange(value: string) {
    if (value === "all") {
      setSearchParams({});
    } else {
      setSearchParams({ category: value });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="overflow-x-auto">
          <Tabs
            value={categoryFilter ?? "all"}
            onValueChange={handleCategoryChange}
          >
            <TabsList className="flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="all">All</TabsTrigger>
              {Object.entries(categoryLabels).map(([key, label]) => (
                <TabsTrigger key={key} value={key}>
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" asChild>
            <a href="/inventory/export" download>
              <Download className="mr-2 h-4 w-4" />
              CSV
            </a>
          </Button>
          {userRole !== "viewer" && (
            <Button asChild>
              <Link to="/inventory/new">
                <Plus className="mr-2 h-4 w-4" />
                New Item
              </Link>
            </Button>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No inventory items"
          description={
            categoryFilter
              ? `No ${categoryLabels[categoryFilter] ?? categoryFilter} items found.`
              : "Add your first inventory item to get started."
          }
          actionLabel="New Item"
          actionTo="/inventory/new"
        />
      ) : (
        <div className="grid gap-3">
          {items.map((item) => {
            const isNegative = item.quantityAvailable < 0;
            const isBelowReorder =
              item.reorderPoint != null &&
              item.quantityAvailable < item.reorderPoint &&
              item.quantityAvailable >= 0;

            return (
              <Link key={item.id} to={`/inventory/${item.id}`}>
                <Card className="hover:border-primary/50 transition-colors">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="font-medium truncate">
                          {item.name}
                        </span>
                        {(isNegative || isBelowReorder) && (
                          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {categoryLabels[item.category] ?? item.category}
                        </Badge>
                        {item.reorderPoint != null && (
                          <span className="text-xs">
                            Reorder at{" "}
                            <UnitDisplay
                              value={item.reorderPoint}
                              unit={item.unit}
                              decimals={0}
                            />
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="ml-3 text-right">
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            On Hand
                          </p>
                          <p className="text-sm font-medium">
                            <UnitDisplay
                              value={item.quantityOnHand}
                              unit={item.unit}
                              decimals={1}
                            />
                          </p>
                        </div>
                        <div className="border-l pl-2">
                          <p className="text-xs text-muted-foreground">
                            Available
                          </p>
                          <p
                            className={`text-sm font-medium ${
                              isNegative
                                ? "text-destructive"
                                : isBelowReorder
                                  ? "text-amber-600"
                                  : ""
                            }`}
                          >
                            <UnitDisplay
                              value={item.quantityAvailable}
                              unit={item.unit}
                              decimals={1}
                            />
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
