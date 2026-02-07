import {
  Form,
  useLoaderData,
  useActionData,
  Link,
  redirect,
} from "react-router";
import type { Route } from "./+types/vessels.$id";
import { requireUser } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { updateVesselSchema } from "@brewplan/shared";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { StatusBadge } from "~/components/shared/status-badge";
import { formatDate } from "~/lib/utils";
import {
  ArrowLeft,
  Container,
  CheckCircle2,
  Sparkles,
  Wrench,
  XCircle,
} from "lucide-react";

const vesselTypes = [
  { value: "fermenter", label: "Fermenter" },
  { value: "brite", label: "Brite Tank" },
  { value: "kettle", label: "Kettle" },
  { value: "hot_liquor_tank", label: "Hot Liquor Tank" },
  { value: "mash_tun", label: "Mash Tun" },
  { value: "other", label: "Other" },
];

const vesselTypeLabels: Record<string, string> = {
  fermenter: "Fermenter",
  brite: "Brite Tank",
  kettle: "Kettle",
  hot_liquor_tank: "Hot Liquor Tank",
  mash_tun: "Mash Tun",
  other: "Other",
};

const statusActions: Array<{
  value: string;
  label: string;
  icon: typeof CheckCircle2;
  variant: "default" | "outline" | "secondary" | "destructive";
}> = [
  { value: "available", label: "Available", icon: CheckCircle2, variant: "default" },
  { value: "cleaning", label: "Cleaning", icon: Sparkles, variant: "secondary" },
  { value: "maintenance", label: "Maintenance", icon: Wrench, variant: "outline" },
  {
    value: "out_of_service",
    label: "Out of Service",
    icon: XCircle,
    variant: "destructive",
  },
];

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireUser(request);

  const vessel = queries.vessels.get(params.id);
  if (!vessel) {
    throw new Response("Vessel not found", { status: 404 });
  }

  return { vessel };
}

export async function action({ request, params }: Route.ActionArgs) {
  await requireUser(request);

  const formData = await request.formData();
  const intent = formData.get("intent");

  // Handle status change
  if (intent === "status") {
    const newStatus = String(formData.get("status"));
    queries.vessels.update(params.id, { status: newStatus });
    return redirect(`/vessels/${params.id}`);
  }

  // Handle detail update
  const raw = {
    name: formData.get("name"),
    vesselType: formData.get("vesselType"),
    capacityLitres: formData.get("capacityLitres"),
    location: formData.get("location") || null,
    notes: formData.get("notes") || null,
  };

  const result = updateVesselSchema.safeParse(raw);
  if (!result.success) {
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0];
      if (key) errors[String(key)] = issue.message;
    }
    return { errors, values: raw };
  }

  queries.vessels.update(params.id, result.data);
  return redirect(`/vessels/${params.id}`);
}

export default function VesselDetail() {
  const { vessel } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const errors = actionData?.errors;
  const values = actionData?.values;

  // Filter status actions to only show statuses different from current
  // Don't show status changes if vessel is in_use (must release batch first)
  const availableStatusActions =
    vessel.status === "in_use"
      ? []
      : statusActions.filter((s) => s.value !== vessel.status);

  return (
    <div className="space-y-6">
      <Link
        to="/vessels"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground min-h-[44px]"
      >
        <ArrowLeft className="h-4 w-4" />
        All Vessels
      </Link>

      {/* Vessel header */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Container className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-xl font-bold">{vessel.name}</h2>
                <StatusBadge status={vessel.status} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {vesselTypeLabels[vessel.vesselType] ?? vessel.vesselType} &middot;{" "}
                {vessel.capacityLitres} L
              </p>
            </div>
          </div>

          {/* Current batch info */}
          {vessel.currentBatchId && vessel.currentBatchNumber && (
            <div className="rounded-md bg-amber-500/10 p-3">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                Currently holding batch{" "}
                <Link
                  to={`/batches/${vessel.currentBatchId}`}
                  className="underline"
                >
                  {vessel.currentBatchNumber}
                </Link>
                {vessel.currentBatchStatus && (
                  <span className="ml-2">
                    <StatusBadge status={vessel.currentBatchStatus} />
                  </span>
                )}
              </p>
            </div>
          )}

          {vessel.location && (
            <p className="text-sm text-muted-foreground">
              Location: {vessel.location}
            </p>
          )}

          {/* Status change buttons - LARGE for brewery floor */}
          {availableStatusActions.length > 0 && (
            <div className="flex flex-wrap gap-3 pt-2">
              {availableStatusActions.map((sa) => {
                const Icon = sa.icon;
                return (
                  <Form key={sa.value} method="post">
                    <input type="hidden" name="intent" value="status" />
                    <input type="hidden" name="status" value={sa.value} />
                    <Button
                      type="submit"
                      variant={sa.variant}
                      size="lg"
                      className="min-h-[56px] text-base px-6"
                    >
                      <Icon className="mr-2 h-5 w-5" />
                      {sa.label}
                    </Button>
                  </Form>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Edit Vessel</CardTitle>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-4">
            {errors && Object.keys(errors).length > 0 && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                Please fix the errors below.
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Vessel Name</Label>
              <Input
                id="name"
                name="name"
                required
                defaultValue={
                  (values?.name as string) ?? vessel.name
                }
              />
              {errors?.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="vesselType">Vessel Type</Label>
              <select
                id="vesselType"
                name="vesselType"
                required
                defaultValue={
                  (values?.vesselType as string) ?? vessel.vesselType
                }
                className="flex h-11 w-full items-center rounded-md border border-input bg-card px-3 py-2 text-base ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {vesselTypes.map((vt) => (
                  <option key={vt.value} value={vt.value}>
                    {vt.label}
                  </option>
                ))}
              </select>
              {errors?.vesselType && (
                <p className="text-sm text-destructive">{errors.vesselType}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacityLitres">Capacity (litres)</Label>
              <Input
                id="capacityLitres"
                name="capacityLitres"
                type="number"
                step="0.1"
                min="0.1"
                required
                defaultValue={
                  (values?.capacityLitres as string) ??
                  String(vessel.capacityLitres)
                }
              />
              {errors?.capacityLitres && (
                <p className="text-sm text-destructive">
                  {errors.capacityLitres}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                name="location"
                defaultValue={
                  (values?.location as string) ?? vessel.location ?? ""
                }
                placeholder="e.g. Brew hall, Bay 3"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                defaultValue={
                  (values?.notes as string) ?? vessel.notes ?? ""
                }
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit">Save Changes</Button>
            </div>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
