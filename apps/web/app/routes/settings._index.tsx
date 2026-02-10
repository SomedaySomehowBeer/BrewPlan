import {
  Form,
  useLoaderData,
  useActionData,
  redirect,
} from "react-router";
import type { Route } from "./+types/settings._index";
import { requireUser } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { updateBreweryProfileSchema } from "@brewplan/shared";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Save } from "lucide-react";

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  const profile = queries.settings.getOrCreateProfile();
  return { profile };
}

export async function action({ request }: Route.ActionArgs) {
  await requireUser(request);

  const formData = await request.formData();
  const raw = {
    name: formData.get("name"),
    address: formData.get("address") || null,
    phone: formData.get("phone") || null,
    email: formData.get("email") || null,
    website: formData.get("website") || null,
    abn: formData.get("abn") || null,
    liquorLicenceNumber: formData.get("liquorLicenceNumber") || null,
    defaultCurrency: formData.get("defaultCurrency") || "AUD",
    defaultBatchPrefix: formData.get("defaultBatchPrefix") || "BP",
    defaultOrderPrefix: formData.get("defaultOrderPrefix") || "ORD",
    defaultPoPrefix: formData.get("defaultPoPrefix") || "PO",
    invoiceFooter: formData.get("invoiceFooter") || null,
  };

  const result = updateBreweryProfileSchema.safeParse(raw);
  if (!result.success) {
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0];
      if (key) errors[String(key)] = issue.message;
    }
    return { errors, values: raw };
  }

  queries.settings.updateProfile(result.data);
  return { success: true };
}

export default function SettingsIndex() {
  const { profile } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const errors = (actionData as { errors?: Record<string, string> })?.errors;
  const success = (actionData as { success?: boolean })?.success;

  return (
    <div className="space-y-6 max-w-2xl">
      {success && (
        <div className="rounded-md bg-green-50 dark:bg-green-950 p-3 text-sm text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
          Settings saved successfully.
        </div>
      )}

      <Form method="post" className="space-y-6">
        {/* Brewery Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Brewery Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">Brewery Name *</Label>
              <Input
                id="name"
                name="name"
                defaultValue={profile.name}
                className="min-h-[44px]"
              />
              {errors?.name && (
                <p className="text-xs text-destructive">{errors.name}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                name="address"
                rows={2}
                defaultValue={profile.address ?? ""}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  defaultValue={profile.phone ?? ""}
                  className="min-h-[44px]"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={profile.email ?? ""}
                  className="min-h-[44px]"
                />
                {errors?.email && (
                  <p className="text-xs text-destructive">{errors.email}</p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                name="website"
                defaultValue={profile.website ?? ""}
                className="min-h-[44px]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="abn">ABN</Label>
                <Input
                  id="abn"
                  name="abn"
                  defaultValue={profile.abn ?? ""}
                  className="min-h-[44px]"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="liquorLicenceNumber">Liquor Licence Number</Label>
                <Input
                  id="liquorLicenceNumber"
                  name="liquorLicenceNumber"
                  defaultValue={profile.liquorLicenceNumber ?? ""}
                  className="min-h-[44px]"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Number Prefixes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Number Prefixes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label htmlFor="defaultBatchPrefix">Batch Prefix</Label>
                <Input
                  id="defaultBatchPrefix"
                  name="defaultBatchPrefix"
                  defaultValue={profile.defaultBatchPrefix}
                  placeholder="BP"
                  className="min-h-[44px]"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="defaultOrderPrefix">Order Prefix</Label>
                <Input
                  id="defaultOrderPrefix"
                  name="defaultOrderPrefix"
                  defaultValue={profile.defaultOrderPrefix}
                  placeholder="ORD"
                  className="min-h-[44px]"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="defaultPoPrefix">PO Prefix</Label>
                <Input
                  id="defaultPoPrefix"
                  name="defaultPoPrefix"
                  defaultValue={profile.defaultPoPrefix}
                  placeholder="PO"
                  className="min-h-[44px]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="defaultCurrency">Currency</Label>
              <Input
                id="defaultCurrency"
                name="defaultCurrency"
                defaultValue={profile.defaultCurrency}
                placeholder="AUD"
                className="min-h-[44px] max-w-[120px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Invoice */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoice</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <Label htmlFor="invoiceFooter">Invoice Footer</Label>
              <Textarea
                id="invoiceFooter"
                name="invoiceFooter"
                rows={3}
                defaultValue={profile.invoiceFooter ?? ""}
                placeholder="Payment details, terms, etc."
              />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" size="lg" className="min-h-[56px] text-base">
          <Save className="mr-2 h-5 w-5" />
          Save Settings
        </Button>
      </Form>
    </div>
  );
}
