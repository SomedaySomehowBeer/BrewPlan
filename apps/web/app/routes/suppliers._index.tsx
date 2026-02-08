import { useLoaderData, Link } from "react-router";
import type { Route } from "./+types/suppliers._index";
import { requireUser } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { EmptyState } from "~/components/shared/empty-state";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "~/components/ui/table";
import { Plus, Clock, Package } from "lucide-react";

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);

  const suppliers = queries.suppliers.list();

  return { suppliers };
}

export default function SuppliersIndex() {
  const { suppliers } = useLoaderData<typeof loader>();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button asChild>
          <Link to="/suppliers/new">
            <Plus className="mr-2 h-4 w-4" />
            New Supplier
          </Link>
        </Button>
      </div>

      {suppliers.length === 0 ? (
        <EmptyState
          title="No suppliers yet"
          description="Add your first supplier to start managing purchasing."
          actionLabel="New Supplier"
          actionTo="/suppliers/new"
        />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {suppliers.map((supplier) => (
              <Link
                key={supplier.id}
                to={`/suppliers/${supplier.id}`}
                className="block"
              >
                <Card className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{supplier.name}</p>
                        {supplier.contactName && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {supplier.contactName}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {supplier.leadTimeDays != null && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {supplier.leadTimeDays} days lead
                            </span>
                          )}
                          {supplier.itemCount > 0 && (
                            <span className="flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              {supplier.itemCount} items
                            </span>
                          )}
                        </div>
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
                      <TableHead>Contact</TableHead>
                      <TableHead>Lead Time</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Payment Terms</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliers.map((supplier) => (
                      <TableRow key={supplier.id}>
                        <TableCell>
                          <Link
                            to={`/suppliers/${supplier.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {supplier.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {supplier.contactName ?? "—"}
                        </TableCell>
                        <TableCell>
                          {supplier.leadTimeDays != null
                            ? `${supplier.leadTimeDays} days`
                            : "—"}
                        </TableCell>
                        <TableCell>{supplier.itemCount}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {supplier.paymentTerms ?? "—"}
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
