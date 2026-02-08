import { Form, useLoaderData, useActionData, redirect } from "react-router";
import type { Route } from "./+types/orders.$id.pick";
import { requireUser } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { formatNumber } from "~/lib/utils";

const formatLabels: Record<string, string> = {
  keg_50l: "Keg 50L",
  keg_30l: "Keg 30L",
  keg_20l: "Keg 20L",
  can_375ml: "Can 375ml",
  can_355ml: "Can 355ml",
  bottle_330ml: "Bottle 330ml",
  bottle_500ml: "Bottle 500ml",
  other: "Other",
};

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireUser(request);

  const order = queries.orders.getWithLines(params.id);
  if (!order) {
    throw new Response("Order not found", { status: 404 });
  }

  if (order.status !== "picking") {
    return redirect(`/orders/${params.id}`);
  }

  // Get available FG stock for each line
  const finishedGoods = queries.packaging.listFinishedGoods();
  const linesWithStock = order.lines.map((line) => {
    const availableStock = finishedGoods.filter(
      (fg) => fg.recipeId === line.recipeId && fg.format === line.format && fg.quantityAvailable > 0
    );
    return { ...line, availableStock };
  });

  return { order, linesWithStock };
}

export async function action({ request, params }: Route.ActionArgs) {
  await requireUser(request);

  const formData = await request.formData();

  const order = queries.orders.getWithLines(params.id);
  if (!order || order.status !== "picking") {
    return redirect(`/orders/${params.id}`);
  }

  // Process each line's FG assignment
  for (const line of order.lines) {
    const fgId = formData.get(`fg_${line.id}`);
    if (typeof fgId === "string" && fgId) {
      queries.orders.updateLine(line.id, { finishedGoodsId: fgId });
    }
  }

  return redirect(`/orders/${params.id}`);
}

export default function OrderPick() {
  const { order, linesWithStock } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pick Order Lines</CardTitle>
      </CardHeader>
      <CardContent>
        <Form method="post" className="space-y-6">
          {linesWithStock.map((line) => (
            <div key={line.id} className="space-y-2 border-b pb-4 last:border-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-sm">
                    {line.recipeName ?? line.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatLabels[line.format] ?? line.format} — Qty needed: {line.quantity}
                  </p>
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor={`fg_${line.id}`}>Select Stock</Label>
                <select
                  id={`fg_${line.id}`}
                  name={`fg_${line.id}`}
                  defaultValue={line.finishedGoodsId ?? ""}
                  className="flex h-11 w-full items-center rounded-md border border-input bg-card px-3 py-2 text-base ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">No stock assigned</option>
                  {line.availableStock.map((fg) => (
                    <option key={fg.id} value={fg.id}>
                      {fg.productName} — Batch {fg.batchNumber ?? "N/A"} — {fg.quantityAvailable} available
                    </option>
                  ))}
                </select>
                {line.availableStock.length === 0 && (
                  <p className="text-xs text-destructive">
                    No matching stock available for this recipe and format.
                  </p>
                )}
              </div>
            </div>
          ))}

          <Button type="submit" size="lg" className="min-h-[56px] text-base px-6">
            Save Picks
          </Button>
        </Form>
      </CardContent>
    </Card>
  );
}
