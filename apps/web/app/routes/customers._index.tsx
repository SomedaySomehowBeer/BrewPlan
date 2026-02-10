import { useLoaderData, Link } from "react-router";
import type { Route } from "./+types/customers._index";
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
import { Plus } from "lucide-react";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);

  const customers = queries.customers.list();

  return { customers, userRole: user.role };
}

export default function CustomersIndex() {
  const { customers, userRole } = useLoaderData<typeof loader>();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        {userRole !== "viewer" && (
          <Button asChild>
            <Link to="/customers/new">
              <Plus className="mr-2 h-4 w-4" />
              New Customer
            </Link>
          </Button>
        )}
      </div>

      {customers.length === 0 ? (
        <EmptyState
          title="No customers yet"
          description="Add your first customer to start tracking orders."
          actionLabel="New Customer"
          actionTo="/customers/new"
        />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-3 sm:hidden">
            {customers.map((customer) => (
              <Link
                key={customer.id}
                to={`/customers/${customer.id}`}
                className="block"
              >
                <Card className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{customer.name}</span>
                          <StatusBadge status={customer.customerType} />
                        </div>
                        {customer.contactName && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {customer.contactName}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {customer.email && <span>{customer.email}</span>}
                          {customer.phone && <span>{customer.phone}</span>}
                        </div>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        {customer.orderCount} order{customer.orderCount !== 1 ? "s" : ""}
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
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <Link
                            to={`/customers/${customer.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {customer.name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={customer.customerType} />
                        </TableCell>
                        <TableCell className="text-sm">
                          {customer.contactName ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {customer.email ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {customer.phone ?? "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {customer.orderCount}
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
