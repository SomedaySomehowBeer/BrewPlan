import type { Route } from "./+types/inventory.export";
import { requireUser } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);

  const rows = queries.reporting.getInventoryForCsvExport();

  const headers = [
    "Name",
    "SKU",
    "Category",
    "Unit",
    "Unit Cost",
    "Gluten Free",
    "Reorder Point",
    "Total On Hand",
  ];

  const csvRows = rows.map((r) =>
    [
      r.name,
      r.sku,
      r.category,
      r.unit,
      r.unitCost,
      r.isGlutenFree,
      r.reorderPoint,
      r.totalOnHand,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );

  const csv = [headers.join(","), ...csvRows].join("\n");

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="inventory-export-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
