import {
  Form,
  useLoaderData,
  useActionData,
  useNavigation,
} from "react-router";
import type { Route } from "./+types/recipes.$id.ingredients";
import { requireUser } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { recipeIngredientSchema } from "@brewplan/shared";
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
import { UnitDisplay } from "~/components/shared/unit-display";
import { Badge } from "~/components/ui/badge";
import { Trash2, Plus } from "lucide-react";

const usageStageLabels: Record<string, string> = {
  mash: "Mash",
  boil: "Boil",
  whirlpool: "Whirlpool",
  ferment: "Ferment",
  dry_hop: "Dry Hop",
  package: "Package",
  other: "Other",
};

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireUser(request);

  const recipe = queries.recipes.getWithIngredients(params.id);
  if (!recipe) {
    throw new Response("Recipe not found", { status: 404 });
  }

  const inventoryItems = queries.inventory.list({ archived: false });

  return { recipe, inventoryItems };
}

export async function action({ request, params }: Route.ActionArgs) {
  await requireUser(request);

  const formData = await request.formData();
  const intent = String(formData.get("intent"));

  if (intent === "add") {
    const raw = Object.fromEntries(formData);
    // Remove intent from data
    const { intent: _, ...data } = raw;

    // Convert empty strings to null
    const cleaned = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        value === "" ? null : value,
      ])
    );

    const result = recipeIngredientSchema.safeParse(cleaned);
    if (!result.success) {
      return { errors: result.error.flatten().fieldErrors, intent: "add" };
    }

    queries.recipes.addIngredient(params.id, result.data);
    return { ok: true, intent: "add" };
  }

  if (intent === "remove") {
    const ingredientId = String(formData.get("ingredientId"));
    if (ingredientId) {
      queries.recipes.removeIngredient(ingredientId);
    }
    return { ok: true, intent: "remove" };
  }

  return { ok: false };
}

export default function RecipeIngredients() {
  const { recipe, inventoryItems } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const errors = actionData?.intent === "add" ? actionData?.errors : undefined;

  return (
    <div className="space-y-6">
      {/* Current Ingredients */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Ingredients ({recipe.ingredients.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recipe.ingredients.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No ingredients added yet. Use the form below to add ingredients.
            </p>
          ) : (
            <div className="space-y-2">
              {recipe.ingredients.map((ing) => (
                <div
                  key={ing.id}
                  className="flex items-center justify-between rounded-md border p-3 min-h-[44px]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {ing.inventoryItemName}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {usageStageLabels[ing.usageStage] ?? ing.usageStage}
                      </Badge>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <UnitDisplay value={ing.quantity} unit={ing.unit} />
                      {ing.useTimeMinutes != null && (
                        <span>@ {ing.useTimeMinutes} min</span>
                      )}
                      {ing.notes && <span>&middot; {ing.notes}</span>}
                    </div>
                  </div>
                  <Form method="post">
                    <input type="hidden" name="intent" value="remove" />
                    <input
                      type="hidden"
                      name="ingredientId"
                      value={ing.id}
                    />
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

      {/* Add Ingredient Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Ingredient</CardTitle>
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
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  step="0.01"
                  required
                />
                {errors?.quantity && (
                  <p className="text-sm text-destructive">
                    {errors.quantity[0]}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Select name="unit" defaultValue="g">
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="usageStage">Usage Stage</Label>
                <Select name="usageStage" defaultValue="boil">
                  <SelectTrigger id="usageStage">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mash">Mash</SelectItem>
                    <SelectItem value="boil">Boil</SelectItem>
                    <SelectItem value="whirlpool">Whirlpool</SelectItem>
                    <SelectItem value="ferment">Ferment</SelectItem>
                    <SelectItem value="dry_hop">Dry Hop</SelectItem>
                    <SelectItem value="package">Package</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {errors?.usageStage && (
                  <p className="text-sm text-destructive">
                    {errors.usageStage[0]}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="useTimeMinutes">Use Time (min)</Label>
                <Input
                  id="useTimeMinutes"
                  name="useTimeMinutes"
                  type="number"
                  placeholder="e.g. 60"
                />
                {errors?.useTimeMinutes && (
                  <p className="text-sm text-destructive">
                    {errors.useTimeMinutes[0]}
                  </p>
                )}
              </div>
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
              Add Ingredient
            </Button>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
