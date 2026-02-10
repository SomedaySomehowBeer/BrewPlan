import { Form, useActionData, redirect } from "react-router";
import type { Route } from "./+types/suppliers.new";
import { requireUser, requireMutationAccess } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { createSupplierSchema } from "@brewplan/shared";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Link } from "react-router";

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  return {};
}

export async function action({ request }: Route.ActionArgs) {
  await requireMutationAccess(request);

  const formData = await request.formData();
  const raw = Object.fromEntries(formData);

  const cleaned = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [
      key,
      value === "" ? null : value,
    ])
  );

  const result = createSupplierSchema.safeParse(cleaned);
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors, values: raw };
  }

  const supplier = queries.suppliers.create(result.data);
  return redirect(`/suppliers/${supplier.id}`);
}

export default function NewSupplier() {
  const actionData = useActionData<typeof action>();
  const errors = actionData?.errors;
  const values = actionData?.values;

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Supplier</CardTitle>
      </CardHeader>
      <CardContent>
        <Form method="post" className="space-y-6">
          {errors && Object.keys(errors).length > 0 && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              Please fix the errors below.
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Basic Information
            </h3>
            <div className="space-y-2">
              <Label htmlFor="name">Supplier Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={(values?.name as string) ?? ""}
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
                defaultValue={(values?.contactName as string) ?? ""}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={(values?.email as string) ?? ""}
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
                  defaultValue={(values?.phone as string) ?? ""}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                name="address"
                rows={2}
                defaultValue={(values?.address as string) ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                name="website"
                defaultValue={(values?.website as string) ?? ""}
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
                  defaultValue={(values?.paymentTerms as string) ?? ""}
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
                  defaultValue={(values?.leadTimeDays as string) ?? ""}
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
                defaultValue={(values?.minimumOrderValue as string) ?? ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={(values?.notes as string) ?? ""}
              placeholder="Any notes about this supplier..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit">Create Supplier</Button>
            <Button variant="outline" asChild>
              <Link to="/suppliers">Cancel</Link>
            </Button>
          </div>
        </Form>
      </CardContent>
    </Card>
  );
}
