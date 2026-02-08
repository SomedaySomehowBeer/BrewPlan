import { useLoaderData, Link } from "react-router";
import type { Route } from "./+types/suppliers.$id._index";
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
import { formatDate, formatNumber } from "~/lib/utils";

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireUser(request);

  const supplier = queries.suppliers.getWithItems(params.id);
  if (!supplier) {
    throw new Response("Supplier not found", { status: 404 });
  }

  const allPOs = queries.purchasing.list();
  const supplierPOs = allPOs.filter((po) => po.supplierId === params.id);

  return { supplier, purchaseOrders: supplierPOs };
}

export default function SupplierDetail() {
  const { supplier, purchaseOrders } = useLoaderData<typeof loader>();

  return (
    <div className="space-y-6">
      {/* Supplier Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Supplier Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {supplier.email && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span>{supplier.email}</span>
            </div>
          )}
          {supplier.phone && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone</span>
              <span>{supplier.phone}</span>
            </div>
          )}
          {supplier.address && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Address</span>
              <span className="text-right max-w-[60%]">{supplier.address}</span>
            </div>
          )}
          {supplier.website && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Website</span>
              <span>{supplier.website}</span>
            </div>
          )}
          {supplier.paymentTerms && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment Terms</span>
              <span>{supplier.paymentTerms}</span>
            </div>
          )}
          {supplier.leadTimeDays != null && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lead Time</span>
              <span>{supplier.leadTimeDays} days</span>
            </div>
          )}
          {supplier.minimumOrderValue != null && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Minimum Order</span>
              <span>${formatNumber(supplier.minimumOrderValue, 2)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      {supplier.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{supplier.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Linked Inventory Items */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Inventory Items ({supplier.items.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {supplier.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No inventory items linked to this supplier.
            </p>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="sm:hidden space-y-2">
                {supplier.items.map((item) => (
                  <Link
                    key={item.id}
                    to={`/inventory/${item.id}`}
                    className="block rounded-md border p-3 hover:border-primary/50 transition-colors min-h-[44px]"
                  >
                    <div className="font-medium text-sm">{item.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {item.category} &middot; {item.unit}
                    </div>
                  </Link>
                ))}
              </div>
              {/* Desktop table */}
              <div className="hidden sm:block -mx-6 -mb-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Unit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplier.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Link
                            to={`/inventory/${item.id}`}
                            className="text-primary hover:underline"
                          >
                            {item.name}
                          </Link>
                        </TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Recent Purchase Orders */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Purchase Orders ({purchaseOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {purchaseOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No purchase orders for this supplier yet.
            </p>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="sm:hidden space-y-2">
                {purchaseOrders.map((po) => (
                  <Link
                    key={po.id}
                    to={`/purchasing/${po.id}`}
                    className="block rounded-md border p-3 hover:border-primary/50 transition-colors min-h-[44px]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-medium text-sm">
                        {po.poNumber}
                      </span>
                      <StatusBadge status={po.status} />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {po.orderDate ? formatDate(po.orderDate) : "No date"}{" "}
                      &middot; ${formatNumber(po.total, 2)}
                    </div>
                  </Link>
                ))}
              </div>
              {/* Desktop table */}
              <div className="hidden sm:block -mx-6 -mb-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO Number</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Order Date</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseOrders.map((po) => (
                      <TableRow key={po.id}>
                        <TableCell>
                          <Link
                            to={`/purchasing/${po.id}`}
                            className="font-mono text-primary hover:underline"
                          >
                            {po.poNumber}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={po.status} />
                        </TableCell>
                        <TableCell>
                          {po.orderDate ? formatDate(po.orderDate) : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          ${formatNumber(po.total, 2)}
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
    </div>
  );
}
