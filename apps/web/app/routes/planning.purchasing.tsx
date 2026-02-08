import { useLoaderData, Link } from "react-router";
import type { Route } from "./+types/planning.purchasing";
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
import { StatusBadge } from "~/components/shared/status-badge";
import { UnitDisplay } from "~/components/shared/unit-display";
import { formatDate } from "~/lib/utils";
import { AlertTriangle, Truck } from "lucide-react";

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);

  const { itemsWithTiming, pendingDeliveries } =
    queries.planning.getPurchaseTiming();

  return { itemsWithTiming, pendingDeliveries };
}

export default function PlanningPurchasing() {
  const { itemsWithTiming, pendingDeliveries } =
    useLoaderData<typeof loader>();

  const today = new Date().toISOString().split("T")[0];
  const overdueItems = itemsWithTiming.filter(
    (item) => item.orderBy && item.orderBy <= today
  );

  // Group by supplier
  const bySupplier = new Map<
    string,
    typeof itemsWithTiming
  >();
  for (const item of itemsWithTiming) {
    const key = item.supplierName ?? "No Supplier";
    if (!bySupplier.has(key)) bySupplier.set(key, []);
    bySupplier.get(key)!.push(item);
  }

  return (
    <div className="space-y-6">
      {/* Overdue alert */}
      {overdueItems.length > 0 && (
        <div className="flex items-start gap-3 rounded-md bg-red-500/10 p-4">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-red-700 dark:text-red-400">
              Overdue purchase items
            </p>
            <p className="text-sm text-red-600 dark:text-red-300 mt-1">
              {overdueItems.length} item(s) should have been ordered already to
              meet planned brew dates.
            </p>
          </div>
        </div>
      )}

      {itemsWithTiming.length === 0 && pendingDeliveries.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No material shortfalls requiring purchase.
          </CardContent>
        </Card>
      )}

      {/* Shortfall items grouped by supplier */}
      {Array.from(bySupplier.entries()).map(([supplierName, items]) => (
        <Card key={supplierName}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{supplierName}</CardTitle>
              {items[0].supplierId && (
                <Link
                  to="/purchasing/new"
                  className="text-xs text-primary hover:underline"
                >
                  Create PO
                </Link>
              )}
            </div>
            {items[0].leadTimeDays && (
              <p className="text-xs text-muted-foreground">
                Lead time: {items[0].leadTimeDays} days
              </p>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {/* Mobile cards */}
            <div className="sm:hidden divide-y">
              {items.map((item) => (
                <div
                  key={item.inventoryItemId}
                  className={`p-4 space-y-2 ${
                    item.orderBy && item.orderBy <= today ? "bg-red-500/5" : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="font-medium text-sm">
                      {item.inventoryItemName}
                    </span>
                    <span className="text-xs font-medium text-red-600 dark:text-red-400">
                      Short <UnitDisplay value={item.shortfall} unit={item.unit} />
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Required by: </span>
                      <span>
                        {item.requiredBy ? formatDate(item.requiredBy) : "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Order by: </span>
                      <span
                        className={
                          item.orderBy && item.orderBy <= today
                            ? "text-red-600 dark:text-red-400 font-medium"
                            : ""
                        }
                      >
                        {item.orderBy ? formatDate(item.orderBy) : "—"}
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
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Shortfall</TableHead>
                    <TableHead>For Batch</TableHead>
                    <TableHead>Required By</TableHead>
                    <TableHead>Order By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow
                      key={item.inventoryItemId}
                      className={
                        item.orderBy && item.orderBy <= today
                          ? "bg-red-500/5"
                          : ""
                      }
                    >
                      <TableCell className="font-medium">
                        {item.inventoryItemName}
                      </TableCell>
                      <TableCell className="text-right text-red-600 dark:text-red-400 font-medium">
                        <UnitDisplay value={item.shortfall} unit={item.unit} />
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {item.batchNumber ?? "—"}
                      </TableCell>
                      <TableCell>
                        {item.requiredBy
                          ? formatDate(item.requiredBy)
                          : "—"}
                      </TableCell>
                      <TableCell
                        className={
                          item.orderBy && item.orderBy <= today
                            ? "text-red-600 dark:text-red-400 font-medium"
                            : ""
                        }
                      >
                        {item.orderBy ? formatDate(item.orderBy) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Pending deliveries */}
      {pendingDeliveries.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Pending Deliveries
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {pendingDeliveries.map((po) => (
                <Link
                  key={po.id}
                  to={`/purchasing/${po.id}`}
                  className="block p-4 hover:bg-accent transition-colors min-h-[44px]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium text-sm">
                          {po.poNumber}
                        </span>
                        <StatusBadge status={po.status} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {po.supplierName}
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      {po.expectedDeliveryDate
                        ? formatDate(po.expectedDeliveryDate)
                        : "No ETA"}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
