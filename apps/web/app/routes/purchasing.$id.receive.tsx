import { Form, useLoaderData, useActionData, redirect, useNavigation } from "react-router";
import type { Route } from "./+types/purchasing.$id.receive";
import { requireUser } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { receivePoLineSchema } from "@brewplan/shared";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { formatNumber } from "~/lib/utils";
import { PackageCheck } from "lucide-react";

const RECEIVABLE_STATUSES = ["sent", "acknowledged", "partially_received"];

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireUser(request);

  const po = queries.purchasing.getWithLines(params.id);
  if (!po) {
    throw new Response("Purchase order not found", { status: 404 });
  }

  if (!RECEIVABLE_STATUSES.includes(po.status)) {
    return redirect(`/purchasing/${params.id}`);
  }

  const receivableLines = po.lines.filter(
    (line) => line.quantityOrdered > line.quantityReceived
  );

  return { po, receivableLines };
}

export async function action({ request, params }: Route.ActionArgs) {
  await requireUser(request);

  const formData = await request.formData();
  const raw = {
    purchaseOrderLineId: formData.get("purchaseOrderLineId"),
    quantityReceived: formData.get("quantityReceived"),
    lotNumber: formData.get("lotNumber"),
    location: formData.get("location") || null,
    notes: formData.get("notes") || null,
  };

  const result = receivePoLineSchema.safeParse(raw);
  if (!result.success) {
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0];
      if (key) errors[String(key)] = issue.message;
    }
    return {
      errors,
      lineId: raw.purchaseOrderLineId as string,
    };
  }

  try {
    queries.purchasing.receiveLine(result.data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to receive line";
    return redirect(
      `/purchasing/${params.id}?error=${encodeURIComponent(message)}`
    );
  }

  return redirect(`/purchasing/${params.id}/receive`);
}

export default function ReceivePurchaseOrder() {
  const { po, receivableLines } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Receive Items - {po.poNumber}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {receivableLines.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              All lines have been fully received.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {receivableLines.length} line(s) with remaining quantities to
              receive.
            </p>
          )}
        </CardContent>
      </Card>

      {receivableLines.map((line) => {
        const remaining = line.quantityOrdered - line.quantityReceived;
        const lineErrors =
          actionData?.lineId === line.id ? actionData?.errors : undefined;

        return (
          <Card key={line.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {line.inventoryItemName}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                <span>
                  Ordered: {line.quantityOrdered} {line.unit}
                </span>
                <span>
                  Received: {line.quantityReceived} {line.unit}
                </span>
                <span className="font-medium text-foreground">
                  Remaining: {formatNumber(remaining, 2)} {line.unit}
                </span>
              </div>

              <Form method="post" className="space-y-4">
                <input
                  type="hidden"
                  name="purchaseOrderLineId"
                  value={line.id}
                />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`qty-${line.id}`}>Quantity Received</Label>
                    <Input
                      id={`qty-${line.id}`}
                      name="quantityReceived"
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={remaining}
                      defaultValue={remaining}
                      required
                    />
                    {lineErrors?.quantityReceived && (
                      <p className="text-sm text-destructive">
                        {lineErrors.quantityReceived}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`lot-${line.id}`}>Lot Number</Label>
                    <Input
                      id={`lot-${line.id}`}
                      name="lotNumber"
                      required
                      placeholder="e.g. LOT-2026-001"
                    />
                    {lineErrors?.lotNumber && (
                      <p className="text-sm text-destructive">
                        {lineErrors.lotNumber}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`location-${line.id}`}>Storage Location</Label>
                  <Input
                    id={`location-${line.id}`}
                    name="location"
                    placeholder="e.g. Cold Store A"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`notes-${line.id}`}>Notes</Label>
                  <Textarea
                    id={`notes-${line.id}`}
                    name="notes"
                    placeholder="Optional receiving notes"
                    rows={2}
                  />
                </div>

                <Button type="submit" disabled={isSubmitting}>
                  <PackageCheck className="mr-2 h-4 w-4" />
                  Receive
                </Button>
              </Form>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
