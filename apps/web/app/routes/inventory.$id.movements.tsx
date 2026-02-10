import {
  Form,
  useLoaderData,
  useActionData,
  useNavigation,
} from "react-router";
import type { Route } from "./+types/inventory.$id.movements";
import { requireUser, requireMutationAccess } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { recordMovementSchema } from "@brewplan/shared";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "~/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { Plus } from "lucide-react";

const movementTypeLabels: Record<string, string> = {
  received: "Received",
  consumed: "Consumed",
  adjusted: "Adjusted",
  transferred: "Transferred",
  returned: "Returned",
  written_off: "Written Off",
};

const movementTypeColors: Record<
  string,
  "default" | "secondary" | "destructive" | "outline" | "success" | "warning"
> = {
  received: "success",
  consumed: "warning",
  adjusted: "secondary",
  transferred: "outline",
  returned: "default",
  written_off: "destructive",
};

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireUser(request);

  const item = queries.inventory.get(params.id);
  if (!item) {
    throw new Response("Inventory item not found", { status: 404 });
  }

  const lots = queries.inventory.getLots(params.id);
  const movements = queries.inventory.getMovements(params.id);

  return { item, lots, movements };
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await requireMutationAccess(request);

  const formData = await request.formData();
  const raw = Object.fromEntries(formData);

  // Convert empty strings to null
  const cleaned = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [
      key,
      value === "" ? null : value,
    ])
  );

  // Add the performing user
  cleaned.performedBy = user.id;

  const result = recordMovementSchema.safeParse(cleaned);
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors };
  }

  queries.inventory.recordMovement(result.data);
  return { ok: true };
}

export default function InventoryMovements() {
  const { item, lots, movements } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const errors = actionData && "errors" in actionData ? actionData.errors : undefined;

  // Build a map of lot IDs to lot numbers for display
  const lotMap = new Map(lots.map((l) => [l.id, l.lotNumber]));

  return (
    <div className="space-y-6">
      {/* Movement Log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Movement History ({movements.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No movements recorded yet.
            </p>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="space-y-2 sm:hidden">
                {movements.map((mov) => (
                  <div
                    key={mov.id}
                    className="rounded-md border p-3 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <Badge
                        variant={
                          movementTypeColors[mov.movementType] ?? "outline"
                        }
                        className="text-xs"
                      >
                        {movementTypeLabels[mov.movementType] ??
                          mov.movementType}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(mov.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>
                        Lot: {lotMap.get(mov.inventoryLotId) ?? "Unknown"}
                      </span>
                      <span
                        className={`font-medium ${
                          mov.quantity > 0
                            ? "text-green-600"
                            : "text-destructive"
                        }`}
                      >
                        {mov.quantity > 0 ? "+" : ""}
                        {mov.quantity} {item.unit}
                      </span>
                    </div>
                    {mov.reason && (
                      <p className="text-xs text-muted-foreground">
                        {mov.reason}
                      </p>
                    )}
                    {mov.performedBy && (
                      <p className="text-xs text-muted-foreground">
                        By: {mov.performedBy}
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
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Lot</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((mov) => (
                      <TableRow key={mov.id}>
                        <TableCell>
                          {new Date(mov.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              movementTypeColors[mov.movementType] ?? "outline"
                            }
                          >
                            {movementTypeLabels[mov.movementType] ??
                              mov.movementType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {lotMap.get(mov.inventoryLotId) ?? "Unknown"}
                        </TableCell>
                        <TableCell
                          className={`text-right font-medium ${
                            mov.quantity > 0
                              ? "text-green-600"
                              : "text-destructive"
                          }`}
                        >
                          {mov.quantity > 0 ? "+" : ""}
                          {mov.quantity} {item.unit}
                        </TableCell>
                        <TableCell>{mov.reason ?? "--"}</TableCell>
                        <TableCell>{mov.performedBy ?? "--"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Record Adjustment Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Record Manual Adjustment</CardTitle>
        </CardHeader>
        <CardContent>
          {lots.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You need to add a lot before recording movements. Go to the Lots
              tab to add one.
            </p>
          ) : (
            <Form method="post" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="inventoryLotId">Lot</Label>
                <Select name="inventoryLotId">
                  <SelectTrigger id="inventoryLotId">
                    <SelectValue placeholder="Select a lot" />
                  </SelectTrigger>
                  <SelectContent>
                    {lots.map((lot) => (
                      <SelectItem key={lot.id} value={lot.id}>
                        {lot.lotNumber} ({lot.quantityOnHand} {lot.unit} on
                        hand)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors?.inventoryLotId && (
                  <p className="text-sm text-destructive">
                    {errors.inventoryLotId[0]}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="movementType">Type</Label>
                  <Select name="movementType" defaultValue="adjusted">
                    <SelectTrigger id="movementType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="received">Received</SelectItem>
                      <SelectItem value="consumed">Consumed</SelectItem>
                      <SelectItem value="adjusted">Adjusted</SelectItem>
                      <SelectItem value="transferred">Transferred</SelectItem>
                      <SelectItem value="returned">Returned</SelectItem>
                      <SelectItem value="written_off">Written Off</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors?.movementType && (
                    <p className="text-sm text-destructive">
                      {errors.movementType[0]}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">
                    Quantity (+ adds, - removes)
                  </Label>
                  <Input
                    id="quantity"
                    name="quantity"
                    type="number"
                    step="0.01"
                    required
                  />
                  {errors?.quantity && (
                    <p className="text-sm text-destructive">
                      {errors.quantity[0]}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  name="reason"
                  placeholder="Reason for adjustment"
                />
                {errors?.reason && (
                  <p className="text-sm text-destructive">
                    {errors.reason[0]}
                  </p>
                )}
              </div>

              <Button type="submit" disabled={isSubmitting}>
                <Plus className="mr-2 h-4 w-4" />
                Record Movement
              </Button>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
