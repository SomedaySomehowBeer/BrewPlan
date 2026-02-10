import { redirect } from "react-router";
import type { Route } from "./+types/batches.$id.transition";
import { requireMutationAccess } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { batchTransitionSchema } from "@brewplan/shared";

export async function action({ request, params }: Route.ActionArgs) {
  await requireMutationAccess(request);

  const formData = await request.formData();
  const raw = { toStatus: formData.get("toStatus") };

  const result = batchTransitionSchema.safeParse(raw);
  if (!result.success) {
    // Redirect back with error in search params
    const errorMsg = result.error.issues.map((i) => i.message).join(", ");
    return redirect(
      `/batches/${params.id}?error=${encodeURIComponent(errorMsg)}`
    );
  }

  try {
    queries.batches.transition(params.id, result.data.toStatus);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Transition failed";
    return redirect(
      `/batches/${params.id}?error=${encodeURIComponent(message)}`
    );
  }

  return redirect(`/batches/${params.id}`);
}

// No default export — this is a POST-only action route
export default function TransitionRoute() {
  return redirect("/batches");
}
