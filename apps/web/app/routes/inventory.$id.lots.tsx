import {
  Form,
  useLoaderData,
  useActionData,
  useNavigation,
} from "react-router";
import type { Route } from "./+types/inventory.$id.lots";
import { requireUser } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { createInventoryLotSchema } from "@brewplan/shared";
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
import { UnitDisplay } from "~/components/shared/unit-display";
import { Badge } from "~/components/ui/badge";
import { Plus } from "lucide-react";

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireUser(request);

  const item = queries.inventory.get(params.id);
  if (!item) {
    throw new Response("Inventory item not found", { status: 404 });
  }

  const lots = queries.inventory.getLots(params.id);

  return { item, lots };
}

export async function action({ request, params }: Route.ActionArgs) {
  const userId = await requireUser(request);

  const formData = await request.formData();
  const raw = Object.fromEntries(formData);

  // Convert empty strings to null
  const cleaned = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [
      key,
      value === "" ? null : value,
    ])
  );

  // Always set the inventory item ID from the route param
  cleaned.inventoryItemId = params.id;

  const result = createInventoryLotSchema.safeParse(cleaned);
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors };
  }

  queries.inventory.createLot({
    ...result.data,
    performedBy: userId,
  });

  return { ok: true };
}

export default function InventoryLots() {
  const { item, lots } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const errors = actionData && "errors" in actionData ? actionData.errors : undefined;

  return (
    <div className="space-y-6">
      {/* Lots List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Lots ({lots.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lots.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No lots recorded yet. Use the form below to add a lot.
            </p>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="space-y-2 sm:hidden">
                {lots.map((lot) => {
                  const isExpired =
                    lot.expiryDate &&
                    new Date(lot.expiryDate) < new Date();
                  return (
                    <div
                      key={lot.id}
                      className="rounded-md border p-3 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {lot.lotNumber}
                        </span>
                        {isExpired && (
                          <Badge variant="destructive" className="text-xs">
                            Expired
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div>
                          <span className="uppercase">Qty: </span>
                          <UnitDisplay
                            value={lot.quantityOnHand}
                            unit={lot.unit}
                          />
                        </div>
                        <div>
                          <span className="uppercase">Cost: </span>$
                          {Number(lot.unitCost).toFixed(2)}/{lot.unit}
                        </div>
                        <div>
                          <span className="uppercase">Received: </span>
                          {lot.receivedDate}
                        </div>
                        {lot.expiryDate && (
                          <div>
                            <span className="uppercase">Expires: </span>
                            {lot.expiryDate}
                          </div>
                        )}
                      </div>
                      {lot.location && (
                        <p className="text-xs text-muted-foreground">
                          Location: {lot.location}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lot Number</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead>Received</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead>Location</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lots.map((lot) => {
                      const isExpired =
                        lot.expiryDate &&
                        new Date(lot.expiryDate) < new Date();
                      return (
                        <TableRow key={lot.id}>
                          <TableCell className="font-medium">
                            {lot.lotNumber}
                          </TableCell>
                          <TableCell className="text-right">
                            <UnitDisplay
                              value={lot.quantityOnHand}
                              unit={lot.unit}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            ${Number(lot.unitCost).toFixed(2)}
                          </TableCell>
                          <TableCell>{lot.receivedDate}</TableCell>
                          <TableCell>
                            {lot.expiryDate ? (
                              <span
                                className={
                                  isExpired ? "text-destructive" : ""
                                }
                              >
                                {lot.expiryDate}
                              </span>
                            ) : (
                              "--"
                            )}
                          </TableCell>
                          <TableCell>{lot.location ?? "--"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Add Lot Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add New Lot</CardTitle>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lotNumber">Lot Number</Label>
                <Input id="lotNumber" name="lotNumber" required />
                {errors?.lotNumber && (
                  <p className="text-sm text-destructive">
                    {errors.lotNumber[0]}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="receivedDate">Received Date</Label>
                <Input
                  id="receivedDate"
                  name="receivedDate"
                  type="date"
                  defaultValue={new Date().toISOString().split("T")[0]}
                  required
                />
                {errors?.receivedDate && (
                  <p className="text-sm text-destructive">
                    {errors.receivedDate[0]}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantityOnHand">Quantity</Label>
                <Input
                  id="quantityOnHand"
                  name="quantityOnHand"
                  type="number"
                  step="0.01"
                  required
                />
                {errors?.quantityOnHand && (
                  <p className="text-sm text-destructive">
                    {errors.quantityOnHand[0]}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Select name="unit" defaultValue={item.unit}>
                  <SelectTrigger id="unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="g">g</SelectItem>
                    <SelectItem value="ml">ml</SelectItem>
                    <SelectItem value="l">L</SelectItem>
                    <SelectItem value="each">each</SelectItem>
                  </SelectContent>
                </Select>
                {errors?.unit && (
                  <p className="text-sm text-destructive">{errors.unit[0]}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="unitCost">Unit Cost ($)</Label>
                <Input
                  id="unitCost"
                  name="unitCost"
                  type="number"
                  step="0.01"
                  defaultValue={item.unitCost}
                  required
                />
                {errors?.unitCost && (
                  <p className="text-sm text-destructive">
                    {errors.unitCost[0]}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiryDate">Expiry Date</Label>
                <Input id="expiryDate" name="expiryDate" type="date" />
                {errors?.expiryDate && (
                  <p className="text-sm text-destructive">
                    {errors.expiryDate[0]}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  name="location"
                  placeholder="e.g. Cold Store A"
                />
                {errors?.location && (
                  <p className="text-sm text-destructive">
                    {errors.location[0]}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Optional lot notes"
              />
              {errors?.notes && (
                <p className="text-sm text-destructive">{errors.notes[0]}</p>
              )}
            </div>

            <Button type="submit" disabled={isSubmitting}>
              <Plus className="mr-2 h-4 w-4" />
              Add Lot
            </Button>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
