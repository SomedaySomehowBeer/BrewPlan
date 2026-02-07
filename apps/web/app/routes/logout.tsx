import type { Route } from "./+types/logout";
import { destroySession } from "~/lib/auth.server";
import { redirect } from "react-router";

export async function action({ request }: Route.ActionArgs) {
  return destroySession(request);
}

export async function loader() {
  return redirect("/");
}
