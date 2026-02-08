import { Form, useLoaderData, useActionData, redirect } from "react-router";
import type { Route } from "./+types/purchasing.new";
import { requireUser } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { createPurchaseOrderSchema } from "@brewplan/shared";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Link } from "react-router";

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);

  const suppliers = queries.suppliers.list({ archived: false });

  return { suppliers };
}

export async function action({ request }: Route.ActionArgs) {
  await requireUser(request);

  const formData = await request.formData();
  const raw = {
    supplierId: formData.get("supplierId"),
    expectedDeliveryDate: formData.get("expectedDeliveryDate") || null,
    notes: formData.get("notes") || null,
  };

  const result = createPurchaseOrderSchema.safeParse(raw);
  if (!result.success) {
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0];
      if (key) errors[String(key)] = issue.message;
    }
    return { errors, values: raw };
  }

  const po = queries.purchasing.create(result.data);
  return redirect(`/purchasing/${po.id}`);
}

export default function NewPurchaseOrder() {
  const { suppliers } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const errors = actionData?.errors;
  const values = actionData?.values;

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Purchase Order</CardTitle>
      </CardHeader>
      <CardContent>
        <Form method="post" className="space-y-4">
          {errors && Object.keys(errors).length > 0 && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              Please fix the errors below.
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="supplierId">Supplier</Label>
            <select
              id="supplierId"
              name="supplierId"
              defaultValue={(values?.supplierId as string) ?? ""}
              required
              className="flex h-11 w-full items-center rounded-md border border-input bg-card px-3 py-2 text-base ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="" disabled>
                Select a supplier...
              </option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
            {errors?.supplierId && (
              <p className="text-sm text-destructive">{errors.supplierId}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="expectedDeliveryDate">Expected Delivery Date</Label>
            <Input
              id="expectedDeliveryDate"
              name="expectedDeliveryDate"
              type="date"
              defaultValue={(values?.expectedDeliveryDate as string) ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={(values?.notes as string) ?? ""}
              placeholder="Any notes for this order..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit">Create Purchase Order</Button>
            <Button variant="outline" asChild>
              <Link to="/purchasing">Cancel</Link>
            </Button>
          </div>
        </Form>
      </CardContent>
    </Card>
  );
}
