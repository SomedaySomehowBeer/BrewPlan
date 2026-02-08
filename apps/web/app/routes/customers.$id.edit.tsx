import { Form, useLoaderData, useActionData, redirect, Link } from "react-router";
import type { Route } from "./+types/customers.$id.edit";
import { requireUser } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { updateCustomerSchema } from "@brewplan/shared";
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

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireUser(request);

  const customer = queries.customers.get(params.id);
  if (!customer) {
    throw new Response("Customer not found", { status: 404 });
  }

  return { customer };
}

export async function action({ request, params }: Route.ActionArgs) {
  await requireUser(request);

  const formData = await request.formData();
  const raw = Object.fromEntries(formData);

  // Convert empty strings to null for optional nullable fields
  const cleaned = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [
      key,
      value === "" ? null : value,
    ])
  );

  const result = updateCustomerSchema.safeParse(cleaned);
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors };
  }

  queries.customers.update(params.id, result.data);
  return redirect(`/customers/${params.id}`);
}

export default function EditCustomer() {
  const { customer } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const errors = actionData?.errors;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Customer</CardTitle>
      </CardHeader>
      <CardContent>
        <Form method="post" className="space-y-6">
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
                defaultValue={customer.name}
                required
              />
              {errors?.name && (
                <p className="text-sm text-destructive">{errors.name[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerType">Type</Label>
              <select
                id="customerType"
                name="customerType"
                defaultValue={customer.customerType}
                required
                className="flex h-11 w-full items-center rounded-md border border-input bg-card px-3 py-2 text-base ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {customerTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {errors?.customerType && (
                <p className="text-sm text-destructive">{errors.customerType[0]}</p>
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
                defaultValue={customer.contactName ?? ""}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={customer.email ?? ""}
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
                  defaultValue={customer.phone ?? ""}
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
                defaultValue={customer.addressLine1 ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addressLine2">Address Line 2</Label>
              <Input
                id="addressLine2"
                name="addressLine2"
                defaultValue={customer.addressLine2 ?? ""}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  name="city"
                  defaultValue={customer.city ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  name="state"
                  defaultValue={customer.state ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postcode">Postcode</Label>
                <Input
                  id="postcode"
                  name="postcode"
                  defaultValue={customer.postcode ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  name="country"
                  defaultValue={customer.country}
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
                defaultValue={customer.deliveryInstructions ?? ""}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentTerms">Payment Terms</Label>
              <Input
                id="paymentTerms"
                name="paymentTerms"
                defaultValue={customer.paymentTerms ?? ""}
                placeholder="e.g. Net 30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                defaultValue={customer.notes ?? ""}
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit">Save Changes</Button>
            <Button variant="outline" asChild>
              <Link to={`/customers/${customer.id}`}>Cancel</Link>
            </Button>
          </div>
        </Form>
      </CardContent>
    </Card>
  );
}
