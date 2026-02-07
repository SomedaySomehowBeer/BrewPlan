import { useLoaderData } from "react-router";
import type { Route } from "./+types/planning.materials";
import { requireUser } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "~/components/ui/table";
import { UnitDisplay } from "~/components/shared/unit-display";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatNumber } from "~/lib/utils";

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);

  const materials = queries.planning.getMaterialsRequirements();

  // Get planned batches to show what's driving demand
  const schedule = queries.planning
    .getBrewSchedule()
    .filter((b) => b.status === "planned");

  return { materials, plannedBatches: schedule };
}

export default function PlanningMaterials() {
  const { materials, plannedBatches } = useLoaderData<typeof loader>();

  const hasShortfall = materials.some((m) => m.shortfall > 0);

  return (
    <div className="space-y-6">
      {/* Summary */}
      {hasShortfall && (
        <div className="flex items-start gap-3 rounded-md bg-red-500/10 p-4">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-red-700 dark:text-red-400">
              Material shortfalls detected
            </p>
            <p className="text-sm text-red-600 dark:text-red-300 mt-1">
              {materials.filter((m) => m.shortfall > 0).length} ingredient(s)
              have insufficient stock for planned batches.
            </p>
          </div>
        </div>
      )}

      {!hasShortfall && materials.length > 0 && (
        <div className="flex items-start gap-3 rounded-md bg-green-500/10 p-4">
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-green-700 dark:text-green-400">
              All materials available
            </p>
            <p className="text-sm text-green-600 dark:text-green-300 mt-1">
              Stock levels are sufficient for all planned batches.
            </p>
          </div>
        </div>
      )}

      {materials.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No planned batches requiring materials.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Materials Requirements</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Mobile cards */}
            <div className="sm:hidden divide-y">
              {materials.map((m) => (
                <div
                  key={m.inventoryItemId}
                  className={`p-4 space-y-2 ${
                    m.shortfall > 0 ? "bg-red-500/5" : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="font-medium text-sm">
                      {m.inventoryItemName}
                    </span>
                    {m.shortfall > 0 && (
                      <span className="text-xs font-medium text-red-600 dark:text-red-400 bg-red-500/10 px-2 py-0.5 rounded">
                        Short {formatNumber(m.shortfall)} {m.unit}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Needed: </span>
                      <UnitDisplay
                        value={m.quantityNeeded}
                        unit={m.unit}
                      />
                    </div>
                    <div>
                      <span className="text-muted-foreground">On Hand: </span>
                      <UnitDisplay
                        value={m.quantityOnHand}
                        unit={m.unit}
                      />
                    </div>
                    <div>
                      <span className="text-muted-foreground">Allocated: </span>
                      <UnitDisplay
                        value={m.quantityAllocated}
                        unit={m.unit}
                      />
                    </div>
                    <div>
                      <span className="text-muted-foreground">Available: </span>
                      <span
                        className={
                          m.quantityAvailable < 0
                            ? "text-red-600 dark:text-red-400 font-medium"
                            : ""
                        }
                      >
                        <UnitDisplay
                          value={m.quantityAvailable}
                          unit={m.unit}
                        />
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ingredient</TableHead>
                    <TableHead className="text-right">Needed</TableHead>
                    <TableHead className="text-right">On Hand</TableHead>
                    <TableHead className="text-right">Allocated</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead className="text-right">On Order</TableHead>
                    <TableHead className="text-right">Shortfall</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materials.map((m) => (
                    <TableRow
                      key={m.inventoryItemId}
                      className={m.shortfall > 0 ? "bg-red-500/5" : ""}
                    >
                      <TableCell className="font-medium">
                        {m.inventoryItemName}
                      </TableCell>
                      <TableCell className="text-right">
                        <UnitDisplay
                          value={m.quantityNeeded}
                          unit={m.unit}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <UnitDisplay
                          value={m.quantityOnHand}
                          unit={m.unit}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <UnitDisplay
                          value={m.quantityAllocated}
                          unit={m.unit}
                        />
                      </TableCell>
                      <TableCell
                        className={`text-right ${
                          m.quantityAvailable < 0
                            ? "text-red-600 dark:text-red-400 font-medium"
                            : ""
                        }`}
                      >
                        <UnitDisplay
                          value={m.quantityAvailable}
                          unit={m.unit}
                        />
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        <UnitDisplay
                          value={m.quantityOnOrder}
                          unit={m.unit}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        {m.shortfall > 0 ? (
                          <span className="font-medium text-red-600 dark:text-red-400">
                            <UnitDisplay
                              value={m.shortfall}
                              unit={m.unit}
                            />
                          </span>
                        ) : (
                          <span className="text-green-600 dark:text-green-400">
                            —
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Driving demand */}
      {plannedBatches.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Planned Batches Driving Demand
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {plannedBatches.map((batch) => (
                <div
                  key={batch.id}
                  className="flex items-center justify-between p-4 min-h-[44px]"
                >
                  <div>
                    <span className="font-mono font-medium text-sm">
                      {batch.batchNumber}
                    </span>
                    <span className="ml-2 text-sm text-muted-foreground">
                      {batch.recipeName}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {batch.batchSizeLitres} L
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
