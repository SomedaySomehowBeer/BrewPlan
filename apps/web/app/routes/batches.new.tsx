import { Form, useLoaderData, useActionData, redirect } from "react-router";
import type { Route } from "./+types/batches.new";
import { requireUser, requireMutationAccess } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { createBatchSchema } from "@brewplan/shared";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "~/components/ui/select";

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);

  const activeRecipes = queries.recipes.list({ status: "active" });
  const availableVessels = queries.vessels
    .list()
    .filter((v) => v.status === "available" && !v.archived);

  return { recipes: activeRecipes, vessels: availableVessels };
}

export async function action({ request }: Route.ActionArgs) {
  await requireMutationAccess(request);

  const formData = await request.formData();
  const raw = {
    recipeId: formData.get("recipeId"),
    plannedDate: formData.get("plannedDate") || null,
    brewer: formData.get("brewer") || null,
    batchSizeLitres: formData.get("batchSizeLitres"),
    vesselId: formData.get("vesselId") || null,
    notes: formData.get("notes") || null,
  };

  const result = createBatchSchema.safeParse(raw);
  if (!result.success) {
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0];
      if (key) errors[String(key)] = issue.message;
    }
    return { errors, values: raw };
  }

  const batch = queries.batches.create(result.data);
  return redirect(`/batches/${batch.id}`);
}

export default function NewBatch() {
  const { recipes, vessels } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const errors = actionData?.errors;
  const values = actionData?.values;

  // Find the selected recipe to pre-fill batch size
  const selectedRecipeId =
    (values?.recipeId as string) || (recipes.length > 0 ? "" : "");

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Batch</CardTitle>
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
                  {recipe.name} ({recipe.batchSizeLitres} L)
                </option>
              ))}
            </select>
            {errors?.recipeId && (
              <p className="text-sm text-destructive">{errors.recipeId}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="plannedDate">Planned Date</Label>
            <Input
              id="plannedDate"
              name="plannedDate"
              type="date"
              defaultValue={(values?.plannedDate as string) ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="batchSizeLitres">Batch Size (litres)</Label>
            <Input
              id="batchSizeLitres"
              name="batchSizeLitres"
              type="number"
              step="0.1"
              min="0.1"
              required
              defaultValue={(values?.batchSizeLitres as string) ?? ""}
              placeholder="e.g. 200"
            />
            {errors?.batchSizeLitres && (
              <p className="text-sm text-destructive">
                {errors.batchSizeLitres}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="vesselId">Vessel</Label>
            <select
              id="vesselId"
              name="vesselId"
              defaultValue={(values?.vesselId as string) ?? ""}
              className="flex h-11 w-full items-center rounded-md border border-input bg-card px-3 py-2 text-base ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">No vessel assigned</option>
              {vessels.map((vessel) => (
                <option key={vessel.id} value={vessel.id}>
                  {vessel.name} ({vessel.vesselType}, {vessel.capacityLitres} L)
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="brewer">Brewer</Label>
            <Input
              id="brewer"
              name="brewer"
              defaultValue={(values?.brewer as string) ?? ""}
              placeholder="Who is brewing?"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              defaultValue={(values?.notes as string) ?? ""}
              placeholder="Any notes for this batch..."
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit">Create Batch</Button>
            <Button variant="outline" type="button" asChild>
              <a href="/batches">Cancel</a>
            </Button>
          </div>
        </Form>
      </CardContent>
    </Card>
  );
}
