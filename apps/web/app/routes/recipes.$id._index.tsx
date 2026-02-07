import { useLoaderData } from "react-router";
import type { Route } from "./+types/recipes.$id._index";
import { requireUser } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { UnitDisplay } from "~/components/shared/unit-display";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { UsageStage } from "@brewplan/shared";

const usageStageLabels: Record<string, string> = {
  mash: "Mash",
  boil: "Boil",
  whirlpool: "Whirlpool",
  ferment: "Ferment",
  dry_hop: "Dry Hop",
  package: "Package",
  other: "Other",
};

const usageStageOrder: Record<string, number> = {
  mash: 0,
  boil: 1,
  whirlpool: 2,
  ferment: 3,
  dry_hop: 4,
  package: 5,
  other: 6,
};

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireUser(request);

  const recipe = queries.recipes.getWithIngredients(params.id);
  if (!recipe) {
    throw new Response("Recipe not found", { status: 404 });
  }

  // Get inventory items to calculate estimated cost
  const ingredientCosts = recipe.ingredients.map((ing) => {
    const item = queries.inventory.get(ing.inventoryItemId);
    return {
      ...ing,
      unitCost: item?.unitCost ?? 0,
      itemUnit: item?.unit ?? ing.unit,
    };
  });

  const estimatedCost = ingredientCosts.reduce((sum, ing) => {
    return sum + ing.quantity * ing.unitCost;
  }, 0);

  // Group ingredients by usage stage
  const groupedIngredients: Record<
    string,
    typeof ingredientCosts
  > = {};
  for (const ing of ingredientCosts) {
    const stage = ing.usageStage;
    if (!groupedIngredients[stage]) {
      groupedIngredients[stage] = [];
    }
    groupedIngredients[stage].push(ing);
  }

  // Sort the stage keys
  const sortedStages = Object.keys(groupedIngredients).sort(
    (a, b) => (usageStageOrder[a] ?? 99) - (usageStageOrder[b] ?? 99)
  );

  return { recipe, groupedIngredients, sortedStages, estimatedCost };
}

export default function RecipeDetail() {
  const { recipe, groupedIngredients, sortedStages, estimatedCost } =
    useLoaderData<typeof loader>();

  return (
    <div className="space-y-6">
      {/* Description */}
      {recipe.description && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              {recipe.description}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Targets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Targets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <div>
              <p className="text-xs text-muted-foreground uppercase">OG</p>
              <p className="text-lg font-semibold">
                {recipe.targetOg ? recipe.targetOg.toFixed(3) : "--"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">FG</p>
              <p className="text-lg font-semibold">
                {recipe.targetFg ? recipe.targetFg.toFixed(3) : "--"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">ABV</p>
              <p className="text-lg font-semibold">
                {recipe.targetAbv != null ? `${recipe.targetAbv}%` : "--"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">IBU</p>
              <p className="text-lg font-semibold">
                {recipe.targetIbu ?? "--"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">SRM</p>
              <p className="text-lg font-semibold">
                {recipe.targetSrm ?? "--"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">
                Batch Size
              </p>
              <p className="text-lg font-semibold">
                <UnitDisplay
                  value={recipe.batchSizeLitres}
                  unit="L"
                  decimals={0}
                />
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time Estimates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Time Estimates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase">
                Brew Days
              </p>
              <p className="text-lg font-semibold">
                {recipe.estimatedBrewDays}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">
                Fermentation
              </p>
              <p className="text-lg font-semibold">
                {recipe.estimatedFermentationDays} days
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">
                Conditioning
              </p>
              <p className="text-lg font-semibold">
                {recipe.estimatedConditioningDays} days
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Total</p>
              <p className="text-lg font-semibold">
                {recipe.estimatedTotalDays} days
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Brew Parameters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Brew Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase">
                Boil Duration
              </p>
              <p className="text-lg font-semibold">
                {recipe.boilDurationMinutes} min
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">
                Mash Temp
              </p>
              <p className="text-lg font-semibold">
                {recipe.mashTempCelsius != null
                  ? `${recipe.mashTempCelsius} °C`
                  : "--"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ingredients by Stage */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Ingredients</CardTitle>
            <p className="text-sm font-medium">
              Est. Cost: ${estimatedCost.toFixed(2)}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {sortedStages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No ingredients added yet.
            </p>
          ) : (
            <div className="space-y-4">
              {sortedStages.map((stage) => (
                <div key={stage}>
                  <h4 className="mb-2 text-sm font-medium">
                    <Badge variant="outline">
                      {usageStageLabels[stage] ?? stage}
                    </Badge>
                  </h4>
                  {/* Mobile: cards */}
                  <div className="space-y-2 sm:hidden">
                    {groupedIngredients[stage].map((ing) => (
                      <div
                        key={ing.id}
                        className="flex items-center justify-between rounded-md border p-3"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {ing.inventoryItemName}
                          </p>
                          {ing.useTimeMinutes != null && (
                            <p className="text-xs text-muted-foreground">
                              @ {ing.useTimeMinutes} min
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm">
                            <UnitDisplay
                              value={ing.quantity}
                              unit={ing.unit}
                            />
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ${(ing.quantity * ing.unitCost).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Desktop: table */}
                  <div className="hidden sm:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ingredient</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Time</TableHead>
                          <TableHead className="text-right">Cost</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {groupedIngredients[stage].map((ing) => (
                          <TableRow key={ing.id}>
                            <TableCell>{ing.inventoryItemName}</TableCell>
                            <TableCell className="text-right">
                              <UnitDisplay
                                value={ing.quantity}
                                unit={ing.unit}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              {ing.useTimeMinutes != null
                                ? `${ing.useTimeMinutes} min`
                                : "--"}
                            </TableCell>
                            <TableCell className="text-right">
                              ${(ing.quantity * ing.unitCost).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
