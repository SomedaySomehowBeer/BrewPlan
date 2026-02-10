import { useLoaderData, Link } from "react-router";
import type { Route } from "./+types/_index";
import { requireUser } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { StatusBadge } from "~/components/shared/status-badge";
import { ClipboardList, Package, Beer, Container } from "lucide-react";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);

  const [recipes, batches, vessels, inventoryItems] = await Promise.all([
    queries.recipes.list(),
    queries.batches.list(),
    queries.vessels.list(),
    queries.inventory.list(),
  ]);

  const activeRecipes = recipes.filter((r) => r.status === "active").length;
  const activeBatches = batches.filter(
    (b) => !["completed", "cancelled", "dumped"].includes(b.status)
  ).length;
  const availableVessels = vessels.filter(
    (v) => v.status === "available"
  ).length;
  const lowStockItems = inventoryItems.filter(
    (i) => i.reorderPoint && i.quantityOnHand < i.reorderPoint
  ).length;

  const recentBatches = batches
    .filter((b) => !["completed", "cancelled", "dumped"].includes(b.status))
    .slice(0, 5);

  return {
    stats: {
      activeRecipes,
      activeBatches,
      totalVessels: vessels.length,
      availableVessels,
      lowStockItems,
    },
    recentBatches,
    userRole: user.role,
  };
}

export default function Dashboard() {
  const { stats, recentBatches, userRole } = useLoaderData<typeof loader>();

  const statCards = [
    {
      label: "Active Recipes",
      value: stats.activeRecipes,
      icon: ClipboardList,
      to: "/recipes",
    },
    {
      label: "Active Batches",
      value: stats.activeBatches,
      icon: Beer,
      to: "/batches",
    },
    {
      label: "Vessels Available",
      value: `${stats.availableVessels}/${stats.totalVessels}`,
      icon: Container,
      to: "/vessels",
    },
    {
      label: "Low Stock Items",
      value: stats.lowStockItems,
      icon: Package,
      to: "/inventory",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Brewery overview</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Link key={stat.label} to={stat.to}>
            <Card className="hover:border-primary/50 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Batches</CardTitle>
        </CardHeader>
        <CardContent>
          {recentBatches.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active batches.</p>
          ) : (
            <div className="space-y-3">
              {recentBatches.map((batch) => (
                <Link
                  key={batch.id}
                  to={`/batches/${batch.id}`}
                  className="flex items-center justify-between rounded-md border border-border p-3 min-h-[44px] hover:bg-accent transition-colors"
                >
                  <div>
                    <span className="font-medium">{batch.batchNumber}</span>
                    <span className="ml-2 text-sm text-muted-foreground">
                      {batch.recipeName}
                    </span>
                  </div>
                  <StatusBadge status={batch.status} />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {userRole !== "viewer" && (
        <div className="flex gap-3">
          <Button asChild>
            <Link to="/batches/new">New Batch</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/recipes/new">New Recipe</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
