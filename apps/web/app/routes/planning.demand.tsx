import { useLoaderData, Link } from "react-router";
import type { Route } from "./+types/planning.demand";
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
import { formatDate } from "~/lib/utils";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

const FORMAT_LABELS: Record<string, string> = {
  keg_50l: "50L Keg",
  keg_30l: "30L Keg",
  keg_20l: "20L Keg",
  can_375ml: "375ml Can",
  can_355ml: "355ml Can",
  bottle_330ml: "330ml Bottle",
  bottle_500ml: "500ml Bottle",
  other: "Other",
};

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);

  const { upcomingOrders, demand, unfulfillable } =
    queries.planning.getDemandView();

  return { upcomingOrders, demand, unfulfillable };
}

export default function PlanningDemand() {
  const { upcomingOrders, demand, unfulfillable } =
    useLoaderData<typeof loader>();

  return (
    <div className="space-y-6">
      {/* Unfulfillable alert */}
      {unfulfillable.length > 0 && (
        <div className="flex items-start gap-3 rounded-md bg-red-500/10 p-4">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-red-700 dark:text-red-400">
              Unfulfillable demand
            </p>
            <p className="text-sm text-red-600 dark:text-red-300 mt-1">
              {unfulfillable.length} product(s) have demand exceeding available
              finished goods stock.
            </p>
          </div>
        </div>
      )}

      {upcomingOrders.length === 0 && demand.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No confirmed orders with upcoming delivery dates.
          </CardContent>
        </Card>
      )}

      {/* Demand by product */}
      {demand.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Demand by Product</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Mobile cards */}
            <div className="sm:hidden divide-y">
              {demand.map((d, i) => (
                <div
                  key={i}
                  className={`p-4 space-y-1 ${
                    unfulfillable.includes(d) ? "bg-red-500/5" : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="font-medium text-sm">
                      {d.recipeName}
                    </span>
                    <span className="text-sm font-mono">
                      {d.totalQuantity} units
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {FORMAT_LABELS[d.format] ?? d.format}
                  </p>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipe</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead className="text-right">Quantity Needed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {demand.map((d, i) => (
                    <TableRow
                      key={i}
                      className={unfulfillable.includes(d) ? "bg-red-500/5" : ""}
                    >
                      <TableCell className="font-medium">
                        {d.recipeName}
                      </TableCell>
                      <TableCell>
                        {FORMAT_LABELS[d.format] ?? d.format}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {d.totalQuantity}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming orders */}
      {upcomingOrders.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Orders Due ({upcomingOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Mobile cards */}
            <div className="sm:hidden divide-y">
              {upcomingOrders.map((order) => (
                <Link
                  key={order.id}
                  to={`/orders/${order.id}`}
                  className="block p-4 hover:bg-accent transition-colors min-h-[44px]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium text-sm">
                          {order.orderNumber}
                        </span>
                        <StatusBadge status={order.status} />
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {order.customerName}
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      {order.deliveryDate && formatDate(order.deliveryDate)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Delivery Date</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <Link
                          to={`/orders/${order.id}`}
                          className="font-mono font-medium text-primary hover:underline"
                        >
                          {order.orderNumber}
                        </Link>
                      </TableCell>
                      <TableCell>{order.customerName}</TableCell>
                      <TableCell>
                        <StatusBadge status={order.status} />
                      </TableCell>
                      <TableCell>
                        {order.deliveryDate
                          ? formatDate(order.deliveryDate)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${order.total.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
