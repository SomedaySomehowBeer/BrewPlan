import { useLoaderData, Link } from "react-router";
import type { Route } from "./+types/users._index";
import { requireAdminAccess } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Plus } from "lucide-react";
import { formatDate } from "~/lib/utils";

const roleLabels: Record<string, string> = {
  admin: "Admin",
  brewer: "Brewer",
  viewer: "Viewer",
};

const roleVariants: Record<string, "default" | "secondary" | "outline"> = {
  admin: "default",
  brewer: "secondary",
  viewer: "outline",
};

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdminAccess(request);
  const users = queries.auth.listUsers();
  return { users };
}

export default function UsersIndex() {
  const { users } = useLoaderData<typeof loader>();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button asChild>
          <Link to="/users/new">
            <Plus className="mr-2 h-4 w-4" />
            New User
          </Link>
        </Button>
      </div>

      <div className="grid gap-3">
        {users.map((user) => (
          <Link key={user.id} to={`/users/${user.id}`}>
            <Card className="hover:border-primary/50 transition-colors">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{user.name}</span>
                    <Badge variant={roleVariants[user.role] ?? "outline"}>
                      {roleLabels[user.role] ?? user.role}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {user.email}
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">
                  Joined {formatDate(user.createdAt)}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
