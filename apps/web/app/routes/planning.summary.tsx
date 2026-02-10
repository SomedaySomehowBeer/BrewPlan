import { useLoaderData, Form, useNavigation } from "react-router";
import type { Route } from "./+types/planning.summary";
import { requireUser } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "~/components/ui/table";
import { BarChart3, Beaker, FlaskConical, Timer } from "lucide-react";

function defaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return {
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
  };
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);

  const url = new URL(request.url);
  const defaults = defaultDateRange();
  const startDate = url.searchParams.get("startDate") ?? defaults.startDate;
  const endDate = url.searchParams.get("endDate") ?? defaults.endDate;

  const summary = queries.reporting.getProductionSummary(startDate, endDate);

  return { summary, startDate, endDate };
}

export default function ProductionSummary() {
  const { summary, startDate, endDate } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isLoading = navigation.state === "loading";

  return (
    <div className="space-y-6">
      {/* Date range filter */}
      <Card>
        <CardContent className="pt-6">
          <Form method="get" className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 space-y-1">
              <Label htmlFor="startDate">From</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                defaultValue={startDate}
                className="min-h-[44px]"
              />
            </div>
            <div className="flex-1 space-y-1">
              <Label htmlFor="endDate">To</Label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                defaultValue={endDate}
                className="min-h-[44px]"
              />
            </div>
            <Button
              type="submit"
              className="min-h-[44px]"
              disabled={isLoading}
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Update
            </Button>
          </Form>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <FlaskConical className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Batches Completed</p>
                <p className="text-2xl font-bold">{summary.batchesCompleted}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Beaker className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Volume</p>
                <p className="text-2xl font-bold">{summary.totalVolumeLitres} L</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Batch Size</p>
                <p className="text-2xl font-bold">{summary.avgBatchSizeLitres} L</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Timer className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">{summary.batchesInProgress}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vessel Utilisation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vessel Utilisation</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {summary.vesselUtilisation.length > 0 ? (
            <>
              {/* Mobile cards */}
              <div className="sm:hidden divide-y">
                {summary.vesselUtilisation.map((v) => (
                  <div key={v.vesselId} className="p-4 flex items-center justify-between">
                    <span className="font-medium text-sm">{v.vesselName}</span>
                    <span className="text-sm text-muted-foreground">
                      {v.batchCount} {v.batchCount === 1 ? "batch" : "batches"}
                    </span>
                  </div>
                ))}
              </div>
              {/* Desktop table */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vessel</TableHead>
                      <TableHead>Batches in Period</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.vesselUtilisation.map((v) => (
                      <TableRow key={v.vesselId}>
                        <TableCell className="font-medium">{v.vesselName}</TableCell>
                        <TableCell>{v.batchCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No vessels configured.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
