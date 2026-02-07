import {
  Form,
  useLoaderData,
  useActionData,
  Link,
  redirect,
} from "react-router";
import type { Route } from "./+types/batches.$id.consumption";
import { requireUser } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { recordConsumptionSchema } from "@brewplan/shared";
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
import { UnitDisplay } from "~/components/shared/unit-display";
import { ArrowLeft, Plus } from "lucide-react";

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireUser(request);

  const batch = queries.batches.getWithDetails(params.id);
  if (!batch) {
    throw new Response("Batch not found", { status: 404 });
  }

  // Get all inventory items with their lots for the dropdown
  const inventoryItems = queries.inventory.list({ archived: false });
  const itemsWithLots = inventoryItems
    .map((item) => {
      const lots = queries.inventory.getLots(item.id).filter((l) => l.quantityOnHand > 0);
      return { ...item, lots };
    })
    .filter((item) => item.lots.length > 0);

  return { batch, itemsWithLots };
}

export async function action({ request, params }: Route.ActionArgs) {
  await requireUser(request);

  const formData = await request.formData();
  const raw = {
    recipeIngredientId: formData.get("recipeIngredientId") || null,
    inventoryLotId: formData.get("inventoryLotId"),
    plannedQuantity: formData.get("plannedQuantity"),
    actualQuantity: formData.get("actualQuantity"),
    unit: formData.get("unit"),
    usageStage: formData.get("usageStage"),
    notes: formData.get("notes") || null,
  };

  const result = recordConsumptionSchema.safeParse(raw);
  if (!result.success) {
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0];
      if (key) errors[String(key)] = issue.message;
    }
    return { errors, values: raw };
  }

  queries.batches.recordConsumption(params.id, result.data);
  return redirect(`/batches/${params.id}`);
}

export default function BatchConsumption() {
  const { batch, itemsWithLots } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const errors = actionData?.errors;
  const values = actionData?.values;

  const usageStages = [
    { value: "mash", label: "Mash" },
    { value: "boil", label: "Boil" },
    { value: "whirlpool", label: "Whirlpool" },
    { value: "ferment", label: "Ferment" },
    { value: "dry_hop", label: "Dry Hop" },
    { value: "package", label: "Package" },
    { value: "other", label: "Other" },
  ];

  const units = [
    { value: "kg", label: "kg" },
    { value: "g", label: "g" },
    { value: "ml", label: "mL" },
    { value: "l", label: "L" },
    { value: "each", label: "each" },
  ];

  return (
    <div className="space-y-6">
      <Link
        to={`/batches/${batch.id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground min-h-[44px]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Batch
      </Link>

      {/* Existing consumption records */}
      {batch.consumptions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recorded Consumption</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Mobile cards */}
            <div className="sm:hidden divide-y">
              {batch.consumptions.map((c) => (
                <div key={c.id} className="p-4 space-y-1">
                  <div className="font-medium text-sm">
                    {c.inventoryItemName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Lot: {c.lotNumber} | Stage: {c.usageStage}
                  </div>
                  <div className="text-sm">
                    Planned: <UnitDisplay value={c.plannedQuantity} unit={c.unit} /> |
                    Actual: <UnitDisplay value={c.actualQuantity} unit={c.unit} />
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop table */}
            <div className="hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ingredient</TableHead>
                    <TableHead>Lot</TableHead>
                    <TableHead>Planned</TableHead>
                    <TableHead>Actual</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batch.consumptions.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">
                        {c.inventoryItemName}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {c.lotNumber}
                      </TableCell>
                      <TableCell>
                        <UnitDisplay value={c.plannedQuantity} unit={c.unit} />
                      </TableCell>
                      <TableCell>
                        <UnitDisplay value={c.actualQuantity} unit={c.unit} />
                      </TableCell>
                      <TableCell>{c.usageStage}</TableCell>
                      <TableCell className="max-w-[150px] truncate text-xs">
                        {c.notes ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add consumption form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4" />
            Record Consumption
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-4">
            {errors && Object.keys(errors).length > 0 && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                Please fix the errors below.
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="inventoryLotId">Inventory Lot</Label>
              <select
                id="inventoryLotId"
                name="inventoryLotId"
                required
                defaultValue={(values?.inventoryLotId as string) ?? ""}
                className="flex h-11 w-full items-center rounded-md border border-input bg-card px-3 py-2 text-base ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="" disabled>
                  Select a lot...
                </option>
                {itemsWithLots.map((item) => (
                  <optgroup key={item.id} label={item.name}>
                    {item.lots.map((lot) => (
                      <option key={lot.id} value={lot.id}>
                        {lot.lotNumber} — {lot.quantityOnHand} {lot.unit}{" "}
                        available
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {errors?.inventoryLotId && (
                <p className="text-sm text-destructive">
                  {errors.inventoryLotId}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plannedQuantity">Planned Qty</Label>
                <Input
                  id="plannedQuantity"
                  name="plannedQuantity"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  defaultValue={(values?.plannedQuantity as string) ?? ""}
                />
                {errors?.plannedQuantity && (
                  <p className="text-sm text-destructive">
                    {errors.plannedQuantity}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="actualQuantity">Actual Qty</Label>
                <Input
                  id="actualQuantity"
                  name="actualQuantity"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  defaultValue={(values?.actualQuantity as string) ?? ""}
                />
                {errors?.actualQuantity && (
                  <p className="text-sm text-destructive">
                    {errors.actualQuantity}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <select
                  id="unit"
                  name="unit"
                  required
                  defaultValue={(values?.unit as string) ?? "kg"}
                  className="flex h-11 w-full items-center rounded-md border border-input bg-card px-3 py-2 text-base ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {units.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
                {errors?.unit && (
                  <p className="text-sm text-destructive">{errors.unit}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="usageStage">Usage Stage</Label>
                <select
                  id="usageStage"
                  name="usageStage"
                  required
                  defaultValue={(values?.usageStage as string) ?? "mash"}
                  className="flex h-11 w-full items-center rounded-md border border-input bg-card px-3 py-2 text-base ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {usageStages.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                {errors?.usageStage && (
                  <p className="text-sm text-destructive">
                    {errors.usageStage}
                  </p>
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
                placeholder="Optional notes..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit">Record Consumption</Button>
              <Button variant="outline" asChild>
                <Link to={`/batches/${batch.id}`}>Cancel</Link>
              </Button>
            </div>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
