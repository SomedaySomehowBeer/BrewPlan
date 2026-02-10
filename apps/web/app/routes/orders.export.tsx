import type { Route } from "./+types/orders.export";
import { requireUser } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);

  const rows = queries.reporting.getOrdersForCsvExport();

  const headers = [
    "Order Number",
    "Customer",
    "Status",
    "Order Date",
    "Delivery Date",
    "Channel",
    "Subtotal",
    "Tax",
    "Total",
    "Invoice Number",
    "Paid At",
  ];

  const csvRows = rows.map((r) =>
    [
      r.orderNumber,
      r.customerName,
      r.status,
      r.orderDate ?? "",
      r.deliveryDate ?? "",
      r.channel,
      r.subtotal,
      r.tax,
      r.total,
      r.invoiceNumber ?? "",
      r.paidAt ?? "",
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );

  const csv = [headers.join(","), ...csvRows].join("\n");

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders-export-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
