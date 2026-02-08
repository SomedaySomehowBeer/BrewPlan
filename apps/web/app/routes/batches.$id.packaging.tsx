import {
  Form,
  useLoaderData,
  useActionData,
  redirect,
} from "react-router";
import type { Route } from "./+types/batches.$id.packaging";
import { requireUser } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { createPackagingRunSchema, PackageFormat } from "@brewplan/shared";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { formatDate } from "~/lib/utils";
import { Package, Plus } from "lucide-react";

const FORMAT_OPTIONS: { value: string; label: string }[] = [
  { value: PackageFormat.KEG_50L, label: "50L Keg" },
  { value: PackageFormat.KEG_30L, label: "30L Keg" },
  { value: PackageFormat.KEG_20L, label: "20L Keg" },
  { value: PackageFormat.CAN_375ML, label: "375ml Can" },
  { value: PackageFormat.CAN_355ML, label: "355ml Can" },
  { value: PackageFormat.BOTTLE_330ML, label: "330ml Bottle" },
  { value: PackageFormat.BOTTLE_500ML, label: "500ml Bottle" },
  { value: PackageFormat.OTHER, label: "Other" },
];

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireUser(request);

  const batch = queries.batches.get(params.id);
  if (!batch) {
    throw new Response("Batch not found", { status: 404 });
  }

  const packagingRuns = queries.packaging.listByBatch(params.id);

  return { batch, packagingRuns };
}

export async function action({ request, params }: Route.ActionArgs) {
  await requireUser(request);

  const formData = await request.formData();
  const raw = {
    brewBatchId: params.id,
    packagingDate: formData.get("packagingDate") || "",
    format: formData.get("format") || "",
    formatCustom: formData.get("formatCustom") || null,
    quantityUnits: formData.get("quantityUnits") || "",
    volumeLitres: formData.get("volumeLitres") || "",
    bestBeforeDate: formData.get("bestBeforeDate") || null,
    notes: formData.get("notes") || null,
  };

  const result = createPackagingRunSchema.safeParse(raw);
  if (!result.success) {
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0];
      if (key) errors[String(key)] = issue.message;
    }
    return { errors, values: raw };
  }

  queries.packaging.create(result.data);
  return redirect(`/batches/${params.id}/packaging`);
}

export default function BatchPackaging() {
  const { batch, packagingRuns } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const errors = actionData?.errors;
  const values = actionData?.values;

  const canPackage = batch.status === "ready_to_package";

  return (
    <div className="space-y-6">
      {/* Add Packaging Run form - only when ready to package */}
      {canPackage && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="h-4 w-4" />
              Add Packaging Run
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form method="post" className="space-y-4">
              {errors && Object.keys(errors).length > 0 && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  Please fix the errors below.
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="format">Format</Label>
                  <select
                    id="format"
                    name="format"
                    required
                    defaultValue={(values?.format as string) ?? ""}
                    className="flex h-11 w-full items-center rounded-md border border-input bg-card px-3 py-2 text-base ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="" disabled>
                      Select format...
                    </option>
                    {FORMAT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {errors?.format && (
                    <p className="text-sm text-destructive">{errors.format}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="packagingDate">Packaging Date</Label>
                  <Input
                    id="packagingDate"
                    name="packagingDate"
                    type="date"
                    required
                    defaultValue={
                      (values?.packagingDate as string) ??
                      new Date().toISOString().split("T")[0]
                    }
                  />
                  {errors?.packagingDate && (
                    <p className="text-sm text-destructive">
                      {errors.packagingDate}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantityUnits">Quantity (units)</Label>
                  <Input
                    id="quantityUnits"
                    name="quantityUnits"
                    type="number"
                    min="1"
                    step="1"
                    required
                    defaultValue={(values?.quantityUnits as string) ?? ""}
                    placeholder="e.g. 4"
                  />
                  {errors?.quantityUnits && (
                    <p className="text-sm text-destructive">
                      {errors.quantityUnits}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="volumeLitres">Volume (litres)</Label>
                  <Input
                    id="volumeLitres"
                    name="volumeLitres"
                    type="number"
                    min="0.1"
                    step="0.1"
                    required
                    defaultValue={(values?.volumeLitres as string) ?? ""}
                    placeholder="e.g. 200"
                  />
                  {errors?.volumeLitres && (
                    <p className="text-sm text-destructive">
                      {errors.volumeLitres}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bestBeforeDate">Best Before Date</Label>
                  <Input
                    id="bestBeforeDate"
                    name="bestBeforeDate"
                    type="date"
                    defaultValue={(values?.bestBeforeDate as string) ?? ""}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  rows={2}
                  defaultValue={(values?.notes as string) ?? ""}
                  placeholder="Any packaging notes..."
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full min-h-[56px] text-base"
              >
                <Package className="mr-2 h-5 w-5" />
                Add Packaging Run
              </Button>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Existing packaging runs */}
      {packagingRuns.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No packaging runs recorded yet.
            {!canPackage && (
              <p className="mt-1">
                Batch must be in &quot;Ready to Package&quot; status to add
                packaging runs.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Packaging Runs ({packagingRuns.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {packagingRuns.map((run) => (
                <div key={run.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <span className="font-medium text-sm">
                      {FORMAT_OPTIONS.find((o) => o.value === run.format)?.label ?? run.format}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(run.packagingDate)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Quantity: </span>
                      {run.quantityUnits} units
                    </div>
                    <div>
                      <span className="text-muted-foreground">Volume: </span>
                      {run.volumeLitres} L
                    </div>
                    {run.bestBeforeDate && (
                      <div>
                        <span className="text-muted-foreground">
                          Best Before:{" "}
                        </span>
                        {formatDate(run.bestBeforeDate)}
                      </div>
                    )}
                  </div>
                  {run.notes && (
                    <p className="text-xs text-muted-foreground">{run.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
