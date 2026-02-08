import { useLoaderData, Link, useSearchParams } from "react-router";
import type { Route } from "./+types/purchasing._index";
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
import { formatDate, formatNumber } from "~/lib/utils";
import { Plus, Calendar } from "lucide-react";

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "received", label: "Received" },
  { value: "cancelled", label: "Cancelled" },
];

const OPEN_STATUSES = ["draft", "sent", "acknowledged", "partially_received"];

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);

  const url = new URL(request.url);
  const filter = url.searchParams.get("filter") || "all";

  const allPOs = queries.purchasing.list();

  let filteredPOs = allPOs;
  if (filter === "open") {
    filteredPOs = allPOs.filter((po) => OPEN_STATUSES.includes(po.status));
  } else if (filter === "received") {
    filteredPOs = allPOs.filter((po) => po.status === "received");
  } else if (filter === "cancelled") {
    filteredPOs = allPOs.filter((po) => po.status === "cancelled");
  }

  return { purchaseOrders: filteredPOs, filter };
}

export default function PurchasingIndex() {
  const { purchaseOrders, filter } = useLoaderData<typeof loader>();
  const [, setSearchParams] = useSearchParams();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          {STATUS_FILTERS.map((f) => (
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
          <Link to="/purchasing/new">
            <Plus className="mr-2 h-4 w-4" />
            New PO
          </Link>
        </Button>
      </div>

      {purchaseOrders.length === 0 ? (
        <EmptyState
          title="No purchase orders found"
          description="Create your first purchase order to start tracking supplier orders."
          actionLabel="New PO"
          actionTo="/purchasing/new"
        />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {purchaseOrders.map((po) => (
              <Link
                key={po.id}
                to={`/purchasing/${po.id}`}
                className="block"
              >
                <Card className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium">
                            {po.poNumber}
                          </span>
                          <StatusBadge status={po.status} />
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {po.supplierName}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {po.orderDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(po.orderDate)}
                            </span>
                          )}
                          {po.expectedDeliveryDate && (
                            <span>Due: {formatDate(po.expectedDeliveryDate)}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right text-sm font-medium">
                        ${formatNumber(po.total, 2)}
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
                      <TableHead>PO Number</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Order Date</TableHead>
                      <TableHead>Expected Delivery</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseOrders.map((po) => (
                      <TableRow key={po.id}>
                        <TableCell>
                          <Link
                            to={`/purchasing/${po.id}`}
                            className="font-mono font-medium text-primary hover:underline"
                          >
                            {po.poNumber}
                          </Link>
                        </TableCell>
                        <TableCell>{po.supplierName}</TableCell>
                        <TableCell>
                          <StatusBadge status={po.status} />
                        </TableCell>
                        <TableCell>
                          {po.orderDate ? formatDate(po.orderDate) : "—"}
                        </TableCell>
                        <TableCell>
                          {po.expectedDeliveryDate
                            ? formatDate(po.expectedDeliveryDate)
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          ${formatNumber(po.total, 2)}
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
