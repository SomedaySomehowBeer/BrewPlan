import {
  Form,
  useLoaderData,
  useActionData,
  redirect,
  Link,
} from "react-router";
import type { Route } from "./+types/inventory.$id.edit";
import { requireUser, requireMutationAccess } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { updateInventoryItemSchema } from "@brewplan/shared";
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

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireUser(request);

  const item = queries.inventory.get(params.id);
  if (!item) {
    throw new Response("Inventory item not found", { status: 404 });
  }

  return { item };
}

export async function action({ request, params }: Route.ActionArgs) {
  await requireMutationAccess(request);

  const formData = await request.formData();
  const raw = Object.fromEntries(formData);

  // Convert empty strings to null
  const cleaned = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [
      key,
      value === "" ? null : value,
    ])
  );

  // Handle checkbox
  cleaned.isGlutenFree = formData.has("isGlutenFree") ? "true" : "false";

  const result = updateInventoryItemSchema.safeParse(cleaned);
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors };
  }

  queries.inventory.update(params.id, result.data);
  return redirect(`/inventory/${params.id}`);
}

export default function EditInventoryItem() {
  const { item } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const errors = actionData?.errors;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Inventory Item</CardTitle>
      </CardHeader>
      <CardContent>
        <Form method="post" className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Basic Information
            </h3>
            <div className="space-y-2">
              <Label htmlFor="name">Item Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={item.name}
                required
              />
              {errors?.name && (
                <p className="text-sm text-destructive">{errors.name[0]}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" name="sku" defaultValue={item.sku ?? ""} />
              {errors?.sku && (
                <p className="text-sm text-destructive">{errors.sku[0]}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select name="category" defaultValue={item.category}>
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
                  defaultValue={item.subcategory ?? ""}
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
                <Select name="unit" defaultValue={item.unit}>
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
                  defaultValue={item.unitCost}
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
                  defaultValue={item.reorderPoint ?? ""}
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
                  defaultValue={item.reorderQty ?? ""}
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
                defaultChecked={item.isGlutenFree}
                className="h-5 w-5 rounded border-input"
              />
              <Label htmlFor="isGlutenFree">Gluten Free</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="countryOfOrigin">Country of Origin</Label>
              <Input
                id="countryOfOrigin"
                name="countryOfOrigin"
                defaultValue={item.countryOfOrigin ?? ""}
              />
              {errors?.countryOfOrigin && (
                <p className="text-sm text-destructive">
                  {errors.countryOfOrigin[0]}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                defaultValue={item.notes ?? ""}
              />
              {errors?.notes && (
                <p className="text-sm text-destructive">{errors.notes[0]}</p>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit">Save Changes</Button>
            <Button variant="outline" asChild>
              <Link to={`/inventory/${item.id}`}>Cancel</Link>
            </Button>
          </div>
        </Form>
      </CardContent>
    </Card>
  );
}
