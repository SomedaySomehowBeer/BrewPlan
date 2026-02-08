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
  // PO statuses
  sent: "warning",
  acknowledged: "warning",
  partially_received: "warning",
  received: "success",
  // Order statuses
  confirmed: "default",
  picking: "warning",
  dispatched: "warning",
  delivered: "success",
  invoiced: "default",
  paid: "success",
  // Customer types
  venue: "default",
  bottle_shop: "secondary",
  distributor: "outline",
  taproom: "default",
  market: "secondary",
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
  // PO statuses
  sent: "Sent",
  acknowledged: "Acknowledged",
  partially_received: "Partially Received",
  received: "Received",
  // Order statuses
  confirmed: "Confirmed",
  picking: "Picking",
  dispatched: "Dispatched",
  delivered: "Delivered",
  invoiced: "Invoiced",
  paid: "Paid",
  // Customer types
  venue: "Venue",
  bottle_shop: "Bottle Shop",
  distributor: "Distributor",
  taproom: "Taproom",
  market: "Market",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={statusColors[status] ?? "outline"}>
      {statusLabels[status] ?? status}
    </Badge>
  );
}
