import { redirect } from "react-router";
import type { Route } from "./+types/orders.$id.transition";
import { requireUser } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { orderTransitionSchema } from "@brewplan/shared";

export async function action({ request, params }: Route.ActionArgs) {
  await requireUser(request);

  const formData = await request.formData();
  const raw = { toStatus: formData.get("toStatus") };

  const result = orderTransitionSchema.safeParse(raw);
  if (!result.success) {
    const errorMsg = result.error.issues.map((i) => i.message).join(", ");
    return redirect(
      `/orders/${params.id}?error=${encodeURIComponent(errorMsg)}`
    );
  }

  try {
    queries.orders.transition(params.id, result.data.toStatus);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Transition failed";
    return redirect(
      `/orders/${params.id}?error=${encodeURIComponent(message)}`
    );
  }

  return redirect(`/orders/${params.id}`);
}

// No default export — this is a POST-only action route
export default function TransitionRoute() {
  return redirect("/orders");
}
