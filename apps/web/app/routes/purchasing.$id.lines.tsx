import {
  Form,
  useLoaderData,
  useActionData,
  useNavigation,
  redirect,
} from "react-router";
import type { Route } from "./+types/purchasing.$id.lines";
import { requireUser, requireMutationAccess } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { purchaseOrderLineSchema } from "@brewplan/shared";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "~/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { formatNumber } from "~/lib/utils";
import { Trash2, Plus } from "lucide-react";

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireUser(request);

  const po = queries.purchasing.getWithLines(params.id);
  if (!po) {
    throw new Response("Purchase order not found", { status: 404 });
  }

  if (po.status !== "draft") {
    return redirect(`/purchasing/${params.id}`);
  }

  const inventoryItems = queries.inventory.list();

  return { po, inventoryItems };
}

export async function action({ request, params }: Route.ActionArgs) {
  await requireMutationAccess(request);

  const formData = await request.formData();
  const intent = String(formData.get("intent"));

  if (intent === "add") {
    const raw = Object.fromEntries(formData);
    const { intent: _, ...data } = raw;

    const cleaned = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        value === "" ? null : value,
      ])
    );

    const result = purchaseOrderLineSchema.safeParse(cleaned);
    if (!result.success) {
      return { errors: result.error.flatten().fieldErrors, intent: "add" };
    }

    queries.purchasing.addLine(params.id, result.data);
    return { ok: true, intent: "add" };
  }

  if (intent === "remove") {
    const lineId = String(formData.get("lineId"));
    if (lineId) {
      queries.purchasing.removeLine(lineId);
    }
    return { ok: true, intent: "remove" };
  }

  return { ok: false };
}

export default function PurchaseOrderLines() {
  const { po, inventoryItems } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const errors = actionData?.intent === "add" ? actionData?.errors : undefined;

  return (
    <div className="space-y-6">
      {/* Current Lines */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Order Lines ({po.lines.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {po.lines.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No lines added yet. Use the form below to add items.
            </p>
          ) : (
            <div className="space-y-2">
              {po.lines.map((line) => (
                <div
                  key={line.id}
                  className="flex items-center justify-between rounded-md border p-3 min-h-[44px]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">
                      {line.inventoryItemName}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        {line.quantityOrdered} {line.unit}
                      </span>
                      <span>
                        @ ${formatNumber(line.unitCost, 2)}/{line.unit}
                      </span>
                      <span className="font-medium">
                        = ${formatNumber(line.lineTotal, 2)}
                      </span>
                    </div>
                  </div>
                  <Form method="post">
                    <input type="hidden" name="intent" value="remove" />
                    <input type="hidden" name="lineId" value={line.id} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      disabled={isSubmitting}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </Form>
                </div>
              ))}
            </div>
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
            <input type="hidden" name="intent" value="add" />

            <div className="space-y-2">
              <Label htmlFor="inventoryItemId">Inventory Item</Label>
              <Select name="inventoryItemId">
                <SelectTrigger id="inventoryItemId">
                  <SelectValue placeholder="Select an item" />
                </SelectTrigger>
                <SelectContent>
                  {inventoryItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} ({item.category})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors?.inventoryItemId && (
                <p className="text-sm text-destructive">
                  {errors.inventoryItemId[0]}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantityOrdered">Quantity</Label>
                <Input
                  id="quantityOrdered"
                  name="quantityOrdered"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                />
                {errors?.quantityOrdered && (
                  <p className="text-sm text-destructive">
                    {errors.quantityOrdered[0]}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Select name="unit" defaultValue="kg">
                  <SelectTrigger id="unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="g">g</SelectItem>
                    <SelectItem value="ml">ml</SelectItem>
                    <SelectItem value="l">L</SelectItem>
                    <SelectItem value="each">each</SelectItem>
                  </SelectContent>
                </Select>
                {errors?.unit && (
                  <p className="text-sm text-destructive">{errors.unit[0]}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="unitCost">Unit Cost ($)</Label>
              <Input
                id="unitCost"
                name="unitCost"
                type="number"
                step="0.01"
                min="0"
                required
              />
              {errors?.unitCost && (
                <p className="text-sm text-destructive">
                  {errors.unitCost[0]}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Optional notes"
              />
              {errors?.notes && (
                <p className="text-sm text-destructive">{errors.notes[0]}</p>
              )}
            </div>

            <Button type="submit" disabled={isSubmitting}>
              <Plus className="mr-2 h-4 w-4" />
              Add Line
            </Button>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
