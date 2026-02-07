import { useLoaderData } from "react-router";
import type { Route } from "./+types/inventory.$id._index";
import { requireUser } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { UnitDisplay } from "~/components/shared/unit-display";
import { AlertTriangle, TrendingDown, Package, Truck } from "lucide-react";

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireUser(request);

  const item = queries.inventory.get(params.id);
  if (!item) {
    throw new Response("Inventory item not found", { status: 404 });
  }

  const position = queries.inventory.getPosition(params.id);

  return { item, position };
}

export default function InventoryItemDetail() {
  const { item, position } = useLoaderData<typeof loader>();

  const isNegative = position.quantityAvailable < 0;
  const isBelowReorder =
    item.reorderPoint != null &&
    position.quantityAvailable < item.reorderPoint &&
    position.quantityAvailable >= 0;

  return (
    <div className="space-y-6">
      {/* Warning banner */}
      {(isNegative || isBelowReorder) && (
        <div
          className={`flex items-center gap-2 rounded-md p-3 text-sm ${
            isNegative
              ? "bg-destructive/10 text-destructive"
              : "bg-amber-500/10 text-amber-700"
          }`}
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {isNegative
            ? "Available quantity is negative. More stock is allocated than on hand."
            : "Stock is below reorder point. Consider placing an order."}
        </div>
      )}

      {/* Position Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stock Position</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="flex items-start gap-2">
              <Package className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground uppercase">
                  On Hand
                </p>
                <p className="text-lg font-semibold">
                  <UnitDisplay
                    value={position.quantityOnHand}
                    unit={item.unit}
                    decimals={1}
                  />
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <TrendingDown className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground uppercase">
                  Allocated
                </p>
                <p className="text-lg font-semibold">
                  <UnitDisplay
                    value={position.quantityAllocated}
                    unit={item.unit}
                    decimals={1}
                  />
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div
                className={`mt-0.5 h-4 w-4 rounded-full ${
                  isNegative
                    ? "bg-destructive"
                    : isBelowReorder
                      ? "bg-amber-500"
                      : "bg-green-500"
                }`}
              />
              <div>
                <p className="text-xs text-muted-foreground uppercase">
                  Available
                </p>
                <p
                  className={`text-lg font-semibold ${
                    isNegative
                      ? "text-destructive"
                      : isBelowReorder
                        ? "text-amber-600"
                        : ""
                  }`}
                >
                  <UnitDisplay
                    value={position.quantityAvailable}
                    unit={item.unit}
                    decimals={1}
                  />
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Truck className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground uppercase">
                  Projected
                </p>
                <p className="text-lg font-semibold">
                  <UnitDisplay
                    value={position.quantityProjected}
                    unit={item.unit}
                    decimals={1}
                  />
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reorder Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reorder Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase">
                Reorder Point
              </p>
              <p className="text-lg font-semibold">
                {item.reorderPoint != null ? (
                  <UnitDisplay
                    value={item.reorderPoint}
                    unit={item.unit}
                    decimals={1}
                  />
                ) : (
                  "--"
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">
                Reorder Qty
              </p>
              <p className="text-lg font-semibold">
                {item.reorderQty != null ? (
                  <UnitDisplay
                    value={item.reorderQty}
                    unit={item.unit}
                    decimals={1}
                  />
                ) : (
                  "--"
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">
                Unit Cost
              </p>
              <p className="text-lg font-semibold">
                ${Number(item.unitCost).toFixed(2)}/{item.unit}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Item Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {item.subcategory && (
              <div>
                <p className="text-xs text-muted-foreground uppercase">
                  Subcategory
                </p>
                <p className="text-sm font-medium">{item.subcategory}</p>
              </div>
            )}
            {item.countryOfOrigin && (
              <div>
                <p className="text-xs text-muted-foreground uppercase">
                  Country of Origin
                </p>
                <p className="text-sm font-medium">{item.countryOfOrigin}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground uppercase">
                Gluten Free
              </p>
              <p className="text-sm font-medium">
                {item.isGlutenFree ? "Yes" : "No"}
              </p>
            </div>
          </div>
          {item.notes && (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground uppercase">Notes</p>
              <p className="mt-1 text-sm">{item.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
