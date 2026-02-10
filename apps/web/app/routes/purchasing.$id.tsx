import { Outlet, useLoaderData, Form, Link, redirect, useSearchParams } from "react-router";
import type { Route } from "./+types/purchasing.$id";
import { requireUser } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { PO_TRANSITIONS, type PurchaseOrderStatus } from "@brewplan/shared";
import { StatusBadge } from "~/components/shared/status-badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { formatDate } from "~/lib/utils";
import {
  ArrowLeft,
  Send,
  CheckCircle2,
  PackageCheck,
  XCircle,
  AlertCircle,
  X,
} from "lucide-react";

const transitionMeta: Record<
  string,
  { label: string; icon: typeof Send; variant: "default" | "destructive" | "outline" | "secondary" }
> = {
  sent: { label: "Mark Sent", icon: Send, variant: "default" },
  acknowledged: { label: "Mark Acknowledged", icon: CheckCircle2, variant: "default" },
  received: { label: "Mark Received", icon: PackageCheck, variant: "default" },
  cancelled: { label: "Cancel PO", icon: XCircle, variant: "destructive" },
};

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireUser(request);

  const po = queries.purchasing.getWithLines(params.id);
  if (!po) {
    throw new Response("Purchase order not found", { status: 404 });
  }

  const currentStatus = po.status as PurchaseOrderStatus;
  const allowedTransitions = PO_TRANSITIONS[currentStatus] ?? [];

  return { po, allowedTransitions, userRole: user.role };
}

export default function PurchaseOrderDetailLayout() {
  const { po, allowedTransitions, userRole } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const error = searchParams.get("error");

  function dismissError() {
    setSearchParams((prev) => {
      prev.delete("error");
      return prev;
    });
  }

  // Filter out partially_received (auto-triggered by receiveLine)
  const visibleTransitions = allowedTransitions.filter(
    (s) => s !== "partially_received"
  );

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        to="/purchasing"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground min-h-[44px]"
      >
        <ArrowLeft className="h-4 w-4" />
        All Purchase Orders
      </Link>

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
          <p className="flex-1 text-sm font-medium">{error}</p>
          <button
            onClick={dismissError}
            className="shrink-0 rounded-sm p-1 hover:bg-destructive/20 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* PO Header */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold font-mono">
                  {po.poNumber}
                </h2>
                <StatusBadge status={po.status} />
              </div>
              {po.supplier && (
                <p className="mt-1 text-muted-foreground">
                  <Link
                    to={`/suppliers/${po.supplierId}`}
                    className="hover:underline"
                  >
                    {po.supplier.name}
                  </Link>
                </p>
              )}
            </div>
          </div>

          {/* Key dates */}
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
            {po.orderDate && (
              <span>Ordered: {formatDate(po.orderDate)}</span>
            )}
            {po.expectedDeliveryDate && (
              <span>Expected: {formatDate(po.expectedDeliveryDate)}</span>
            )}
          </div>

          {/* Transition Buttons */}
          {userRole !== "viewer" && visibleTransitions.length > 0 && (
            <div className="flex flex-wrap gap-3 pt-2">
              {visibleTransitions.map((toStatus) => {
                const meta = transitionMeta[toStatus] ?? {
                  label: toStatus,
                  icon: Send,
                  variant: "default" as const,
                };
                const Icon = meta.icon;
                return (
                  <Form
                    key={toStatus}
                    method="post"
                    action={`/purchasing/${po.id}/transition`}
                  >
                    <input type="hidden" name="toStatus" value={toStatus} />
                    <Button
                      type="submit"
                      variant={meta.variant}
                      size="lg"
                      className="min-h-[56px] text-base px-6"
                    >
                      <Icon className="mr-2 h-5 w-5" />
                      {meta.label}
                    </Button>
                  </Form>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Outlet />
    </div>
  );
}
