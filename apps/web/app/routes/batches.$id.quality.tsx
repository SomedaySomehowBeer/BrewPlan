import {
  Form,
  useLoaderData,
  useActionData,
  Link,
  redirect,
} from "react-router";
import type { Route } from "./+types/batches.$id.quality";
import { requireUser } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { createQualityCheckSchema } from "@brewplan/shared";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { StatusBadge } from "~/components/shared/status-badge";
import { formatDate } from "~/lib/utils";
import { ArrowLeft, Plus, ClipboardCheck } from "lucide-react";

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireUser(request);

  const batch = queries.batches.get(params.id);
  if (!batch) {
    throw new Response("Batch not found", { status: 404 });
  }

  const checks = queries.quality.listByBatch(params.id);
  return { batch, checks };
}

export async function action({ request, params }: Route.ActionArgs) {
  await requireUser(request);

  const formData = await request.formData();
  const raw = {
    brewBatchId: params.id,
    checkType: formData.get("checkType"),
    checkedBy: formData.get("checkedBy") || null,
    ph: formData.get("ph") || null,
    dissolvedOxygen: formData.get("dissolvedOxygen") || null,
    turbidity: formData.get("turbidity") || null,
    colourSrm: formData.get("colourSrm") || null,
    abv: formData.get("abv") || null,
    co2Volumes: formData.get("co2Volumes") || null,
    sensoryNotes: formData.get("sensoryNotes") || null,
    microbiological: formData.get("microbiological") || null,
    result: formData.get("result") || "pending",
    notes: formData.get("notes") || null,
  };

  const result = createQualityCheckSchema.safeParse(raw);
  if (!result.success) {
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0];
      if (key) errors[String(key)] = issue.message;
    }
    return { errors, values: raw };
  }

  queries.quality.create(result.data);
  return redirect(`/batches/${params.id}/quality`);
}

export default function BatchQuality() {
  const { batch, checks } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const errors = actionData?.errors;
  const values = actionData?.values;

  return (
    <div className="space-y-6">
      <Link
        to={`/batches/${batch.id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground min-h-[44px]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Batch
      </Link>

      {/* New Quality Check Form */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4" />
            Log Quality Check
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-4">
            {errors && Object.keys(errors).length > 0 && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                Please fix the errors below.
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="checkType">Check Type *</Label>
                <Select
                  name="checkType"
                  defaultValue={(values?.checkType as string) ?? ""}
                >
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pre_ferment">Pre-Ferment</SelectItem>
                    <SelectItem value="mid_ferment">Mid-Ferment</SelectItem>
                    <SelectItem value="post_ferment">Post-Ferment</SelectItem>
                    <SelectItem value="pre_package">Pre-Package</SelectItem>
                    <SelectItem value="packaged">Packaged</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {errors?.checkType && (
                  <p className="text-xs text-destructive">{errors.checkType}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="result">Result</Label>
                <Select
                  name="result"
                  defaultValue={(values?.result as string) ?? "pending"}
                >
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="pass">Pass</SelectItem>
                    <SelectItem value="fail">Fail</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Measurements - compact grid */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              <div className="space-y-1">
                <Label htmlFor="ph" className="text-xs">pH</Label>
                <Input
                  id="ph"
                  name="ph"
                  type="number"
                  step="0.01"
                  placeholder="4.20"
                  defaultValue={(values?.ph as string) ?? ""}
                  className="h-12 text-center font-mono"
                  inputMode="decimal"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="dissolvedOxygen" className="text-xs">DO (ppm)</Label>
                <Input
                  id="dissolvedOxygen"
                  name="dissolvedOxygen"
                  type="number"
                  step="0.01"
                  placeholder="0.05"
                  defaultValue={(values?.dissolvedOxygen as string) ?? ""}
                  className="h-12 text-center font-mono"
                  inputMode="decimal"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="turbidity" className="text-xs">Turbidity</Label>
                <Input
                  id="turbidity"
                  name="turbidity"
                  type="number"
                  step="0.1"
                  defaultValue={(values?.turbidity as string) ?? ""}
                  className="h-12 text-center font-mono"
                  inputMode="decimal"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="colourSrm" className="text-xs">SRM</Label>
                <Input
                  id="colourSrm"
                  name="colourSrm"
                  type="number"
                  step="0.1"
                  defaultValue={(values?.colourSrm as string) ?? ""}
                  className="h-12 text-center font-mono"
                  inputMode="decimal"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="abv" className="text-xs">ABV %</Label>
                <Input
                  id="abv"
                  name="abv"
                  type="number"
                  step="0.1"
                  defaultValue={(values?.abv as string) ?? ""}
                  className="h-12 text-center font-mono"
                  inputMode="decimal"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="co2Volumes" className="text-xs">CO2 Vol</Label>
                <Input
                  id="co2Volumes"
                  name="co2Volumes"
                  type="number"
                  step="0.1"
                  defaultValue={(values?.co2Volumes as string) ?? ""}
                  className="h-12 text-center font-mono"
                  inputMode="decimal"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="sensoryNotes" className="text-xs">Sensory Notes</Label>
              <Textarea
                id="sensoryNotes"
                name="sensoryNotes"
                rows={2}
                defaultValue={(values?.sensoryNotes as string) ?? ""}
                placeholder="Tasting panel comments..."
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="microbiological" className="text-xs">Microbiological</Label>
              <Textarea
                id="microbiological"
                name="microbiological"
                rows={2}
                defaultValue={(values?.microbiological as string) ?? ""}
                placeholder="Micro test results..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="notes" className="text-xs">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  rows={2}
                  defaultValue={(values?.notes as string) ?? ""}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="checkedBy" className="text-xs">Checked By</Label>
                <Input
                  id="checkedBy"
                  name="checkedBy"
                  defaultValue={(values?.checkedBy as string) ?? ""}
                  placeholder="Your name"
                  className="min-h-[44px]"
                />
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full min-h-[56px] text-base">
              <ClipboardCheck className="mr-2 h-5 w-5" />
              Log Quality Check
            </Button>
          </Form>
        </CardContent>
      </Card>

      {/* Existing quality checks */}
      {checks.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Quality Checks ({checks.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Mobile cards */}
            <div className="sm:hidden divide-y">
              {checks.map((check) => (
                <div key={check.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <StatusBadge status={check.checkType} />
                    <StatusBadge status={check.result} />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(check.checkedAt)}
                    {check.checkedBy && ` — ${check.checkedBy}`}
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm">
                    {check.ph != null && <span className="font-mono">pH {check.ph}</span>}
                    {check.dissolvedOxygen != null && <span className="font-mono">DO {check.dissolvedOxygen}</span>}
                    {check.abv != null && <span className="font-mono">{check.abv}% ABV</span>}
                    {check.co2Volumes != null && <span className="font-mono">{check.co2Volumes} CO2</span>}
                  </div>
                  {check.sensoryNotes && (
                    <p className="text-xs text-muted-foreground">{check.sensoryNotes}</p>
                  )}
                  {check.notes && (
                    <p className="text-xs text-muted-foreground">{check.notes}</p>
                  )}
                </div>
              ))}
            </div>
            {/* Desktop table */}
            <div className="hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>pH</TableHead>
                    <TableHead>DO</TableHead>
                    <TableHead>ABV</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checks.map((check) => (
                    <TableRow key={check.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {formatDate(check.checkedAt)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={check.checkType} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={check.result} />
                      </TableCell>
                      <TableCell className="font-mono">
                        {check.ph ?? "—"}
                      </TableCell>
                      <TableCell className="font-mono">
                        {check.dissolvedOxygen ?? "—"}
                      </TableCell>
                      <TableCell className="font-mono">
                        {check.abv != null ? `${check.abv}%` : "—"}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs">
                        {check.notes ?? check.sensoryNotes ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {check.checkedBy ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
