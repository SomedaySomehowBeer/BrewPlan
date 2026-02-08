import { useLoaderData, Link, useSearchParams } from "react-router";
import type { Route } from "./+types/orders._index";
import { requireUser } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "~/components/ui/table";
import { StatusBadge } from "~/components/shared/status-badge";
import { EmptyState } from "~/components/shared/empty-state";
import { Plus, Calendar } from "lucide-react";
import { formatDate, formatNumber } from "~/lib/utils";

const ACTIVE_STATUSES = [
  "draft",
  "confirmed",
  "picking",
  "dispatched",
];

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);

  const url = new URL(request.url);
  const filter = url.searchParams.get("filter") || "all";

  const allOrders = queries.orders.list();

  let filteredOrders = allOrders;
  if (filter === "active") {
    filteredOrders = allOrders.filter((o) =>
      ACTIVE_STATUSES.includes(o.status)
    );
  } else if (filter === "completed") {
    filteredOrders = allOrders.filter((o) =>
      ["delivered", "invoiced", "paid"].includes(o.status)
    );
  }

  return { orders: filteredOrders, filter };
}

export default function OrdersIndex() {
  const { orders, filter } = useLoaderData<typeof loader>();
  const [, setSearchParams] = useSearchParams();

  const filters = [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
    { value: "completed", label: "Completed" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          {filters.map((f) => (
            <Button
              key={f.value}
              variant={filter === f.value ? "default" : "outline"}
              size="sm"
              onClick={() => setSearchParams({ filter: f.value })}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <Button asChild>
          <Link to="/orders/new">
            <Plus className="mr-2 h-4 w-4" />
            New Order
          </Link>
        </Button>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          title="No orders found"
          description="Create your first order to get started."
          actionLabel="New Order"
          actionTo="/orders/new"
        />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-3 sm:hidden">
            {orders.map((order) => (
              <Link
                key={order.id}
                to={`/orders/${order.id}`}
                className="block"
              >
                <Card className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium">
                            {order.orderNumber}
                          </span>
                          <StatusBadge status={order.status} />
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {order.customerName}
                        </p>
                        {order.deliveryDate && (
                          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {formatDate(order.deliveryDate)}
                          </div>
                        )}
                      </div>
                      <div className="text-right text-sm font-medium">
                        ${formatNumber(order.total, 2)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Delivery Date</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <Link
                            to={`/orders/${order.id}`}
                            className="font-mono text-primary hover:underline"
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
                        <TableCell className="text-right">
                          ${formatNumber(order.total, 2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
