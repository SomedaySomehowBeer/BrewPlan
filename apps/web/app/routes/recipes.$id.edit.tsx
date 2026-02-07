import { Form, useLoaderData, useActionData, redirect, Link } from "react-router";
import type { Route } from "./+types/recipes.$id.edit";
import { requireUser } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { updateRecipeSchema } from "@brewplan/shared";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireUser(request);

  const recipe = queries.recipes.get(params.id);
  if (!recipe) {
    throw new Response("Recipe not found", { status: 404 });
  }

  return { recipe };
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

  const result = updateRecipeSchema.safeParse(cleaned);
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors };
  }

  queries.recipes.update(params.id, result.data);
  return redirect(`/recipes/${params.id}`);
}

export default function EditRecipe() {
  const { recipe } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const errors = actionData?.errors;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Recipe</CardTitle>
      </CardHeader>
      <CardContent>
        <Form method="post" className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Basic Information
            </h3>
            <div className="space-y-2">
              <Label htmlFor="name">Recipe Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={recipe.name}
                required
              />
              {errors?.name && (
                <p className="text-sm text-destructive">{errors.name[0]}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="style">Style</Label>
              <Input
                id="style"
                name="style"
                defaultValue={recipe.style}
                required
              />
              {errors?.style && (
                <p className="text-sm text-destructive">{errors.style[0]}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={recipe.description ?? ""}
              />
              {errors?.description && (
                <p className="text-sm text-destructive">
                  {errors.description[0]}
                </p>
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
                  defaultValue={recipe.batchSizeLitres}
                  required
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
                  defaultValue={recipe.boilDurationMinutes}
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
                  defaultValue={recipe.mashTempCelsius ?? ""}
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
                  defaultValue={recipe.targetOg ?? ""}
                />
                {errors?.targetOg && (
                  <p className="text-sm text-destructive">
                    {errors.targetOg[0]}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetFg">FG</Label>
                <Input
                  id="targetFg"
                  name="targetFg"
                  type="number"
                  step="0.001"
                  defaultValue={recipe.targetFg ?? ""}
                />
                {errors?.targetFg && (
                  <p className="text-sm text-destructive">
                    {errors.targetFg[0]}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetAbv">ABV (%)</Label>
                <Input
                  id="targetAbv"
                  name="targetAbv"
                  type="number"
                  step="0.1"
                  defaultValue={recipe.targetAbv ?? ""}
                />
                {errors?.targetAbv && (
                  <p className="text-sm text-destructive">
                    {errors.targetAbv[0]}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetIbu">IBU</Label>
                <Input
                  id="targetIbu"
                  name="targetIbu"
                  type="number"
                  step="1"
                  defaultValue={recipe.targetIbu ?? ""}
                />
                {errors?.targetIbu && (
                  <p className="text-sm text-destructive">
                    {errors.targetIbu[0]}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetSrm">SRM</Label>
                <Input
                  id="targetSrm"
                  name="targetSrm"
                  type="number"
                  step="0.1"
                  defaultValue={recipe.targetSrm ?? ""}
                />
                {errors?.targetSrm && (
                  <p className="text-sm text-destructive">
                    {errors.targetSrm[0]}
                  </p>
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
                  defaultValue={recipe.estimatedBrewDays}
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
                  defaultValue={recipe.estimatedFermentationDays}
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
                  defaultValue={recipe.estimatedConditioningDays}
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
            <Button type="submit">Save Changes</Button>
            <Button variant="outline" asChild>
              <Link to={`/recipes/${recipe.id}`}>Cancel</Link>
            </Button>
          </div>
        </Form>
      </CardContent>
    </Card>
  );
}
