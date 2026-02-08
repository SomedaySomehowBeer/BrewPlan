import { Form, useActionData, redirect } from "react-router";
import type { Route } from "./+types/customers.new";
import { requireUser } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { createCustomerSchema } from "@brewplan/shared";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

const customerTypeOptions = [
  { value: "venue", label: "Venue" },
  { value: "bottle_shop", label: "Bottle Shop" },
  { value: "distributor", label: "Distributor" },
  { value: "taproom", label: "Taproom" },
  { value: "market", label: "Market" },
  { value: "other", label: "Other" },
];

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  return {};
}

export async function action({ request }: Route.ActionArgs) {
  await requireUser(request);

  const formData = await request.formData();
  const raw = {
    name: formData.get("name"),
    customerType: formData.get("customerType"),
    contactName: formData.get("contactName") || null,
    email: formData.get("email") || null,
    phone: formData.get("phone") || null,
    addressLine1: formData.get("addressLine1") || null,
    addressLine2: formData.get("addressLine2") || null,
    city: formData.get("city") || null,
    state: formData.get("state") || null,
    postcode: formData.get("postcode") || null,
    country: formData.get("country") || "Australia",
    deliveryInstructions: formData.get("deliveryInstructions") || null,
    paymentTerms: formData.get("paymentTerms") || null,
    notes: formData.get("notes") || null,
  };

  const result = createCustomerSchema.safeParse(raw);
  if (!result.success) {
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0];
      if (key) errors[String(key)] = issue.message;
    }
    return { errors, values: raw };
  }

  const customer = queries.customers.create(result.data);
  return redirect(`/customers/${customer.id}`);
}

export default function NewCustomer() {
  const actionData = useActionData<typeof action>();
  const errors = actionData?.errors;
  const values = actionData?.values;

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Customer</CardTitle>
      </CardHeader>
      <CardContent>
        <Form method="post" className="space-y-6">
          {errors && Object.keys(errors).length > 0 && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              Please fix the errors below.
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Basic Information
            </h3>
            <div className="space-y-2">
              <Label htmlFor="name">Customer Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={(values?.name as string) ?? ""}
                required
              />
              {errors?.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerType">Type</Label>
              <select
                id="customerType"
                name="customerType"
                defaultValue={(values?.customerType as string) ?? ""}
                required
                className="flex h-11 w-full items-center rounded-md border border-input bg-card px-3 py-2 text-base ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="" disabled>
                  Select a type...
                </option>
                {customerTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {errors?.customerType && (
                <p className="text-sm text-destructive">{errors.customerType}</p>
              )}
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Contact
            </h3>
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
                  <p className="text-sm text-destructive">{errors.email}</p>
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
          </div>

          {/* Address */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Address
            </h3>
            <div className="space-y-2">
              <Label htmlFor="addressLine1">Address Line 1</Label>
              <Input
                id="addressLine1"
                name="addressLine1"
                defaultValue={(values?.addressLine1 as string) ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addressLine2">Address Line 2</Label>
              <Input
                id="addressLine2"
                name="addressLine2"
                defaultValue={(values?.addressLine2 as string) ?? ""}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  name="city"
                  defaultValue={(values?.city as string) ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  name="state"
                  defaultValue={(values?.state as string) ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postcode">Postcode</Label>
                <Input
                  id="postcode"
                  name="postcode"
                  defaultValue={(values?.postcode as string) ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  name="country"
                  defaultValue={(values?.country as string) ?? "Australia"}
                />
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Additional Details
            </h3>
            <div className="space-y-2">
              <Label htmlFor="deliveryInstructions">Delivery Instructions</Label>
              <Textarea
                id="deliveryInstructions"
                name="deliveryInstructions"
                defaultValue={(values?.deliveryInstructions as string) ?? ""}
                rows={2}
              />
            </div>
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
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                defaultValue={(values?.notes as string) ?? ""}
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit">Create Customer</Button>
            <Button variant="outline" type="button" asChild>
              <a href="/customers">Cancel</a>
            </Button>
          </div>
        </Form>
      </CardContent>
    </Card>
  );
}
