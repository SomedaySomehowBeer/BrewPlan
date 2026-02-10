import {
  Form,
  Link,
  useLoaderData,
  useActionData,
  redirect,
} from "react-router";
import type { Route } from "./+types/stock.$id";
import { requireUser, requireMutationAccess } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { updateFinishedGoodsSchema } from "@brewplan/shared";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { formatDate, formatNumber } from "~/lib/utils";
import { ArrowLeft } from "lucide-react";

const FORMAT_LABELS: Record<string, string> = {
  keg_50l: "50L Keg",
  keg_30l: "30L Keg",
  keg_20l: "20L Keg",
  can_375ml: "375ml Can",
  can_355ml: "355ml Can",
  bottle_330ml: "330ml Bottle",
  bottle_500ml: "500ml Bottle",
  other: "Other",
};

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireUser(request);

  const fg = queries.packaging.getFinishedGoods(params.id);
  if (!fg) {
    throw new Response("Finished goods not found", { status: 404 });
  }

  return { fg, userRole: user.role };
}

export async function action({ request, params }: Route.ActionArgs) {
  await requireMutationAccess(request);

  const formData = await request.formData();
  const raw = {
    unitPrice: formData.get("unitPrice") || null,
    location: formData.get("location") || null,
  };

  const result = updateFinishedGoodsSchema.safeParse(raw);
  if (!result.success) {
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0];
      if (key) errors[String(key)] = issue.message;
    }
    return { errors, values: raw };
  }

  queries.packaging.updateFinishedGoods(params.id, result.data);
  return redirect(`/stock/${params.id}`);
}

export default function StockDetail() {
  const { fg, userRole } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const errors = actionData?.errors;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        to="/stock"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground min-h-[44px]"
      >
        <ArrowLeft className="h-4 w-4" />
        All Stock
      </Link>

      {/* Product header */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>{fg.productName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Format</span>
            <span>{FORMAT_LABELS[fg.format] ?? fg.format}</span>
          </div>
          {fg.bestBeforeDate && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Best Before</span>
              <span>{formatDate(fg.bestBeforeDate)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Traceability chain */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Traceability</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Recipe</span>
            <Link
              to={`/recipes/${fg.recipeId}`}
              className="text-primary underline-offset-4 hover:underline min-h-[44px] inline-flex items-center"
            >
              {fg.recipeName}
            </Link>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Batch</span>
            <Link
              to={`/batches/${fg.brewBatchId}`}
              className="font-mono text-primary underline-offset-4 hover:underline min-h-[44px] inline-flex items-center"
            >
              {fg.batchNumber}
            </Link>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Packaging Run</span>
            <Link
              to={`/batches/${fg.brewBatchId}/packaging`}
              className="text-primary underline-offset-4 hover:underline min-h-[44px] inline-flex items-center"
            >
              View Run
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Stock levels */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Stock Levels</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">On Hand</span>
            <span className="font-medium">{fg.quantityOnHand}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Reserved</span>
            <span>{fg.quantityReserved}</span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="text-muted-foreground font-medium">Available</span>
            <span className="font-bold text-lg">{fg.quantityAvailable}</span>
          </div>
        </CardContent>
      </Card>

      {/* Edit form for price and location */}
      {userRole !== "viewer" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Form method="post" className="space-y-4">
              {errors && Object.keys(errors).length > 0 && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  Please fix the errors below.
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="unitPrice">Unit Price ($)</Label>
                <Input
                  id="unitPrice"
                  name="unitPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={
                    fg.unitPrice != null ? formatNumber(fg.unitPrice, 2) : ""
                  }
                  placeholder="e.g. 12.50"
                />
                {errors?.unitPrice && (
                  <p className="text-sm text-destructive">{errors.unitPrice}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  name="location"
                  defaultValue={fg.location ?? ""}
                  placeholder="e.g. Cold Room A, Shelf 3"
                />
                {errors?.location && (
                  <p className="text-sm text-destructive">{errors.location}</p>
                )}
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full min-h-[56px] text-base"
              >
                Save Changes
              </Button>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
