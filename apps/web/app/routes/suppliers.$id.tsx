import { useLoaderData, Outlet, Link } from "react-router";
import type { Route } from "./+types/suppliers.$id";
import { requireUser } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { Button } from "~/components/ui/button";
import { ArrowLeft, Pencil } from "lucide-react";

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireUser(request);

  const supplier = queries.suppliers.get(params.id);
  if (!supplier) {
    throw new Response("Supplier not found", { status: 404 });
  }

  return { supplier };
}

export default function SupplierDetailLayout() {
  const { supplier } = useLoaderData<typeof loader>();

  return (
    <div className="space-y-6">
      <Link
        to="/suppliers"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground min-h-[44px]"
      >
        <ArrowLeft className="h-4 w-4" />
        All Suppliers
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">{supplier.name}</h2>
          {supplier.contactName && (
            <p className="text-sm text-muted-foreground">
              Contact: {supplier.contactName}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to={`/suppliers/${supplier.id}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
        </div>
      </div>

      <Outlet />
    </div>
  );
}
