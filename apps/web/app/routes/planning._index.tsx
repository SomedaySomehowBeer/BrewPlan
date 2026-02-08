import { useLoaderData, Link } from "react-router";
import type { Route } from "./+types/planning._index";
import { requireUser } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Calendar,
  Package,
  Container,
  AlertTriangle,
  ArrowRight,
  ShoppingCart,
  Truck,
} from "lucide-react";

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);

  const schedule = queries.planning.getBrewSchedule();
  const materials = queries.planning.getMaterialsRequirements();
  const vessels = queries.vessels.list({ archived: false });

  const plannedBatches = schedule.filter((b) => b.status === "planned").length;
  const inProgressBatches = schedule.filter(
    (b) => b.status !== "planned"
  ).length;
  const lowStockItems = materials.filter((m) => m.shortfall > 0).length;
  const availableVessels = vessels.filter(
    (v) => v.status === "available"
  ).length;

  // New Phase 2 stats
  const readyToPackage = schedule.filter(
    (b) => b.status === "ready_to_package"
  ).length;

  // Count confirmed orders due in next 2 weeks
  let ordersDue = 0;
  try {
    const { upcomingOrders } = queries.planning.getDemandView(2);
    ordersDue = upcomingOrders.length;
  } catch {
    // Orders table may not have data yet
  }

  return {
    stats: {
      plannedBatches,
      inProgressBatches,
      lowStockItems,
      availableVessels,
      totalVessels: vessels.length,
      readyToPackage,
      ordersDue,
    },
  };
}

export default function PlanningIndex() {
  const { stats } = useLoaderData<typeof loader>();

  const cards = [
    {
      title: "Planned Batches",
      value: stats.plannedBatches,
      subtitle: `${stats.inProgressBatches} in progress`,
      icon: Calendar,
      to: "/planning/schedule",
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      title: "Low Stock Items",
      value: stats.lowStockItems,
      subtitle: stats.lowStockItems > 0 ? "Attention needed" : "All good",
      icon: stats.lowStockItems > 0 ? AlertTriangle : Package,
      to: "/planning/materials",
      color:
        stats.lowStockItems > 0
          ? "text-red-600 dark:text-red-400"
          : "text-green-600 dark:text-green-400",
    },
    {
      title: "Vessels Available",
      value: `${stats.availableVessels} / ${stats.totalVessels}`,
      subtitle: "Ready to use",
      icon: Container,
      to: "/vessels",
      color: "text-muted-foreground",
    },
    {
      title: "Orders Due",
      value: stats.ordersDue,
      subtitle: "Next 2 weeks",
      icon: ShoppingCart,
      to: "/planning/demand",
      color:
        stats.ordersDue > 0
          ? "text-amber-600 dark:text-amber-400"
          : "text-muted-foreground",
    },
    {
      title: "Ready to Package",
      value: stats.readyToPackage,
      subtitle: stats.readyToPackage > 0 ? "Awaiting packaging" : "None ready",
      icon: Package,
      to: "/planning/packaging",
      color:
        stats.readyToPackage > 0
          ? "text-blue-600 dark:text-blue-400"
          : "text-muted-foreground",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((card) => (
          <Link key={card.title} to={card.to}>
            <Card className="hover:border-primary/50 transition-colors h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {card.subtitle}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link to="/planning/materials">
          <Card className="hover:border-primary/50 transition-colors">
            <CardContent className="flex items-center justify-between p-4 min-h-[64px]">
              <div>
                <h3 className="font-medium">Materials Requirements</h3>
                <p className="text-sm text-muted-foreground">
                  Check ingredient needs vs stock
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
        <Link to="/planning/schedule">
          <Card className="hover:border-primary/50 transition-colors">
            <CardContent className="flex items-center justify-between p-4 min-h-[64px]">
              <div>
                <h3 className="font-medium">Brew Schedule</h3>
                <p className="text-sm text-muted-foreground">
                  View planned and in-progress batches
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
        <Link to="/planning/demand">
          <Card className="hover:border-primary/50 transition-colors">
            <CardContent className="flex items-center justify-between p-4 min-h-[64px]">
              <div>
                <h3 className="font-medium">Customer Demand</h3>
                <p className="text-sm text-muted-foreground">
                  Orders due and demand by product
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
        <Link to="/planning/packaging">
          <Card className="hover:border-primary/50 transition-colors">
            <CardContent className="flex items-center justify-between p-4 min-h-[64px]">
              <div>
                <h3 className="font-medium">Packaging Priority</h3>
                <p className="text-sm text-muted-foreground">
                  Batches ready, ranked by urgency
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
        <Link to="/planning/purchasing">
          <Card className="hover:border-primary/50 transition-colors">
            <CardContent className="flex items-center justify-between p-4 min-h-[64px]">
              <div>
                <h3 className="font-medium">Purchase Timing</h3>
                <p className="text-sm text-muted-foreground">
                  When to order, grouped by supplier
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
