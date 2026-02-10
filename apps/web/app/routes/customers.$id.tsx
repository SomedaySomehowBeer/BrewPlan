import { Outlet, useLoaderData, Link } from "react-router";
import type { Route } from "./+types/customers.$id";
import { requireUser } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { StatusBadge } from "~/components/shared/status-badge";
import { Card, CardContent } from "~/components/ui/card";
import { ArrowLeft } from "lucide-react";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireUser(request);

  const customer = queries.customers.get(params.id);
  if (!customer) {
    throw new Response("Customer not found", { status: 404 });
  }

  return { customer, userRole: user.role };
}

export default function CustomerDetailLayout() {
  const { customer, userRole } = useLoaderData<typeof loader>();

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        to="/customers"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground min-h-[44px]"
      >
        <ArrowLeft className="h-4 w-4" />
        All Customers
      </Link>

      {/* Customer Header */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">{customer.name}</h2>
                <StatusBadge status={customer.customerType} />
              </div>
              {customer.contactName && (
                <p className="mt-1 text-muted-foreground">
                  {customer.contactName}
                </p>
              )}
            </div>
            {userRole !== "viewer" && (
              <Link
                to={`/customers/${customer.id}/edit`}
                className="text-sm text-primary hover:underline min-h-[44px] flex items-center"
              >
                Edit
              </Link>
            )}
          </div>
        </CardContent>
      </Card>

      <Outlet />
    </div>
  );
}
