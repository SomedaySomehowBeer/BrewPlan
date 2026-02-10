import { Form, useLoaderData, useActionData, redirect } from "react-router";
import type { Route } from "./+types/orders.new";
import { requireUser, requireMutationAccess } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { createOrderSchema } from "@brewplan/shared";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

const channelOptions = [
  { value: "wholesale", label: "Wholesale" },
  { value: "taproom", label: "Taproom" },
  { value: "online", label: "Online" },
  { value: "market", label: "Market" },
  { value: "other", label: "Other" },
];

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);

  const customers = queries.customers.list({ archived: false });
  return { customers };
}

export async function action({ request }: Route.ActionArgs) {
  await requireMutationAccess(request);

  const formData = await request.formData();
  const raw = {
    customerId: formData.get("customerId"),
    deliveryDate: formData.get("deliveryDate") || null,
    deliveryAddress: formData.get("deliveryAddress") || null,
    channel: formData.get("channel") || "wholesale",
    notes: formData.get("notes") || null,
  };

  const result = createOrderSchema.safeParse(raw);
  if (!result.success) {
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0];
      if (key) errors[String(key)] = issue.message;
    }
    return { errors, values: raw };
  }

  const order = queries.orders.create(result.data);
  return redirect(`/orders/${order.id}`);
}

export default function NewOrder() {
  const { customers } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const errors = actionData?.errors;
  const values = actionData?.values;

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Order</CardTitle>
      </CardHeader>
      <CardContent>
        <Form method="post" className="space-y-4">
          {errors && Object.keys(errors).length > 0 && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              Please fix the errors below.
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="customerId">Customer</Label>
            <select
              id="customerId"
              name="customerId"
              defaultValue={(values?.customerId as string) ?? ""}
              required
              className="flex h-11 w-full items-center rounded-md border border-input bg-card px-3 py-2 text-base ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="" disabled>
                Select a customer...
              </option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
            {errors?.customerId && (
              <p className="text-sm text-destructive">{errors.customerId}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="deliveryDate">Delivery Date</Label>
            <Input
              id="deliveryDate"
              name="deliveryDate"
              type="date"
              defaultValue={(values?.deliveryDate as string) ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deliveryAddress">Delivery Address</Label>
            <Textarea
              id="deliveryAddress"
              name="deliveryAddress"
              defaultValue={(values?.deliveryAddress as string) ?? ""}
              rows={2}
              placeholder="Leave blank to use customer's default address"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="channel">Channel</Label>
            <select
              id="channel"
              name="channel"
              defaultValue={(values?.channel as string) ?? "wholesale"}
              className="flex h-11 w-full items-center rounded-md border border-input bg-card px-3 py-2 text-base ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {channelOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
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

          <div className="flex gap-3 pt-2">
            <Button type="submit">Create Order</Button>
            <Button variant="outline" type="button" asChild>
              <a href="/orders">Cancel</a>
            </Button>
          </div>
        </Form>
      </CardContent>
    </Card>
  );
}
