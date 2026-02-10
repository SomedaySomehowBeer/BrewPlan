import { useLoaderData, Link, useSearchParams } from "react-router";
import type { Route } from "./+types/batches._index";
import { requireUser } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { StatusBadge } from "~/components/shared/status-badge";
import { EmptyState } from "~/components/shared/empty-state";
import { Plus, Calendar, Download } from "lucide-react";
import { formatDate } from "~/lib/utils";

const ACTIVE_STATUSES = [
  "planned",
  "brewing",
  "fermenting",
  "conditioning",
  "ready_to_package",
];

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);

  const url = new URL(request.url);
  const filter = url.searchParams.get("filter") || "all";

  const allBatches = queries.batches.list();
  const vessels = queries.vessels.list();

  const vesselMap = new Map(vessels.map((v) => [v.id, v.name]));

  let filteredBatches = allBatches;
  if (filter === "active") {
    filteredBatches = allBatches.filter((b) =>
      ACTIVE_STATUSES.includes(b.status)
    );
  } else if (filter === "completed") {
    filteredBatches = allBatches.filter((b) =>
      ["completed", "packaged"].includes(b.status)
    );
  }

  const batches = filteredBatches.map((b) => ({
    ...b,
    vesselName: b.vesselId ? vesselMap.get(b.vesselId) ?? null : null,
  }));

  return { batches, filter, userRole: user.role };
}

export default function BatchesIndex() {
  const { batches, filter, userRole } = useLoaderData<typeof loader>();
  const [, setSearchParams] = useSearchParams();

  const filters = [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
    { value: "completed", label: "Completed" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          {filters.map((f) => (
            <Button
              key={f.value}
              variant={filter === f.value ? "default" : "outline"}
              size="sm"
              onClick={() => setSearchParams({ filter: f.value })}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href="/batches/export" download>
              <Download className="mr-2 h-4 w-4" />
              CSV
            </a>
          </Button>
          {userRole !== "viewer" && (
            <Button asChild>
              <Link to="/batches/new">
                <Plus className="mr-2 h-4 w-4" />
                New Batch
              </Link>
            </Button>
          )}
        </div>
      </div>

      {batches.length === 0 ? (
        <EmptyState
          title="No batches found"
          description="Create your first brew batch to get started."
          actionLabel="New Batch"
          actionTo="/batches/new"
        />
      ) : (
        <div className="space-y-3">
          {batches.map((batch) => (
            <Link
              key={batch.id}
              to={`/batches/${batch.id}`}
              className="block"
            >
              <Card className="hover:border-primary/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium">
                          {batch.batchNumber}
                        </span>
                        <StatusBadge status={batch.status} />
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {batch.recipeName}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {batch.plannedDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(batch.plannedDate)}
                          </span>
                        )}
                        {batch.vesselName && (
                          <span>{batch.vesselName}</span>
                        )}
                        {batch.brewer && (
                          <span>{batch.brewer}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      {batch.batchSizeLitres} L
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
