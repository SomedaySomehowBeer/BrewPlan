import { Badge } from "~/components/ui/badge";

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning"> = {
  // Recipe statuses
  draft: "secondary",
  active: "success",
  archived: "outline",
  // Batch statuses
  planned: "secondary",
  brewing: "warning",
  fermenting: "warning",
  conditioning: "warning",
  ready_to_package: "success",
  packaged: "success",
  completed: "default",
  cancelled: "outline",
  dumped: "destructive",
  // Vessel statuses
  available: "success",
  in_use: "warning",
  cleaning: "secondary",
  maintenance: "outline",
  out_of_service: "destructive",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  active: "Active",
  archived: "Archived",
  planned: "Planned",
  brewing: "Brewing",
  fermenting: "Fermenting",
  conditioning: "Conditioning",
  ready_to_package: "Ready to Package",
  packaged: "Packaged",
  completed: "Completed",
  cancelled: "Cancelled",
  dumped: "Dumped",
  available: "Available",
  in_use: "In Use",
  cleaning: "Cleaning",
  maintenance: "Maintenance",
  out_of_service: "Out of Service",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={statusColors[status] ?? "outline"}>
      {statusLabels[status] ?? status}
    </Badge>
  );
}
