import { useLoaderData, Link } from "react-router";
import type { Route } from "./+types/purchasing.$id._index";
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
import { Button } from "~/components/ui/button";
import { formatDate, formatNumber } from "~/lib/utils";
import { ListPlus, PackageCheck } from "lucide-react";

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireUser(request);

  const po = queries.purchasing.getWithLines(params.id);
  if (!po) {
    throw new Response("Purchase order not found", { status: 404 });
  }

  return { po };
}

export default function PurchaseOrderDetail() {
  const { po } = useLoaderData<typeof loader>();

  const canReceive = ["sent", "acknowledged", "partially_received"].includes(
    po.status
  );

  return (
    <div className="space-y-6">
      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        {po.status === "draft" && (
          <Button asChild>
            <Link to={`/purchasing/${po.id}/lines`}>
              <ListPlus className="mr-2 h-4 w-4" />
              Manage Lines
            </Link>
          </Button>
        )}
        {canReceive && (
          <Button variant="outline" asChild>
            <Link to={`/purchasing/${po.id}/receive`}>
              <PackageCheck className="mr-2 h-4 w-4" />
              Receive Items
            </Link>
          </Button>
        )}
      </div>

      {/* Supplier Info */}
      {po.supplier && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Supplier</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <Link
                to={`/suppliers/${po.supplierId}`}
                className="text-primary hover:underline"
              >
                {po.supplier.name}
              </Link>
            </div>
            {po.supplier.contactName && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Contact</span>
                <span>{po.supplier.contactName}</span>
              </div>
            )}
            {po.supplier.email && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span>{po.supplier.email}</span>
              </div>
            )}
            {po.supplier.phone && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span>{po.supplier.phone}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dates */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Dates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Order Date</span>
            <span>{po.orderDate ? formatDate(po.orderDate) : "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Expected Delivery</span>
            <span>
              {po.expectedDeliveryDate
                ? formatDate(po.expectedDeliveryDate)
                : "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Created</span>
            <span>{formatDate(po.createdAt)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Order Lines */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Order Lines ({po.lines.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {po.lines.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No lines added yet.{" "}
              {po.status === "draft" && (
                <Link
                  to={`/purchasing/${po.id}/lines`}
                  className="text-primary underline"
                >
                  Add lines
                </Link>
              )}
            </p>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="sm:hidden space-y-3">
                {po.lines.map((line) => (
                  <div
                    key={line.id}
                    className="rounded-md border p-3 space-y-1"
                  >
                    <p className="font-medium text-sm">
                      {line.inventoryItemName}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        Ordered: {line.quantityOrdered} {line.unit}
                      </span>
                      <span>
                        Received: {line.quantityReceived} {line.unit}
                      </span>
                      <span>
                        ${formatNumber(line.unitCost, 2)}/{line.unit}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-right">
                      ${formatNumber(line.lineTotal, 2)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block -mx-6 -mb-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Qty Ordered</TableHead>
                      <TableHead className="text-right">Qty Received</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-right">Line Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {po.lines.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell className="font-medium">
                          {line.inventoryItemName}
                        </TableCell>
                        <TableCell className="text-right">
                          {line.quantityOrdered}
                        </TableCell>
                        <TableCell className="text-right">
                          {line.quantityReceived}
                        </TableCell>
                        <TableCell>{line.unit}</TableCell>
                        <TableCell className="text-right">
                          ${formatNumber(line.unitCost, 2)}
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
        </CardContent>
      </Card>

      {/* Totals */}
      {po.lines.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Totals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>${formatNumber(po.subtotal, 2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>${formatNumber(po.tax, 2)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 font-medium">
              <span>Total</span>
              <span>${formatNumber(po.total, 2)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {po.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{po.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
