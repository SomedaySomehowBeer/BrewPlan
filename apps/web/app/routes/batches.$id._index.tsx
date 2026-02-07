import { useLoaderData, useActionData, Link, Form, redirect } from "react-router";
import type { Route } from "./+types/batches.$id._index";
import { requireUser } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { batchMeasurementLogSchema } from "@brewplan/shared";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "~/components/ui/table";
import { StatusBadge } from "~/components/shared/status-badge";
import { UnitDisplay } from "~/components/shared/unit-display";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { formatDate, formatNumber } from "~/lib/utils";
import { Textarea } from "~/components/ui/textarea";
import { Beaker, Thermometer, FlaskConical, Ruler, Save } from "lucide-react";

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireUser(request);

  const batch = queries.batches.getWithDetails(params.id);
  if (!batch) {
    throw new Response("Batch not found", { status: 404 });
  }

  return { batch };
}

export async function action({ request, params }: Route.ActionArgs) {
  await requireUser(request);

  const formData = await request.formData();
  const raw: Record<string, unknown> = {};

  // Only include fields that were actually submitted
  for (const key of ["og", "fg", "volumeLitres", "ibu", "notes", "loggedBy"]) {
    const val = formData.get(key);
    if (val !== null && val !== "") {
      raw[key] = val;
    }
  }

  const result = batchMeasurementLogSchema.safeParse(raw);
  if (!result.success) {
    const errors = result.error.issues.reduce(
      (acc, issue) => {
        acc[issue.path.join(".")] = issue.message;
        return acc;
      },
      {} as Record<string, string>
    );
    return { errors };
  }

  queries.batches.addMeasurementEntry(params.id, result.data);
  return redirect(`/batches/${params.id}`);
}

export default function BatchDetail() {
  const { batch } = useLoaderData<typeof loader>();

  const capacityPercent =
    batch.vessel && batch.vessel.capacityLitres > 0
      ? Math.round(
          (batch.batchSizeLitres / batch.vessel.capacityLitres) * 100
        )
      : null;

  return (
    <div className="space-y-6">
      {/* Measurements & Recipe Info */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Recipe Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recipe Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {batch.recipe && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Recipe</span>
                  <span className="font-medium">{batch.recipe.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Style</span>
                  <span>{batch.recipe.style}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Target OG</span>
                  <span>{batch.recipe.targetOg ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Target FG</span>
                  <span>{batch.recipe.targetFg ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Target ABV</span>
                  <span>
                    {batch.recipe.targetAbv
                      ? `${formatNumber(batch.recipe.targetAbv)}%`
                      : "—"}
                  </span>
                </div>
                {batch.brewer && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Brewer</span>
                    <span>{batch.brewer}</span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Measured Values — Editable Form */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Measured Values</CardTitle>
          </CardHeader>
          <CardContent>
            <Form method="post" className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="og" className="text-xs text-muted-foreground">OG</Label>
                  <Input
                    id="og"
                    name="og"
                    type="number"
                    step="0.001"
                    placeholder="1.050"
                    className="h-10"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="fg" className="text-xs text-muted-foreground">FG</Label>
                  <Input
                    id="fg"
                    name="fg"
                    type="number"
                    step="0.001"
                    placeholder="1.010"
                    className="h-10"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="volumeLitres" className="text-xs text-muted-foreground">Volume (L)</Label>
                  <Input
                    id="volumeLitres"
                    name="volumeLitres"
                    type="number"
                    step="0.1"
                    placeholder="20.0"
                    className="h-10"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ibu" className="text-xs text-muted-foreground">IBU</Label>
                  <Input
                    id="ibu"
                    name="ibu"
                    type="number"
                    step="1"
                    placeholder="35"
                    className="h-10"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="loggedBy" className="text-xs text-muted-foreground">Logged By</Label>
                <Input
                  id="loggedBy"
                  name="loggedBy"
                  placeholder="Name"
                  defaultValue={batch.brewer ?? ""}
                  className="h-10"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="notes" className="text-xs text-muted-foreground">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Optional notes for this reading..."
                  rows={2}
                />
              </div>
              {batch.actualAbv != null && (
                <div className="text-sm text-muted-foreground">
                  ABV: {formatNumber(batch.actualAbv)}% <span className="text-xs">(calculated on packaging)</span>
                </div>
              )}
              <Button type="submit" size="sm" className="min-h-[44px]">
                <Save className="mr-1.5 h-4 w-4" />
                Save Measurements
              </Button>
            </Form>
          </CardContent>
        </Card>
      </div>

      {/* Vessel Info */}
      {batch.vessel && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Vessel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div>
                <span className="font-medium">{batch.vessel.name}</span>
                <span className="ml-2 text-muted-foreground">
                  ({batch.vessel.vesselType})
                </span>
              </div>
              <StatusBadge status={batch.vessel.status} />
            </div>
            {capacityPercent !== null && (
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>
                    {batch.batchSizeLitres} L / {batch.vessel.capacityLitres} L
                  </span>
                  <span>{capacityPercent}%</span>
                </div>
                <div className="h-3 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      capacityPercent > 90
                        ? "bg-destructive"
                        : capacityPercent > 75
                        ? "bg-amber-500"
                        : "bg-primary"
                    }`}
                    style={{ width: `${Math.min(capacityPercent, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {batch.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{batch.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Tabs: Measurements, Consumption & Fermentation Log */}
      <Tabs defaultValue="measurements">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="measurements" className="flex-1 sm:flex-initial">
            <Ruler className="mr-1.5 h-4 w-4" />
            Measurements
          </TabsTrigger>
          <TabsTrigger value="consumption" className="flex-1 sm:flex-initial">
            <Beaker className="mr-1.5 h-4 w-4" />
            Consumption
          </TabsTrigger>
          <TabsTrigger value="fermentation" className="flex-1 sm:flex-initial">
            <FlaskConical className="mr-1.5 h-4 w-4" />
            Fermentation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="measurements">
          {batch.measurementLog.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No measurement entries yet. Use the form above to log a reading.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                {/* Mobile cards */}
                <div className="sm:hidden divide-y">
                  {batch.measurementLog.map((entry) => (
                    <div key={entry.id} className="p-4 space-y-1">
                      <div className="text-xs text-muted-foreground">
                        {formatDate(entry.loggedAt)}
                        {entry.loggedBy && ` — ${entry.loggedBy}`}
                      </div>
                      <div className="flex gap-4 text-sm flex-wrap">
                        {entry.og != null && <span>OG {entry.og}</span>}
                        {entry.fg != null && <span>FG {entry.fg}</span>}
                        {entry.volumeLitres != null && (
                          <span>{entry.volumeLitres} L</span>
                        )}
                        {entry.ibu != null && <span>{entry.ibu} IBU</span>}
                      </div>
                      {entry.notes && (
                        <p className="text-xs text-muted-foreground">
                          {entry.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                {/* Desktop table */}
                <div className="hidden sm:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date/Time</TableHead>
                        <TableHead>OG</TableHead>
                        <TableHead>FG</TableHead>
                        <TableHead>Volume (L)</TableHead>
                        <TableHead>IBU</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead>By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {batch.measurementLog.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="text-xs">
                            {formatDate(entry.loggedAt)}
                          </TableCell>
                          <TableCell>{entry.og ?? "—"}</TableCell>
                          <TableCell>{entry.fg ?? "—"}</TableCell>
                          <TableCell>
                            {entry.volumeLitres != null
                              ? `${entry.volumeLitres}`
                              : "—"}
                          </TableCell>
                          <TableCell>{entry.ibu ?? "—"}</TableCell>
                          <TableCell className="max-w-[200px] truncate text-xs">
                            {entry.notes ?? "—"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {entry.loggedBy ?? "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="consumption">
          {batch.consumptions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No consumption records yet.
                <div className="mt-3">
                  <Link
                    to={`/batches/${batch.id}/consumption`}
                    className="text-primary underline"
                  >
                    Record ingredient usage
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                {/* Mobile cards */}
                <div className="sm:hidden divide-y">
                  {batch.consumptions.map((c) => (
                    <div key={c.id} className="p-4 space-y-1">
                      <div className="font-medium text-sm">
                        {c.inventoryItemName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Lot: {c.lotNumber} | Stage: {c.usageStage}
                      </div>
                      <div className="text-sm">
                        Planned: <UnitDisplay value={c.plannedQuantity} unit={c.unit} /> |
                        Actual: <UnitDisplay value={c.actualQuantity} unit={c.unit} />
                      </div>
                    </div>
                  ))}
                </div>
                {/* Desktop table */}
                <div className="hidden sm:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ingredient</TableHead>
                        <TableHead>Lot</TableHead>
                        <TableHead>Planned</TableHead>
                        <TableHead>Actual</TableHead>
                        <TableHead>Stage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {batch.consumptions.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">
                            {c.inventoryItemName}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {c.lotNumber}
                          </TableCell>
                          <TableCell>
                            <UnitDisplay
                              value={c.plannedQuantity}
                              unit={c.unit}
                            />
                          </TableCell>
                          <TableCell>
                            <UnitDisplay
                              value={c.actualQuantity}
                              unit={c.unit}
                            />
                          </TableCell>
                          <TableCell>{c.usageStage}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
              <div className="p-4 border-t">
                <Link
                  to={`/batches/${batch.id}/consumption`}
                  className="text-sm text-primary underline"
                >
                  Add consumption record
                </Link>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="fermentation">
          {batch.fermentationLog.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No fermentation log entries yet.
                <div className="mt-3">
                  <Link
                    to={`/batches/${batch.id}/fermentation`}
                    className="text-primary underline"
                  >
                    Add fermentation reading
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                {/* Mobile cards */}
                <div className="sm:hidden divide-y">
                  {batch.fermentationLog.map((entry) => (
                    <div key={entry.id} className="p-4 space-y-1">
                      <div className="text-xs text-muted-foreground">
                        {formatDate(entry.loggedAt)}
                        {entry.loggedBy && ` - ${entry.loggedBy}`}
                      </div>
                      <div className="flex gap-4 text-sm">
                        {entry.gravity != null && (
                          <span>
                            <Beaker className="inline h-3 w-3 mr-0.5" />
                            {entry.gravity}
                          </span>
                        )}
                        {entry.temperatureCelsius != null && (
                          <span>
                            <Thermometer className="inline h-3 w-3 mr-0.5" />
                            {entry.temperatureCelsius}&deg;C
                          </span>
                        )}
                        {entry.ph != null && <span>pH {entry.ph}</span>}
                      </div>
                      {entry.notes && (
                        <p className="text-xs text-muted-foreground">
                          {entry.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                {/* Desktop table */}
                <div className="hidden sm:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date/Time</TableHead>
                        <TableHead>Gravity</TableHead>
                        <TableHead>Temp (&deg;C)</TableHead>
                        <TableHead>pH</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead>By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {batch.fermentationLog.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="text-xs">
                            {formatDate(entry.loggedAt)}
                          </TableCell>
                          <TableCell>{entry.gravity ?? "—"}</TableCell>
                          <TableCell>
                            {entry.temperatureCelsius != null
                              ? `${entry.temperatureCelsius}`
                              : "—"}
                          </TableCell>
                          <TableCell>{entry.ph ?? "—"}</TableCell>
                          <TableCell className="max-w-[200px] truncate text-xs">
                            {entry.notes ?? "—"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {entry.loggedBy ?? "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
              <div className="p-4 border-t">
                <Link
                  to={`/batches/${batch.id}/fermentation`}
                  className="text-sm text-primary underline"
                >
                  Add fermentation reading
                </Link>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
