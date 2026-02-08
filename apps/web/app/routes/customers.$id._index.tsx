import { useLoaderData, Link } from "react-router";
import type { Route } from "./+types/customers.$id._index";
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

  const customer = queries.customers.get(params.id);
  if (!customer) {
    throw new Response("Customer not found", { status: 404 });
  }

  const orders = queries.orders.list({ customerId: params.id });

  return { customer, orders };
}

export default function CustomerDetail() {
  const { customer, orders } = useLoaderData<typeof loader>();

  return (
    <div className="space-y-6">
      {/* Customer Info */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Contact Name</span>
              <span>{customer.contactName ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span>{customer.email ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone</span>
              <span>{customer.phone ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment Terms</span>
              <span>{customer.paymentTerms ?? "—"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {customer.addressLine1 || customer.city ? (
              <>
                {customer.addressLine1 && <p>{customer.addressLine1}</p>}
                {customer.addressLine2 && <p>{customer.addressLine2}</p>}
                <p>
                  {[customer.city, customer.state, customer.postcode]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                <p>{customer.country}</p>
              </>
            ) : (
              <p className="text-muted-foreground">No address on file</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delivery Instructions */}
      {customer.deliveryInstructions && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Delivery Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">
              {customer.deliveryInstructions}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {customer.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{customer.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Recent Orders */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Orders</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {orders.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground px-4">
              No orders yet.
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="sm:hidden divide-y">
                {orders.map((order) => (
                  <Link
                    key={order.id}
                    to={`/orders/${order.id}`}
                    className="block p-4 hover:bg-muted/50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium text-sm">
                            {order.orderNumber}
                          </span>
                          <StatusBadge status={order.status} />
                        </div>
                        {order.deliveryDate && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Delivery: {formatDate(order.deliveryDate)}
                          </p>
                        )}
                      </div>
                      <span className="text-sm font-medium">
                        ${formatNumber(order.total, 2)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
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
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
