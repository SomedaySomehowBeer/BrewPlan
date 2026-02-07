import { useLoaderData, Link } from "react-router";
import type { Route } from "./+types/planning._index";
import { requireUser } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import {
  Calendar,
  Package,
  Container,
  AlertTriangle,
  ArrowRight,
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

  return {
    stats: {
      plannedBatches,
      inProgressBatches,
      lowStockItems,
      availableVessels,
      totalVessels: vessels.length,
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
  ];

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-3">
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
      <div className="grid gap-4 sm:grid-cols-2">
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
      </div>
    </div>
  );
}
