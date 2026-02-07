import { useLoaderData, Link } from "react-router";
import type { Route } from "./+types/planning.schedule";
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
import { StatusBadge } from "~/components/shared/status-badge";
import { formatDate } from "~/lib/utils";
import { Calendar, Container } from "lucide-react";

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);

  const schedule = queries.planning.getBrewSchedule();
  return { schedule };
}

export default function PlanningSchedule() {
  const { schedule } = useLoaderData<typeof loader>();

  const plannedBatches = schedule.filter((b) => b.status === "planned");
  const inProgressBatches = schedule.filter((b) => b.status !== "planned");

  return (
    <div className="space-y-6">
      {/* In-progress section */}
      {inProgressBatches.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">In Progress</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Mobile cards */}
            <div className="sm:hidden divide-y">
              {inProgressBatches.map((batch) => (
                <Link
                  key={batch.id}
                  to={`/batches/${batch.id}`}
                  className="block p-4 hover:bg-accent transition-colors min-h-[44px]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium text-sm">
                          {batch.batchNumber}
                        </span>
                        <StatusBadge status={batch.status} />
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {batch.recipeName}
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                        {batch.brewDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Brewed: {formatDate(batch.brewDate)}
                          </span>
                        )}
                        {batch.estimatedReadyDate && (
                          <span>
                            Est. ready: {formatDate(batch.estimatedReadyDate)}
                          </span>
                        )}
                        {batch.vesselName && (
                          <span className="flex items-center gap-1">
                            <Container className="h-3 w-3" />
                            {batch.vesselName}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground shrink-0">
                      {batch.batchSizeLitres} L
                    </span>
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
                    <TableHead>Status</TableHead>
                    <TableHead>Brew Date</TableHead>
                    <TableHead>Est. Ready</TableHead>
                    <TableHead>Vessel</TableHead>
                    <TableHead className="text-right">Size</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inProgressBatches.map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell>
                        <Link
                          to={`/batches/${batch.id}`}
                          className="font-mono font-medium text-primary hover:underline"
                        >
                          {batch.batchNumber}
                        </Link>
                      </TableCell>
                      <TableCell>{batch.recipeName}</TableCell>
                      <TableCell>
                        <StatusBadge status={batch.status} />
                      </TableCell>
                      <TableCell>
                        {batch.brewDate ? formatDate(batch.brewDate) : "—"}
                      </TableCell>
                      <TableCell>
                        {batch.estimatedReadyDate
                          ? formatDate(batch.estimatedReadyDate)
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {batch.vesselName ?? (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {batch.batchSizeLitres} L
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Planned section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Planned ({plannedBatches.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {plannedBatches.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No planned batches. Create a batch to see it here.
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="sm:hidden divide-y">
                {plannedBatches.map((batch) => (
                  <Link
                    key={batch.id}
                    to={`/batches/${batch.id}`}
                    className="block p-4 hover:bg-accent transition-colors min-h-[44px]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium text-sm">
                            {batch.batchNumber}
                          </span>
                          <StatusBadge status={batch.status} />
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {batch.recipeName}
                          {batch.recipeStyle && (
                            <span className="ml-1">({batch.recipeStyle})</span>
                          )}
                        </p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                          {batch.plannedDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(batch.plannedDate)}
                            </span>
                          )}
                          {batch.estimatedReadyDate && (
                            <span>
                              Est. ready:{" "}
                              {formatDate(batch.estimatedReadyDate)}
                            </span>
                          )}
                          {batch.vesselName && (
                            <span className="flex items-center gap-1">
                              <Container className="h-3 w-3" />
                              {batch.vesselName}
                            </span>
                          )}
                          {batch.brewer && <span>{batch.brewer}</span>}
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground shrink-0">
                        {batch.batchSizeLitres} L
                      </span>
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
                      <TableHead>Planned Date</TableHead>
                      <TableHead>Est. Ready</TableHead>
                      <TableHead>Vessel</TableHead>
                      <TableHead>Brewer</TableHead>
                      <TableHead className="text-right">Size</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plannedBatches.map((batch) => (
                      <TableRow key={batch.id}>
                        <TableCell>
                          <Link
                            to={`/batches/${batch.id}`}
                            className="font-mono font-medium text-primary hover:underline"
                          >
                            {batch.batchNumber}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {batch.recipeName}
                          {batch.recipeStyle && (
                            <span className="ml-1 text-muted-foreground text-xs">
                              ({batch.recipeStyle})
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {batch.plannedDate
                            ? formatDate(batch.plannedDate)
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {batch.estimatedReadyDate
                            ? formatDate(batch.estimatedReadyDate)
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {batch.vesselName ?? (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {batch.brewer ?? (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {batch.batchSizeLitres} L
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {schedule.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground text-sm">
            No batches on the schedule.
          </p>
          <Link
            to="/batches/new"
            className="text-sm text-primary underline mt-2 inline-block"
          >
            Create a new batch
          </Link>
        </div>
      )}
    </div>
  );
}
