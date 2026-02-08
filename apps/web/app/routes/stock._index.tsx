import { useLoaderData, Link } from "react-router";
import type { Route } from "./+types/stock._index";
import { requireUser } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "~/components/ui/table";
import { formatDate, formatNumber } from "~/lib/utils";

const FORMAT_LABELS: Record<string, string> = {
  keg_50l: "50L Keg",
  keg_30l: "30L Keg",
  keg_20l: "20L Keg",
  can_375ml: "375ml Can",
  can_355ml: "355ml Can",
  bottle_330ml: "330ml Bottle",
  bottle_500ml: "500ml Bottle",
  other: "Other",
};

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);

  const finishedGoods = queries.packaging.listFinishedGoods();

  return { finishedGoods };
}

export default function StockIndex() {
  const { finishedGoods } = useLoaderData<typeof loader>();

  if (finishedGoods.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No finished goods in stock. Package a batch to create stock entries.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          Stock ({finishedGoods.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Mobile cards */}
        <div className="sm:hidden divide-y">
          {finishedGoods.map((fg) => (
            <Link
              key={fg.id}
              to={`/stock/${fg.id}`}
              className="block p-4 space-y-2 min-h-[44px] hover:bg-muted/50"
            >
              <div className="flex items-start justify-between">
                <span className="font-medium text-sm">
                  {fg.productName}
                </span>
                <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded">
                  {fg.quantityAvailable} avail
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {fg.recipeName} &middot;{" "}
                <span className="font-mono">{fg.batchNumber}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Format: </span>
                  {FORMAT_LABELS[fg.format] ?? fg.format}
                </div>
                <div>
                  <span className="text-muted-foreground">On Hand: </span>
                  {fg.quantityOnHand}
                </div>
                <div>
                  <span className="text-muted-foreground">Reserved: </span>
                  {fg.quantityReserved}
                </div>
                {fg.unitPrice != null && (
                  <div>
                    <span className="text-muted-foreground">Price: </span>$
                    {formatNumber(fg.unitPrice, 2)}
                  </div>
                )}
                {fg.location && (
                  <div>
                    <span className="text-muted-foreground">Location: </span>
                    {fg.location}
                  </div>
                )}
                {fg.bestBeforeDate && (
                  <div>
                    <span className="text-muted-foreground">BB: </span>
                    {formatDate(fg.bestBeforeDate)}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Recipe</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Format</TableHead>
                <TableHead className="text-right">On Hand</TableHead>
                <TableHead className="text-right">Reserved</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Best Before</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {finishedGoods.map((fg) => (
                <TableRow key={fg.id}>
                  <TableCell>
                    <Link
                      to={`/stock/${fg.id}`}
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {fg.productName}
                    </Link>
                  </TableCell>
                  <TableCell>{fg.recipeName}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {fg.batchNumber}
                  </TableCell>
                  <TableCell>
                    {FORMAT_LABELS[fg.format] ?? fg.format}
                  </TableCell>
                  <TableCell className="text-right">
                    {fg.quantityOnHand}
                  </TableCell>
                  <TableCell className="text-right">
                    {fg.quantityReserved}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {fg.quantityAvailable}
                  </TableCell>
                  <TableCell className="text-right">
                    {fg.unitPrice != null
                      ? `$${formatNumber(fg.unitPrice, 2)}`
                      : "—"}
                  </TableCell>
                  <TableCell>{fg.location ?? "—"}</TableCell>
                  <TableCell>
                    {fg.bestBeforeDate ? formatDate(fg.bestBeforeDate) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
