import { Outlet, useLoaderData, Form, Link, redirect, useSearchParams } from "react-router";
import type { Route } from "./+types/batches.$id";
import { requireUser } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { BATCH_TRANSITIONS, type BatchStatus } from "@brewplan/shared";
import { StatusBadge } from "~/components/shared/status-badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { formatDate } from "~/lib/utils";
import {
  ArrowLeft,
  Play,
  FlaskConical,
  ThermometerSun,
  Package,
  CheckCircle2,
  XCircle,
  Trash2,
  AlertCircle,
  X,
} from "lucide-react";

const transitionMeta: Record<
  string,
  { label: string; icon: typeof Play; variant: "default" | "destructive" | "outline" | "secondary" }
> = {
  brewing: { label: "Start Brewing", icon: Play, variant: "default" },
  fermenting: { label: "Move to Fermenter", icon: FlaskConical, variant: "default" },
  conditioning: {
    label: "Start Conditioning",
    icon: ThermometerSun,
    variant: "default",
  },
  ready_to_package: {
    label: "Ready to Package",
    icon: Package,
    variant: "default",
  },
  packaged: { label: "Mark Packaged", icon: Package, variant: "default" },
  completed: { label: "Complete", icon: CheckCircle2, variant: "default" },
  cancelled: { label: "Cancel Batch", icon: XCircle, variant: "outline" },
  dumped: { label: "Dump Batch", icon: Trash2, variant: "destructive" },
};

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireUser(request);

  const batch = queries.batches.getWithDetails(params.id);
  if (!batch) {
    throw new Response("Batch not found", { status: 404 });
  }

  const currentStatus = batch.status as BatchStatus;
  const allowedTransitions = BATCH_TRANSITIONS[currentStatus] ?? [];

  return { batch, allowedTransitions };
}

export default function BatchDetailLayout() {
  const { batch, allowedTransitions } = useLoaderData<typeof loader>();
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
        to="/batches"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground min-h-[44px]"
      >
        <ArrowLeft className="h-4 w-4" />
        All Batches
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

      {/* Batch Header */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold font-mono">
                  {batch.batchNumber}
                </h2>
                <StatusBadge status={batch.status} />
              </div>
              {batch.recipe && (
                <p className="mt-1 text-muted-foreground">
                  {batch.recipe.name}
                  {batch.recipe.style && (
                    <span className="ml-1 text-sm">({batch.recipe.style})</span>
                  )}
                </p>
              )}
            </div>
            <div className="text-right text-sm text-muted-foreground">
              {batch.batchSizeLitres} L
            </div>
          </div>

          {/* Key dates */}
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
            {batch.plannedDate && (
              <span>Planned: {formatDate(batch.plannedDate)}</span>
            )}
            {batch.brewDate && (
              <span>Brewed: {formatDate(batch.brewDate)}</span>
            )}
            {batch.estimatedReadyDate && (
              <span>Est. Ready: {formatDate(batch.estimatedReadyDate)}</span>
            )}
            {batch.completedAt && (
              <span>Completed: {formatDate(batch.completedAt)}</span>
            )}
          </div>

          {/* Transition Buttons - LARGE for brewery floor use (excludes dump) */}
          {allowedTransitions.filter((s) => s !== "dumped").length > 0 && (
            <div className="flex flex-wrap gap-3 pt-2">
              {allowedTransitions
                .filter((s) => s !== "dumped")
                .map((toStatus) => {
                  const meta = transitionMeta[toStatus] ?? {
                    label: toStatus,
                    icon: Play,
                    variant: "default" as const,
                  };
                  const Icon = meta.icon;
                  return (
                    <Form
                      key={toStatus}
                      method="post"
                      action={`/batches/${batch.id}/transition`}
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

      {/* Dump batch — intentionally at the very bottom */}
      {allowedTransitions.includes("dumped" as BatchStatus) && (
        <div className="pt-8 border-t mt-8">
          <Form
            method="post"
            action={`/batches/${batch.id}/transition`}
          >
            <input type="hidden" name="toStatus" value="dumped" />
            <Button
              type="submit"
              variant="destructive"
              size="lg"
              className="min-h-[56px] text-base px-6"
            >
              <Trash2 className="mr-2 h-5 w-5" />
              Dump Batch
            </Button>
          </Form>
        </div>
      )}
    </div>
  );
}
