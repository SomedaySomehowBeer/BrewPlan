import { useLoaderData, Link } from "react-router";
import type { Route } from "./+types/orders.$id._index";
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
import { Button } from "~/components/ui/button";
import { formatDate, formatNumber } from "~/lib/utils";

const channelLabels: Record<string, string> = {
  wholesale: "Wholesale",
  taproom: "Taproom",
  online: "Online",
  market: "Market",
  other: "Other",
};

const formatLabels: Record<string, string> = {
  keg_50l: "Keg 50L",
  keg_30l: "Keg 30L",
  keg_20l: "Keg 20L",
  can_375ml: "Can 375ml",
  can_355ml: "Can 355ml",
  bottle_330ml: "Bottle 330ml",
  bottle_500ml: "Bottle 500ml",
  other: "Other",
};

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireUser(request);

  const order = queries.orders.getWithLines(params.id);
  if (!order) {
    throw new Response("Order not found", { status: 404 });
  }

  return { order };
}

export default function OrderDetail() {
  const { order } = useLoaderData<typeof loader>();

  return (
    <div className="space-y-6">
      {/* Order Info */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {order.customer && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <Link
                    to={`/customers/${order.customer.id}`}
                    className="text-primary hover:underline"
                  >
                    {order.customer.name}
                  </Link>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <StatusBadge status={order.customer.customerType} />
                </div>
              </>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Channel</span>
              <span>{channelLabels[order.channel] ?? order.channel}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Delivery</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivery Date</span>
              <span>
                {order.deliveryDate ? formatDate(order.deliveryDate) : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Address</span>
              <span className="text-right max-w-[200px]">
                {order.deliveryAddress ?? "—"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice / Payment Info */}
      {(order.invoiceNumber || order.paidAt) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Invoice & Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {order.invoiceNumber && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Invoice Number</span>
                <span className="font-mono">{order.invoiceNumber}</span>
              </div>
            )}
            {order.paidAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Paid</span>
                <span>{formatDate(order.paidAt)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Order Lines */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Order Lines</CardTitle>
          {order.status === "draft" && (
            <Button asChild size="sm" variant="outline">
              <Link to={`/orders/${order.id}/lines`}>Manage Lines</Link>
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {order.lines.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground px-4">
              No order lines yet.
              {order.status === "draft" && (
                <div className="mt-3">
                  <Link
                    to={`/orders/${order.id}/lines`}
                    className="text-primary underline"
                  >
                    Add order lines
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="sm:hidden divide-y">
                {order.lines.map((line) => (
                  <div key={line.id} className="p-4 space-y-1">
                    <div className="font-medium text-sm">
                      {line.recipeName ?? line.description}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatLabels[line.format] ?? line.format}
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>
                        {line.quantity} x ${formatNumber(line.unitPrice, 2)}
                      </span>
                      <span className="font-medium">
                        ${formatNumber(line.lineTotal, 2)}
                      </span>
                    </div>
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
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Line Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.lines.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell className="font-medium">
                          {line.recipeName ?? line.description}
                        </TableCell>
                        <TableCell>
                          {formatLabels[line.format] ?? line.format}
                        </TableCell>
                        <TableCell className="text-right">
                          {line.quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          ${formatNumber(line.unitPrice, 2)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${formatNumber(line.lineTotal, 2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          {/* Totals */}
          {order.lines.length > 0 && (
            <div className="border-t p-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${formatNumber(order.subtotal, 2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>${formatNumber(order.tax, 2)}</span>
              </div>
              <div className="flex justify-between font-medium text-base pt-1 border-t">
                <span>Total</span>
                <span>${formatNumber(order.total, 2)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      {order.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{order.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
