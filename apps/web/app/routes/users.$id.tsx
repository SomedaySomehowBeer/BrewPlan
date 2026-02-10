import {
  useLoaderData,
  useActionData,
  Form,
  useNavigation,
  Link,
} from "react-router";
import type { Route } from "./+types/users.$id";
import { requireAdminAccess } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { adminUpdateUserSchema, adminResetPasswordSchema } from "@brewplan/shared";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { formatDate } from "~/lib/utils";

type UserActionData =
  | {
      intent: "update";
      errors: { name?: string[]; email?: string[]; role?: string[] } | null;
      success: string | null;
    }
  | {
      intent: "reset-password";
      errors: { newPassword?: string[] } | null;
      success: string | null;
    }
  | { intent: null; errors: null; success: null };

const roleLabels: Record<string, string> = {
  admin: "Admin",
  brewer: "Brewer",
  viewer: "Viewer",
};

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireAdminAccess(request);

  const user = queries.auth.getUserById(params.id);
  if (!user) {
    throw new Response("User not found", { status: 404 });
  }

  return {
    targetUser: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    },
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const currentUser = await requireAdminAccess(request);

  const formData = await request.formData();
  const intent = String(formData.get("intent"));

  if (intent === "update") {
    const raw = Object.fromEntries(formData);
    const parsed = adminUpdateUserSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        intent: "update",
        errors: parsed.error.flatten().fieldErrors,
        success: null,
      };
    }

    // Prevent admin from demoting themselves
    if (params.id === currentUser.id && parsed.data.role && parsed.data.role !== "admin") {
      return {
        intent: "update",
        errors: { role: ["You cannot change your own role"] },
        success: null,
      };
    }

    queries.auth.updateUser(params.id, parsed.data);
    return { intent: "update", errors: null, success: "User updated" };
  }

  if (intent === "reset-password") {
    const raw = Object.fromEntries(formData);
    const parsed = adminResetPasswordSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        intent: "reset-password",
        errors: parsed.error.flatten().fieldErrors,
        success: null,
      };
    }

    queries.auth.adminResetPassword(params.id, parsed.data.newPassword);
    return {
      intent: "reset-password",
      errors: null,
      success: "Password reset successfully",
    };
  }

  return { intent: null, errors: null, success: null };
}

export default function UserDetail() {
  const { targetUser } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>() as
    | UserActionData
    | undefined;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const updateErrors =
    actionData?.intent === "update" ? actionData.errors : null;
  const updateSuccess =
    actionData?.intent === "update" ? actionData.success : null;
  const resetErrors =
    actionData?.intent === "reset-password" ? actionData.errors : null;
  const resetSuccess =
    actionData?.intent === "reset-password" ? actionData.success : null;

  return (
    <div className="space-y-6">
      <Link
        to="/users"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground min-h-[44px]"
      >
        <ArrowLeft className="h-4 w-4" />
        All Users
      </Link>

      {/* User Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">{targetUser.name}</CardTitle>
            <Badge variant="secondary">
              {roleLabels[targetUser.role] ?? targetUser.role}
            </Badge>
          </div>
          <CardDescription>
            {targetUser.email} — Joined {formatDate(targetUser.createdAt)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {updateSuccess && (
            <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
              {updateSuccess}
            </div>
          )}
          <Form method="post" className="space-y-4">
            <input type="hidden" name="intent" value="update" />
            <div className="space-y-1">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={targetUser.name}
                className="min-h-[44px]"
              />
              {updateErrors?.name && (
                <p className="text-xs text-destructive">
                  {updateErrors.name[0]}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={targetUser.email}
                className="min-h-[44px]"
              />
              {updateErrors?.email && (
                <p className="text-xs text-destructive">
                  {updateErrors.email[0]}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                name="role"
                defaultValue={targetUser.role}
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[44px]"
              >
                <option value="admin">Admin</option>
                <option value="brewer">Brewer</option>
                <option value="viewer">Viewer</option>
              </select>
              {updateErrors?.role && (
                <p className="text-xs text-destructive">
                  {updateErrors.role[0]}
                </p>
              )}
            </div>
            <Button type="submit" disabled={isSubmitting} className="min-h-[44px]">
              Save Changes
            </Button>
          </Form>
        </CardContent>
      </Card>

      {/* Reset Password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reset Password</CardTitle>
          <CardDescription>
            Set a new password for this user.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {resetSuccess && (
            <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
              {resetSuccess}
            </div>
          )}
          <Form method="post" className="space-y-4">
            <input type="hidden" name="intent" value="reset-password" />
            <div className="space-y-1">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                minLength={8}
                required
                className="min-h-[44px]"
              />
              {resetErrors?.newPassword && (
                <p className="text-xs text-destructive">
                  {resetErrors.newPassword[0]}
                </p>
              )}
            </div>
            <Button
              type="submit"
              variant="outline"
              disabled={isSubmitting}
              className="min-h-[44px]"
            >
              Reset Password
            </Button>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
