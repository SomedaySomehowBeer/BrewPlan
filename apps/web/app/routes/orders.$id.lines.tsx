import { Form, useLoaderData, useActionData, redirect } from "react-router";
import type { Route } from "./+types/orders.$id.lines";
import { requireUser } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { orderLineSchema } from "@brewplan/shared";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "~/components/ui/table";
import { Trash2 } from "lucide-react";
import { formatNumber } from "~/lib/utils";

const formatOptions = [
  { value: "keg_50l", label: "Keg 50L" },
  { value: "keg_30l", label: "Keg 30L" },
  { value: "keg_20l", label: "Keg 20L" },
  { value: "can_375ml", label: "Can 375ml" },
  { value: "can_355ml", label: "Can 355ml" },
  { value: "bottle_330ml", label: "Bottle 330ml" },
  { value: "bottle_500ml", label: "Bottle 500ml" },
  { value: "other", label: "Other" },
];

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireUser(request);

  const order = queries.orders.getWithLines(params.id);
  if (!order) {
    throw new Response("Order not found", { status: 404 });
  }

  if (order.status !== "draft") {
    return redirect(`/orders/${params.id}`);
  }

  const recipes = queries.recipes.list();

  return { order, recipes };
}

export async function action({ request, params }: Route.ActionArgs) {
  await requireUser(request);

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "remove") {
    const lineId = formData.get("lineId");
    if (typeof lineId === "string") {
      queries.orders.removeLine(lineId);
    }
    return redirect(`/orders/${params.id}/lines`);
  }

  // Add line
  const raw = {
    recipeId: formData.get("recipeId"),
    format: formData.get("format"),
    quantity: formData.get("quantity"),
    unitPrice: formData.get("unitPrice"),
    notes: formData.get("notes") || null,
  };

  const result = orderLineSchema.safeParse(raw);
  if (!result.success) {
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0];
      if (key) errors[String(key)] = issue.message;
    }
    return { errors, values: raw };
  }

  queries.orders.addLine(params.id, result.data);
  return redirect(`/orders/${params.id}/lines`);
}

export default function OrderLines() {
  const { order, recipes } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const errors = actionData?.errors;
  const values = actionData?.values;

  return (
    <div className="space-y-6">
      {/* Current Lines */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Current Lines</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {order.lines.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground px-4">
              No lines added yet. Use the form below to add items.
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="sm:hidden divide-y">
                {order.lines.map((line) => (
                  <div key={line.id} className="p-4 flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="font-medium text-sm">
                        {line.recipeName ?? line.description}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatOptions.find((f) => f.value === line.format)?.label ?? line.format}
                      </div>
                      <div className="text-sm">
                        {line.quantity} x ${formatNumber(line.unitPrice, 2)} = ${formatNumber(line.lineTotal, 2)}
                      </div>
                    </div>
                    <Form method="post">
                      <input type="hidden" name="intent" value="remove" />
                      <input type="hidden" name="lineId" value={line.id} />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive min-h-[44px] min-w-[44px]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </Form>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Recipe</TableHead>
                      <TableHead>Format</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.lines.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell className="font-medium">
                          {line.recipeName ?? line.description}
                        </TableCell>
                        <TableCell>
                          {formatOptions.find((f) => f.value === line.format)?.label ?? line.format}
                        </TableCell>
                        <TableCell className="text-right">
                          {line.quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          ${formatNumber(line.unitPrice, 2)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${formatNumber(line.lineTotal, 2)}
                        </TableCell>
                        <TableCell>
                          <Form method="post">
                            <input type="hidden" name="intent" value="remove" />
                            <input type="hidden" name="lineId" value={line.id} />
                            <Button
                              type="submit"
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive min-h-[44px] min-w-[44px]"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </Form>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Add Line Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Line</CardTitle>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-4">
            {errors && Object.keys(errors).length > 0 && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                Please fix the errors below.
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="recipeId">Recipe</Label>
              <select
                id="recipeId"
                name="recipeId"
                defaultValue={(values?.recipeId as string) ?? ""}
                required
                className="flex h-11 w-full items-center rounded-md border border-input bg-card px-3 py-2 text-base ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="" disabled>
                  Select a recipe...
                </option>
                {recipes.map((recipe) => (
                  <option key={recipe.id} value={recipe.id}>
                    {recipe.name}
                  </option>
                ))}
              </select>
              {errors?.recipeId && (
                <p className="text-sm text-destructive">{errors.recipeId}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="format">Format</Label>
              <select
                id="format"
                name="format"
                defaultValue={(values?.format as string) ?? ""}
                required
                className="flex h-11 w-full items-center rounded-md border border-input bg-card px-3 py-2 text-base ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="" disabled>
                  Select format...
                </option>
                {formatOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {errors?.format && (
                <p className="text-sm text-destructive">{errors.format}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="1"
                  step="1"
                  required
                  defaultValue={(values?.quantity as string) ?? ""}
                  placeholder="e.g. 10"
                />
                {errors?.quantity && (
                  <p className="text-sm text-destructive">{errors.quantity}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="unitPrice">Unit Price ($)</Label>
                <Input
                  id="unitPrice"
                  name="unitPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  defaultValue={(values?.unitPrice as string) ?? ""}
                  placeholder="e.g. 12.50"
                />
                {errors?.unitPrice && (
                  <p className="text-sm text-destructive">{errors.unitPrice}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                defaultValue={(values?.notes as string) ?? ""}
                rows={2}
              />
            </div>

            <Button type="submit">Add Line</Button>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
