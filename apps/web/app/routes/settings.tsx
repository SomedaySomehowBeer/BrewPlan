import { Outlet, Link } from "react-router";
import type { Route } from "./+types/settings";
import { requireUser } from "~/lib/auth.server";
import { ArrowLeft } from "lucide-react";

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  return {};
}

export default function SettingsLayout() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your brewery profile and configuration.
        </p>
      </div>
      <Outlet />
    </div>
  );
}
