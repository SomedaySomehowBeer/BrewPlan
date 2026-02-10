import { Outlet, useLoaderData, Form, Link, useSearchParams } from "react-router";
import type { Route } from "./+types/orders.$id";
import { requireUser } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { ORDER_TRANSITIONS, type OrderStatus } from "@brewplan/shared";
import { StatusBadge } from "~/components/shared/status-badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { formatDate } from "~/lib/utils";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
} from "lucide-react";

const transitionMeta: Record<
  string,
  { label: string; variant: "default" | "destructive" | "outline" | "secondary" }
> = {
  confirmed: { label: "Confirm Order", variant: "default" },
  picking: { label: "Start Picking", variant: "default" },
  dispatched: { label: "Mark Dispatched", variant: "default" },
  delivered: { label: "Mark Delivered", variant: "default" },
  invoiced: { label: "Create Invoice", variant: "default" },
  paid: { label: "Mark Paid", variant: "default" },
  cancelled: { label: "Cancel Order", variant: "destructive" },
};

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireUser(request);

  const order = queries.orders.getWithLines(params.id);
  if (!order) {
    throw new Response("Order not found", { status: 404 });
  }

  const currentStatus = order.status as OrderStatus;
  const allowedTransitions = ORDER_TRANSITIONS[currentStatus] ?? [];

  return { order, allowedTransitions, userRole: user.role };
}

export default function OrderDetailLayout() {
  const { order, allowedTransitions, userRole } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const error = searchParams.get("error");

  function dismissError() {
    setSearchParams((prev) => {
      prev.delete("error");
      return prev;
    });
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        to="/orders"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground min-h-[44px]"
      >
        <ArrowLeft className="h-4 w-4" />
        All Orders
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

      {/* Order Header */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold font-mono">
                  {order.orderNumber}
                </h2>
                <StatusBadge status={order.status} />
              </div>
              {order.customer && (
                <p className="mt-1 text-muted-foreground">
                  <Link
                    to={`/customers/${order.customer.id}`}
                    className="hover:underline"
                  >
                    {order.customer.name}
                  </Link>
                </p>
              )}
            </div>
          </div>

          {/* Key dates */}
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
            {order.orderDate && (
              <span>Ordered: {formatDate(order.orderDate)}</span>
            )}
            {order.deliveryDate && (
              <span>Delivery: {formatDate(order.deliveryDate)}</span>
            )}
            {order.paidAt && (
              <span>Paid: {formatDate(order.paidAt)}</span>
            )}
          </div>

          {/* Transition Buttons */}
          {userRole !== "viewer" && allowedTransitions.filter((s) => s !== "cancelled").length > 0 && (
            <div className="flex flex-wrap gap-3 pt-2">
              {allowedTransitions
                .filter((s) => s !== "cancelled")
                .map((toStatus) => {
                  const meta = transitionMeta[toStatus] ?? {
                    label: toStatus,
                    variant: "default" as const,
                  };
                  return (
                    <Form
                      key={toStatus}
                      method="post"
                      action={`/orders/${order.id}/transition`}
                    >
                      <input type="hidden" name="toStatus" value={toStatus} />
                      <Button
                        type="submit"
                        variant={meta.variant}
                        size="lg"
                        className="min-h-[56px] text-base px-6"
                      >
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

      {/* Cancel order — intentionally at the very bottom */}
      {userRole !== "viewer" && allowedTransitions.includes("cancelled" as OrderStatus) && (
        <div className="pt-8 border-t mt-8">
          <Form
            method="post"
            action={`/orders/${order.id}/transition`}
          >
            <input type="hidden" name="toStatus" value="cancelled" />
            <Button
              type="submit"
              variant="destructive"
              size="lg"
              className="min-h-[56px] text-base px-6"
            >
              <XCircle className="mr-2 h-5 w-5" />
              Cancel Order
            </Button>
          </Form>
        </div>
      )}
    </div>
  );
}
