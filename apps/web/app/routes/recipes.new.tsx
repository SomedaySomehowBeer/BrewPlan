import { Form, useActionData, redirect, Link } from "react-router";
import type { Route } from "./+types/recipes.new";
import { requireUser, requireMutationAccess } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { createRecipeSchema } from "@brewplan/shared";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { ArrowLeft } from "lucide-react";

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  return {};
}

export async function action({ request }: Route.ActionArgs) {
  await requireMutationAccess(request);

  const formData = await request.formData();
  const raw = Object.fromEntries(formData);

  // Convert empty strings to null for optional nullable fields
  const cleaned = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [
      key,
      value === "" ? null : value,
    ])
  );

  const result = createRecipeSchema.safeParse(cleaned);
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors, values: cleaned };
  }

  const recipe = queries.recipes.create(result.data);
  return redirect(`/recipes/${recipe.id}`);
}

export default function NewRecipe() {
  const actionData = useActionData<typeof action>();
  const errors = actionData?.errors;
  const values = actionData?.values as Record<string, string | null> | undefined;

  return (
    <div className="space-y-4">
      <Button variant="ghost" asChild>
        <Link to="/recipes">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Recipes
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>New Recipe</CardTitle>
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
                <Label htmlFor="name">Recipe Name</Label>
                <Input id="name" name="name" required defaultValue={values?.name ?? ""} />
                {errors?.name && (
                  <p className="text-sm text-destructive">{errors.name[0]}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="style">Style</Label>
                <Input id="style" name="style" required placeholder="e.g. Pale Ale, IPA, Stout" defaultValue={values?.style ?? ""} />
                {errors?.style && (
                  <p className="text-sm text-destructive">{errors.style[0]}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Optional recipe description"
                  defaultValue={values?.description ?? ""}
                />
                {errors?.description && (
                  <p className="text-sm text-destructive">{errors.description[0]}</p>
                )}
              </div>
            </div>

            {/* Brew Parameters */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Brew Parameters
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="batchSizeLitres">Batch Size (L)</Label>
                  <Input
                    id="batchSizeLitres"
                    name="batchSizeLitres"
                    type="number"
                    step="0.1"
                    required
                    defaultValue={values?.batchSizeLitres ?? ""}
                  />
                  {errors?.batchSizeLitres && (
                    <p className="text-sm text-destructive">
                      {errors.batchSizeLitres[0]}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="boilDurationMinutes">Boil Duration (min)</Label>
                  <Input
                    id="boilDurationMinutes"
                    name="boilDurationMinutes"
                    type="number"
                    defaultValue={values?.boilDurationMinutes ?? 60}
                  />
                  {errors?.boilDurationMinutes && (
                    <p className="text-sm text-destructive">
                      {errors.boilDurationMinutes[0]}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mashTempCelsius">Mash Temp (C)</Label>
                  <Input
                    id="mashTempCelsius"
                    name="mashTempCelsius"
                    type="number"
                    step="0.1"
                    placeholder="e.g. 65"
                    defaultValue={values?.mashTempCelsius ?? ""}
                  />
                  {errors?.mashTempCelsius && (
                    <p className="text-sm text-destructive">
                      {errors.mashTempCelsius[0]}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Targets */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Targets
              </h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="targetOg">OG</Label>
                  <Input
                    id="targetOg"
                    name="targetOg"
                    type="number"
                    step="0.001"
                    placeholder="e.g. 1.050"
                    defaultValue={values?.targetOg ?? ""}
                  />
                  {errors?.targetOg && (
                    <p className="text-sm text-destructive">{errors.targetOg[0]}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetFg">FG</Label>
                  <Input
                    id="targetFg"
                    name="targetFg"
                    type="number"
                    step="0.001"
                    placeholder="e.g. 1.010"
                    defaultValue={values?.targetFg ?? ""}
                  />
                  {errors?.targetFg && (
                    <p className="text-sm text-destructive">{errors.targetFg[0]}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetAbv">ABV (%)</Label>
                  <Input
                    id="targetAbv"
                    name="targetAbv"
                    type="number"
                    step="0.1"
                    placeholder="e.g. 5.2"
                    defaultValue={values?.targetAbv ?? ""}
                  />
                  {errors?.targetAbv && (
                    <p className="text-sm text-destructive">{errors.targetAbv[0]}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetIbu">IBU</Label>
                  <Input
                    id="targetIbu"
                    name="targetIbu"
                    type="number"
                    step="1"
                    placeholder="e.g. 35"
                    defaultValue={values?.targetIbu ?? ""}
                  />
                  {errors?.targetIbu && (
                    <p className="text-sm text-destructive">{errors.targetIbu[0]}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetSrm">SRM</Label>
                  <Input
                    id="targetSrm"
                    name="targetSrm"
                    type="number"
                    step="0.1"
                    placeholder="e.g. 6"
                    defaultValue={values?.targetSrm ?? ""}
                  />
                  {errors?.targetSrm && (
                    <p className="text-sm text-destructive">{errors.targetSrm[0]}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Time Estimates */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Time Estimates
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="estimatedBrewDays">Brew Days</Label>
                  <Input
                    id="estimatedBrewDays"
                    name="estimatedBrewDays"
                    type="number"
                    defaultValue={values?.estimatedBrewDays ?? 1}
                  />
                  {errors?.estimatedBrewDays && (
                    <p className="text-sm text-destructive">
                      {errors.estimatedBrewDays[0]}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estimatedFermentationDays">
                    Fermentation Days
                  </Label>
                  <Input
                    id="estimatedFermentationDays"
                    name="estimatedFermentationDays"
                    type="number"
                    defaultValue={values?.estimatedFermentationDays ?? 14}
                  />
                  {errors?.estimatedFermentationDays && (
                    <p className="text-sm text-destructive">
                      {errors.estimatedFermentationDays[0]}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estimatedConditioningDays">
                    Conditioning Days
                  </Label>
                  <Input
                    id="estimatedConditioningDays"
                    name="estimatedConditioningDays"
                    type="number"
                    defaultValue={values?.estimatedConditioningDays ?? 7}
                  />
                  {errors?.estimatedConditioningDays && (
                    <p className="text-sm text-destructive">
                      {errors.estimatedConditioningDays[0]}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit">Create Recipe</Button>
              <Button variant="outline" asChild>
                <Link to="/recipes">Cancel</Link>
              </Button>
            </div>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
