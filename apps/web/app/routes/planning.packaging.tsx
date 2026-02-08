import { useLoaderData, Link } from "react-router";
import type { Route } from "./+types/planning.packaging";
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
import { formatDate } from "~/lib/utils";
import { Container, Calendar, ShoppingCart } from "lucide-react";

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);

  const batches = queries.planning.getPackagingPriority();
  return { batches };
}

export default function PlanningPackaging() {
  const { batches } = useLoaderData<typeof loader>();

  if (batches.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No batches ready to package.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Ready to Package ({batches.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile cards */}
          <div className="sm:hidden divide-y">
            {batches.map((batch) => (
              <Link
                key={batch.id}
                to={`/batches/${batch.id}/packaging`}
                className="block p-4 hover:bg-accent transition-colors min-h-[44px]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium text-sm">
                        {batch.batchNumber}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {batch.recipeName}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                      <span>
                        {batch.actualVolumeLitres ?? batch.batchSizeLitres} L
                      </span>
                      <span>{batch.daysInTank} days in tank</span>
                      {batch.vesselName && (
                        <span className="flex items-center gap-1">
                          <Container className="h-3 w-3" />
                          {batch.vesselName}
                        </span>
                      )}
                    </div>
                  </div>
                  {batch.orderDemand > 0 && (
                    <div className="text-right text-xs">
                      <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                        <ShoppingCart className="h-3 w-3" />
                        {batch.orderDemand} units needed
                      </div>
                      {batch.earliestDelivery && (
                        <span className="text-muted-foreground">
                          by {formatDate(batch.earliestDelivery)}
                        </span>
                      )}
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
                  <TableHead>Batch</TableHead>
                  <TableHead>Recipe</TableHead>
                  <TableHead className="text-right">Volume</TableHead>
                  <TableHead className="text-right">Days in Tank</TableHead>
                  <TableHead>Vessel</TableHead>
                  <TableHead className="text-right">Order Demand</TableHead>
                  <TableHead>Earliest Delivery</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell>
                      <Link
                        to={`/batches/${batch.id}/packaging`}
                        className="font-mono font-medium text-primary hover:underline"
                      >
                        {batch.batchNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{batch.recipeName}</TableCell>
                    <TableCell className="text-right">
                      {batch.actualVolumeLitres ?? batch.batchSizeLitres} L
                    </TableCell>
                    <TableCell className="text-right">
                      {batch.daysInTank}
                    </TableCell>
                    <TableCell>
                      {batch.vesselName ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {batch.orderDemand > 0 ? (
                        <span className="font-medium text-amber-600 dark:text-amber-400">
                          {batch.orderDemand}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {batch.earliestDelivery
                        ? formatDate(batch.earliestDelivery)
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
