import { Form, useActionData, redirect, Link } from "react-router";
import type { Route } from "./+types/inventory.new";
import { requireUser } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { createInventoryItemSchema } from "@brewplan/shared";
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
import { ArrowLeft } from "lucide-react";

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  return {};
}

export async function action({ request }: Route.ActionArgs) {
  await requireUser(request);

  const formData = await request.formData();
  const raw = Object.fromEntries(formData);

  // Convert empty strings to null for optional fields
  const cleaned = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [
      key,
      value === "" ? null : value,
    ])
  );

  // Handle checkbox: isGlutenFree
  cleaned.isGlutenFree = formData.has("isGlutenFree") ? "true" : "false";

  const result = createInventoryItemSchema.safeParse(cleaned);
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors, values: cleaned };
  }

  const item = queries.inventory.create(result.data);
  return redirect(`/inventory/${item.id}`);
}

export default function NewInventoryItem() {
  const actionData = useActionData<typeof action>();
  const errors = actionData?.errors;
  const values = actionData?.values as Record<string, string | null> | undefined;

  return (
    <div className="space-y-4">
      <Button variant="ghost" asChild>
        <Link to="/inventory">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Inventory
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>New Inventory Item</CardTitle>
        </CardHeader>
        <CardContent>
          {errors && (
            <div className="mb-6 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              Please fix the errors below and try again.
            </div>
          )}
          <Form method="post" className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Basic Information
              </h3>
              <div className="space-y-2">
                <Label htmlFor="name">Item Name</Label>
                <Input id="name" name="name" required defaultValue={values?.name ?? ""} />
                {errors?.name && (
                  <p className="text-sm text-destructive">{errors.name[0]}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  name="sku"
                  placeholder="Optional SKU or product code"
                  defaultValue={values?.sku ?? ""}
                />
                {errors?.sku && (
                  <p className="text-sm text-destructive">{errors.sku[0]}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select name="category" defaultValue={values?.category ?? "grain"}>
                    <SelectTrigger id="category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grain">Grain</SelectItem>
                      <SelectItem value="hop">Hop</SelectItem>
                      <SelectItem value="yeast">Yeast</SelectItem>
                      <SelectItem value="adjunct">Adjunct</SelectItem>
                      <SelectItem value="water_chemistry">
                        Water Chemistry
                      </SelectItem>
                      <SelectItem value="packaging">Packaging</SelectItem>
                      <SelectItem value="cleaning">Cleaning</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors?.category && (
                    <p className="text-sm text-destructive">
                      {errors.category[0]}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subcategory">Subcategory</Label>
                  <Input
                    id="subcategory"
                    name="subcategory"
                    placeholder="e.g. Base Malt"
                    defaultValue={values?.subcategory ?? ""}
                  />
                  {errors?.subcategory && (
                    <p className="text-sm text-destructive">
                      {errors.subcategory[0]}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Units & Cost */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Units & Cost
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Select name="unit" defaultValue={values?.unit ?? "kg"}>
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
                <div className="space-y-2">
                  <Label htmlFor="unitCost">Unit Cost ($)</Label>
                  <Input
                    id="unitCost"
                    name="unitCost"
                    type="number"
                    step="0.01"
                    defaultValue={values?.unitCost ?? 0}
                  />
                  {errors?.unitCost && (
                    <p className="text-sm text-destructive">
                      {errors.unitCost[0]}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Reorder Settings */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Reorder Settings
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reorderPoint">Reorder Point</Label>
                  <Input
                    id="reorderPoint"
                    name="reorderPoint"
                    type="number"
                    step="0.1"
                    placeholder="Trigger reorder below"
                    defaultValue={values?.reorderPoint ?? ""}
                  />
                  {errors?.reorderPoint && (
                    <p className="text-sm text-destructive">
                      {errors.reorderPoint[0]}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reorderQty">Reorder Quantity</Label>
                  <Input
                    id="reorderQty"
                    name="reorderQty"
                    type="number"
                    step="0.1"
                    placeholder="Standard order size"
                    defaultValue={values?.reorderQty ?? ""}
                  />
                  {errors?.reorderQty && (
                    <p className="text-sm text-destructive">
                      {errors.reorderQty[0]}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Details
              </h3>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isGlutenFree"
                  name="isGlutenFree"
                  defaultChecked={values?.isGlutenFree !== "false"}
                  className="h-5 w-5 rounded border-input"
                />
                <Label htmlFor="isGlutenFree">Gluten Free</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="countryOfOrigin">Country of Origin</Label>
                <Input
                  id="countryOfOrigin"
                  name="countryOfOrigin"
                  placeholder="e.g. Australia"
                  defaultValue={values?.countryOfOrigin ?? ""}
                />
                {errors?.countryOfOrigin && (
                  <p className="text-sm text-destructive">
                    {errors.countryOfOrigin[0]}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" placeholder="Optional notes" defaultValue={values?.notes ?? ""} />
                {errors?.notes && (
                  <p className="text-sm text-destructive">{errors.notes[0]}</p>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit">Create Item</Button>
              <Button variant="outline" asChild>
                <Link to="/inventory">Cancel</Link>
              </Button>
            </div>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
