import { Form, useLoaderData, useActionData, redirect, Link } from "react-router";
import type { Route } from "./+types/suppliers.$id.edit";
import { requireUser } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { updateSupplierSchema } from "@brewplan/shared";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireUser(request);

  const supplier = queries.suppliers.get(params.id);
  if (!supplier) {
    throw new Response("Supplier not found", { status: 404 });
  }

  return { supplier };
}

export async function action({ request, params }: Route.ActionArgs) {
  await requireUser(request);

  const formData = await request.formData();
  const raw = Object.fromEntries(formData);

  const cleaned = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [
      key,
      value === "" ? null : value,
    ])
  );

  const result = updateSupplierSchema.safeParse(cleaned);
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors };
  }

  queries.suppliers.update(params.id, result.data);
  return redirect(`/suppliers/${params.id}`);
}

export default function EditSupplier() {
  const { supplier } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const errors = actionData?.errors;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Supplier</CardTitle>
      </CardHeader>
      <CardContent>
        <Form method="post" className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Basic Information
            </h3>
            <div className="space-y-2">
              <Label htmlFor="name">Supplier Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={supplier.name}
                required
              />
              {errors?.name && (
                <p className="text-sm text-destructive">{errors.name[0]}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactName">Contact Name</Label>
              <Input
                id="contactName"
                name="contactName"
                defaultValue={supplier.contactName ?? ""}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={supplier.email ?? ""}
                />
                {errors?.email && (
                  <p className="text-sm text-destructive">{errors.email[0]}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  defaultValue={supplier.phone ?? ""}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                name="address"
                rows={2}
                defaultValue={supplier.address ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                name="website"
                defaultValue={supplier.website ?? ""}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Terms
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paymentTerms">Payment Terms</Label>
                <Input
                  id="paymentTerms"
                  name="paymentTerms"
                  defaultValue={supplier.paymentTerms ?? ""}
                  placeholder="e.g. Net 30"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="leadTimeDays">Lead Time (days)</Label>
                <Input
                  id="leadTimeDays"
                  name="leadTimeDays"
                  type="number"
                  min="0"
                  defaultValue={supplier.leadTimeDays ?? ""}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="minimumOrderValue">Minimum Order Value ($)</Label>
              <Input
                id="minimumOrderValue"
                name="minimumOrderValue"
                type="number"
                step="0.01"
                min="0"
                defaultValue={supplier.minimumOrderValue ?? ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={supplier.notes ?? ""}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit">Save Changes</Button>
            <Button variant="outline" asChild>
              <Link to={`/suppliers/${supplier.id}`}>Cancel</Link>
            </Button>
          </div>
        </Form>
      </CardContent>
    </Card>
  );
}
