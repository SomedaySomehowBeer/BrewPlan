import { Outlet } from "react-router";
import type { Route } from "./+types/users";
import { requireAdminAccess } from "~/lib/auth.server";

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdminAccess(request);
  return {};
}

export default function UsersLayout() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-sm text-muted-foreground">
          Manage user accounts and roles.
        </p>
      </div>
      <Outlet />
    </div>
  );
}
