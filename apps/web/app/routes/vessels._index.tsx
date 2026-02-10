import { useLoaderData, Link } from "react-router";
import type { Route } from "./+types/vessels._index";
import { requireUser } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { StatusBadge } from "~/components/shared/status-badge";
import { EmptyState } from "~/components/shared/empty-state";
import { Plus, Container } from "lucide-react";

const vesselTypeLabels: Record<string, string> = {
  fermenter: "Fermenter",
  brite: "Brite Tank",
  kettle: "Kettle",
  hot_liquor_tank: "HLT",
  mash_tun: "Mash Tun",
  other: "Other",
};

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const vessels = queries.vessels.list({ archived: false });
  return { vessels, userRole: user.role };
}

export default function VesselsIndex() {
  const { vessels, userRole } = useLoaderData<typeof loader>();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        {userRole !== "viewer" && (
          <Button asChild>
            <Link to="/vessels/new">
              <Plus className="mr-2 h-4 w-4" />
              New Vessel
            </Link>
          </Button>
        )}
      </div>

      {vessels.length === 0 ? (
        <EmptyState
          title="No vessels"
          description="Add your first brewing vessel to get started."
          actionLabel="New Vessel"
          actionTo="/vessels/new"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vessels.map((vessel) => (
            <Link key={vessel.id} to={`/vessels/${vessel.id}`}>
              <Card className="hover:border-primary/50 transition-colors h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{vessel.name}</CardTitle>
                    <StatusBadge status={vessel.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Container className="h-4 w-4" />
                    <span>
                      {vesselTypeLabels[vessel.vesselType] ?? vessel.vesselType}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">
                      {vessel.capacityLitres} L
                    </span>
                    <span className="text-muted-foreground"> capacity</span>
                  </div>
                  {vessel.currentBatchNumber && (
                    <div className="rounded-md bg-amber-500/10 px-2 py-1.5 text-sm">
                      <span className="text-amber-700 dark:text-amber-400 font-mono">
                        {vessel.currentBatchNumber}
                      </span>
                      {vessel.currentBatchStatus && (
                        <span className="ml-1.5">
                          <StatusBadge status={vessel.currentBatchStatus} />
                        </span>
                      )}
                    </div>
                  )}
                  {vessel.location && (
                    <p className="text-xs text-muted-foreground">
                      {vessel.location}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
