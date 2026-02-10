import { Form, useActionData, redirect } from "react-router";
import type { Route } from "./+types/vessels.new";
import { requireUser, requireMutationAccess } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { createVesselSchema } from "@brewplan/shared";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

const vesselTypes = [
  { value: "fermenter", label: "Fermenter" },
  { value: "brite", label: "Brite Tank" },
  { value: "kettle", label: "Kettle" },
  { value: "hot_liquor_tank", label: "Hot Liquor Tank" },
  { value: "mash_tun", label: "Mash Tun" },
  { value: "other", label: "Other" },
];

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  return {};
}

export async function action({ request }: Route.ActionArgs) {
  await requireMutationAccess(request);

  const formData = await request.formData();
  const raw = {
    name: formData.get("name"),
    vesselType: formData.get("vesselType"),
    capacityLitres: formData.get("capacityLitres"),
    location: formData.get("location") || null,
    notes: formData.get("notes") || null,
  };

  const result = createVesselSchema.safeParse(raw);
  if (!result.success) {
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0];
      if (key) errors[String(key)] = issue.message;
    }
    return { errors, values: raw };
  }

  const vessel = queries.vessels.create(result.data);
  return redirect(`/vessels/${vessel.id}`);
}

export default function NewVessel() {
  const actionData = useActionData<typeof action>();
  const errors = actionData?.errors;
  const values = actionData?.values;

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Vessel</CardTitle>
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
              defaultValue={(values?.name as string) ?? ""}
              placeholder="e.g. Fermenter #1"
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
              defaultValue={(values?.vesselType as string) ?? "fermenter"}
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
              defaultValue={(values?.capacityLitres as string) ?? ""}
              placeholder="e.g. 500"
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
              defaultValue={(values?.location as string) ?? ""}
              placeholder="e.g. Brew hall, Bay 3"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              defaultValue={(values?.notes as string) ?? ""}
              placeholder="Any notes about this vessel..."
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit">Create Vessel</Button>
            <Button variant="outline" type="button" asChild>
              <a href="/vessels">Cancel</a>
            </Button>
          </div>
        </Form>
      </CardContent>
    </Card>
  );
}
