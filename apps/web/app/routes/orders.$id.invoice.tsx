import type { Route } from "./+types/orders.$id.invoice";
import { requireUser } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import { createElement } from "react";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    padding: 40,
    color: "#1a1a1a",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  breweryName: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  breweryDetail: {
    fontSize: 9,
    color: "#555",
    marginBottom: 2,
  },
  invoiceTitle: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    textAlign: "right" as const,
    marginBottom: 4,
  },
  invoiceMeta: {
    fontSize: 9,
    textAlign: "right" as const,
    color: "#555",
    marginBottom: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
    color: "#333",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    paddingBottom: 3,
  },
  row: {
    flexDirection: "row",
    marginBottom: 2,
  },
  label: {
    width: 100,
    color: "#666",
    fontSize: 9,
  },
  value: {
    flex: 1,
    fontSize: 9,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    paddingBottom: 4,
    marginBottom: 6,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
  },
  colDescription: { flex: 3 },
  colFormat: { flex: 2 },
  colQty: { width: 40, textAlign: "right" as const },
  colPrice: { width: 70, textAlign: "right" as const },
  colTotal: { width: 70, textAlign: "right" as const },
  headerText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#666",
    textTransform: "uppercase" as const,
  },
  totalsSection: {
    marginTop: 16,
    alignItems: "flex-end" as const,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 3,
  },
  totalLabel: {
    width: 100,
    textAlign: "right" as const,
    color: "#666",
    paddingRight: 12,
  },
  totalValue: {
    width: 70,
    textAlign: "right" as const,
  },
  grandTotal: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    borderTopWidth: 1,
    borderTopColor: "#333",
    paddingTop: 4,
    marginTop: 4,
  },
  footer: {
    position: "absolute" as const,
    bottom: 40,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#888",
    textAlign: "center" as const,
    borderTopWidth: 0.5,
    borderTopColor: "#ddd",
    paddingTop: 8,
  },
});

const FORMAT_LABELS: Record<string, string> = {
  keg_50l: "50L Keg",
  keg_30l: "30L Keg",
  keg_20l: "20L Keg",
  can_375ml: "375ml Can",
  can_355ml: "355ml Can",
  bottle_330ml: "330ml Bottle",
  bottle_500ml: "500ml Bottle",
  other: "Other",
};

function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-AU", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function InvoiceDocument({
  order,
}: {
  order: NonNullable<ReturnType<typeof queries.orders.getForInvoice>>;
}) {
  const profile = order.breweryProfile;

  return createElement(
    Document,
    null,
    createElement(
      Page,
      { size: "A4", style: styles.page },
      // Header
      createElement(
        View,
        { style: styles.header },
        createElement(
          View,
          null,
          createElement(
            Text,
            { style: styles.breweryName },
            profile?.name ?? "Brewery"
          ),
          profile?.address
            ? createElement(Text, { style: styles.breweryDetail }, profile.address)
            : null,
          profile?.phone
            ? createElement(Text, { style: styles.breweryDetail }, profile.phone)
            : null,
          profile?.email
            ? createElement(Text, { style: styles.breweryDetail }, profile.email)
            : null,
          profile?.abn
            ? createElement(
                Text,
                { style: styles.breweryDetail },
                `ABN: ${profile.abn}`
              )
            : null,
          profile?.liquorLicenceNumber
            ? createElement(
                Text,
                { style: styles.breweryDetail },
                `Licence: ${profile.liquorLicenceNumber}`
              )
            : null
        ),
        createElement(
          View,
          null,
          createElement(Text, { style: styles.invoiceTitle }, "INVOICE"),
          createElement(
            Text,
            { style: styles.invoiceMeta },
            order.invoiceNumber ?? order.orderNumber
          ),
          order.orderDate
            ? createElement(
                Text,
                { style: styles.invoiceMeta },
                `Date: ${formatDate(order.orderDate)}`
              )
            : null,
          order.deliveryDate
            ? createElement(
                Text,
                { style: styles.invoiceMeta },
                `Delivery: ${formatDate(order.deliveryDate)}`
              )
            : null
        )
      ),

      // Bill To
      createElement(
        View,
        { style: styles.section },
        createElement(Text, { style: styles.sectionTitle }, "Bill To"),
        order.customer
          ? createElement(
              View,
              null,
              createElement(
                Text,
                { style: { fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 2 } },
                order.customer.name
              ),
              order.customer.billingAddress
                ? createElement(
                    Text,
                    { style: { fontSize: 9, color: "#555", marginBottom: 2 } },
                    order.customer.billingAddress
                  )
                : null,
              order.customer.email
                ? createElement(
                    Text,
                    { style: { fontSize: 9, color: "#555", marginBottom: 2 } },
                    order.customer.email
                  )
                : null,
              order.customer.phone
                ? createElement(
                    Text,
                    { style: { fontSize: 9, color: "#555" } },
                    order.customer.phone
                  )
                : null
            )
          : null
      ),

      // Delivery address (if different)
      order.deliveryAddress
        ? createElement(
            View,
            { style: styles.section },
            createElement(Text, { style: styles.sectionTitle }, "Deliver To"),
            createElement(
              Text,
              { style: { fontSize: 9, color: "#555" } },
              order.deliveryAddress
            )
          )
        : null,

      // Line items table
      createElement(
        View,
        { style: styles.section },
        createElement(Text, { style: styles.sectionTitle }, "Items"),
        // Table header
        createElement(
          View,
          { style: styles.tableHeader },
          createElement(
            Text,
            { style: { ...styles.headerText, ...styles.colDescription } },
            "DESCRIPTION"
          ),
          createElement(
            Text,
            { style: { ...styles.headerText, ...styles.colFormat } },
            "FORMAT"
          ),
          createElement(
            Text,
            { style: { ...styles.headerText, ...styles.colQty } },
            "QTY"
          ),
          createElement(
            Text,
            { style: { ...styles.headerText, ...styles.colPrice } },
            "UNIT PRICE"
          ),
          createElement(
            Text,
            { style: { ...styles.headerText, ...styles.colTotal } },
            "TOTAL"
          )
        ),
        // Table rows
        ...order.lines.map((line) =>
          createElement(
            View,
            { key: line.id, style: styles.tableRow },
            createElement(
              Text,
              { style: styles.colDescription },
              line.recipeName ?? line.description
            ),
            createElement(
              Text,
              { style: styles.colFormat },
              FORMAT_LABELS[line.format] ?? line.format
            ),
            createElement(
              Text,
              { style: styles.colQty },
              String(line.quantity)
            ),
            createElement(
              Text,
              { style: styles.colPrice },
              formatCurrency(line.unitPrice)
            ),
            createElement(
              Text,
              { style: styles.colTotal },
              formatCurrency(line.lineTotal)
            )
          )
        )
      ),

      // Totals
      createElement(
        View,
        { style: styles.totalsSection },
        createElement(
          View,
          { style: styles.totalRow },
          createElement(Text, { style: styles.totalLabel }, "Subtotal"),
          createElement(
            Text,
            { style: styles.totalValue },
            formatCurrency(order.subtotal)
          )
        ),
        createElement(
          View,
          { style: styles.totalRow },
          createElement(Text, { style: styles.totalLabel }, "GST (10%)"),
          createElement(
            Text,
            { style: styles.totalValue },
            formatCurrency(order.tax)
          )
        ),
        createElement(
          View,
          { style: { ...styles.totalRow, ...styles.grandTotal } },
          createElement(
            Text,
            { style: { ...styles.totalLabel, fontFamily: "Helvetica-Bold" } },
            "Total"
          ),
          createElement(
            Text,
            { style: { ...styles.totalValue, fontFamily: "Helvetica-Bold", fontSize: 12 } },
            formatCurrency(order.total)
          )
        )
      ),

      // Footer
      createElement(
        View,
        { style: styles.footer },
        createElement(
          Text,
          null,
          profile?.invoiceFooter ?? "Thank you for your business."
        )
      )
    )
  );
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireUser(request);

  const order = queries.orders.getForInvoice(params.id);
  if (!order) {
    throw new Response("Order not found", { status: 404 });
  }

  const doc = createElement(InvoiceDocument, { order });
  const buffer = await renderToBuffer(doc);

  const filename =
    order.invoiceNumber ?? order.orderNumber ?? `invoice-${order.id}`;

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}.pdf"`,
    },
  });
}
