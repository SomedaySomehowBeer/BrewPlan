import {
  Form,
  useLoaderData,
  useActionData,
  Link,
  redirect,
} from "react-router";
import type { Route } from "./+types/batches.$id.fermentation";
import { requireUser } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { fermentationLogSchema } from "@brewplan/shared";
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
import { formatDate } from "~/lib/utils";
import {
  ArrowLeft,
  Plus,
  Beaker,
  Thermometer,
} from "lucide-react";

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
  const raw = {
    gravity: formData.get("gravity") || null,
    temperatureCelsius: formData.get("temperatureCelsius") || null,
    ph: formData.get("ph") || null,
    notes: formData.get("notes") || null,
    loggedBy: formData.get("loggedBy") || null,
  };

  const result = fermentationLogSchema.safeParse(raw);
  if (!result.success) {
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0];
      if (key) errors[String(key)] = issue.message;
    }
    return { errors, values: raw };
  }

  queries.batches.addFermentationEntry(params.id, result.data);
  return redirect(`/batches/${params.id}/fermentation`);
}

export default function BatchFermentation() {
  const { batch } = useLoaderData<typeof loader>();
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

      {/* Quick entry form at top — designed for one-handed brewery floor use */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4" />
            Quick Reading
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-3">
            {errors && Object.keys(errors).length > 0 && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                Please fix the errors below.
              </div>
            )}

            {/* Large inputs for one-handed use */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="gravity" className="text-xs">
                  Gravity
                </Label>
                <Input
                  id="gravity"
                  name="gravity"
                  type="number"
                  step="0.001"
                  placeholder="1.050"
                  defaultValue={(values?.gravity as string) ?? ""}
                  className="h-14 text-lg text-center font-mono"
                  inputMode="decimal"
                />
                {errors?.gravity && (
                  <p className="text-xs text-destructive">{errors.gravity}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="temperatureCelsius" className="text-xs">
                  Temp &deg;C
                </Label>
                <Input
                  id="temperatureCelsius"
                  name="temperatureCelsius"
                  type="number"
                  step="0.1"
                  placeholder="20.0"
                  defaultValue={(values?.temperatureCelsius as string) ?? ""}
                  className="h-14 text-lg text-center font-mono"
                  inputMode="decimal"
                />
                {errors?.temperatureCelsius && (
                  <p className="text-xs text-destructive">
                    {errors.temperatureCelsius}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="ph" className="text-xs">
                  pH
                </Label>
                <Input
                  id="ph"
                  name="ph"
                  type="number"
                  step="0.01"
                  placeholder="4.20"
                  defaultValue={(values?.ph as string) ?? ""}
                  className="h-14 text-lg text-center font-mono"
                  inputMode="decimal"
                />
                {errors?.ph && (
                  <p className="text-xs text-destructive">{errors.ph}</p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="notes" className="text-xs">
                Notes
              </Label>
              <Textarea
                id="notes"
                name="notes"
                rows={2}
                defaultValue={(values?.notes as string) ?? ""}
                placeholder="Any observations..."
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="loggedBy" className="text-xs">
                Logged By
              </Label>
              <Input
                id="loggedBy"
                name="loggedBy"
                defaultValue={(values?.loggedBy as string) ?? ""}
                placeholder="Your name"
              />
            </div>

            <Button type="submit" size="lg" className="w-full min-h-[56px] text-base">
              Log Reading
            </Button>
          </Form>
        </CardContent>
      </Card>

      {/* Fermentation log entries */}
      {batch.fermentationLog.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Fermentation Log ({batch.fermentationLog.length} entries)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Mobile cards */}
            <div className="sm:hidden divide-y">
              {[...batch.fermentationLog].reverse().map((entry) => (
                <div key={entry.id} className="p-4 space-y-1">
                  <div className="text-xs text-muted-foreground">
                    {formatDate(entry.loggedAt)}
                    {entry.loggedBy && ` - ${entry.loggedBy}`}
                  </div>
                  <div className="flex gap-4 text-sm">
                    {entry.gravity != null && (
                      <span className="flex items-center gap-1">
                        <Beaker className="h-3 w-3 text-muted-foreground" />
                        <span className="font-mono">{entry.gravity}</span>
                      </span>
                    )}
                    {entry.temperatureCelsius != null && (
                      <span className="flex items-center gap-1">
                        <Thermometer className="h-3 w-3 text-muted-foreground" />
                        <span className="font-mono">
                          {entry.temperatureCelsius}&deg;C
                        </span>
                      </span>
                    )}
                    {entry.ph != null && (
                      <span className="font-mono">pH {entry.ph}</span>
                    )}
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
                  {[...batch.fermentationLog].reverse().map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {formatDate(entry.loggedAt)}
                      </TableCell>
                      <TableCell className="font-mono">
                        {entry.gravity ?? "—"}
                      </TableCell>
                      <TableCell className="font-mono">
                        {entry.temperatureCelsius != null
                          ? `${entry.temperatureCelsius}`
                          : "—"}
                      </TableCell>
                      <TableCell className="font-mono">
                        {entry.ph ?? "—"}
                      </TableCell>
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
    </div>
  );
}
