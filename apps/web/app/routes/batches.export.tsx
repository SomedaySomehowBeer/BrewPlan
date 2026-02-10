import type { Route } from "./+types/batches.export";
import { requireUser } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);

  const rows = queries.reporting.getBatchesForCsvExport();

  const headers = [
    "Batch Number",
    "Recipe",
    "Style",
    "Status",
    "Planned Date",
    "Brew Date",
    "Est. Ready",
    "Batch Size (L)",
    "Actual Volume (L)",
    "OG",
    "FG",
    "ABV %",
    "Brewer",
    "Completed",
  ];

  const csvRows = rows.map((r) =>
    [
      r.batchNumber,
      r.recipeName,
      r.style,
      r.status,
      r.plannedDate ?? "",
      r.brewDate ?? "",
      r.estimatedReadyDate ?? "",
      r.batchSizeLitres,
      r.actualVolumeLitres ?? "",
      r.actualOg ?? "",
      r.actualFg ?? "",
      r.actualAbv ?? "",
      r.brewer ?? "",
      r.completedAt ?? "",
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );

  const csv = [headers.join(","), ...csvRows].join("\n");

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="batches-export-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
