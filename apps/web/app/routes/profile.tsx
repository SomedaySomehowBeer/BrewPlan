import {
  useLoaderData,
  useActionData,
  Form,
  useNavigation,
} from "react-router";
import type { Route } from "./+types/profile";
import { requireUser } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { updateProfileSchema, changePasswordSchema } from "@brewplan/shared";
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

type ProfileActionData =
  | {
      intent: "update-profile";
      errors: { name?: string[]; email?: string[] } | null;
      success: string | null;
    }
  | {
      intent: "change-password";
      errors: {
        currentPassword?: string[];
        newPassword?: string[];
        confirmPassword?: string[];
      } | null;
      success: string | null;
    }
  | { intent: null; errors: null; success: null };

const roleLabels: Record<string, string> = {
  admin: "Admin",
  brewer: "Brewer",
  viewer: "Viewer",
};

export async function loader({ request }: Route.LoaderArgs) {
  const sessionUser = await requireUser(request);
  const user = queries.auth.getUserById(sessionUser.id);
  if (!user) throw new Response("User not found", { status: 404 });

  return {
    profile: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}

export async function action({ request }: Route.ActionArgs) {
  const sessionUser = await requireUser(request);

  const formData = await request.formData();
  const intent = String(formData.get("intent"));

  if (intent === "update-profile") {
    const raw = Object.fromEntries(formData);
    const parsed = updateProfileSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        intent: "update-profile",
        errors: parsed.error.flatten().fieldErrors,
        success: null,
      };
    }

    queries.auth.updateUser(sessionUser.id, {
      name: parsed.data.name,
      email: parsed.data.email,
    });
    return { intent: "update-profile", errors: null, success: "Profile updated" };
  }

  if (intent === "change-password") {
    const raw = Object.fromEntries(formData);
    const parsed = changePasswordSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        intent: "change-password",
        errors: parsed.error.flatten().fieldErrors,
        success: null,
      };
    }

    try {
      queries.auth.changePassword(
        sessionUser.id,
        parsed.data.currentPassword,
        parsed.data.newPassword
      );
      return {
        intent: "change-password",
        errors: null,
        success: "Password changed",
      };
    } catch (e) {
      return {
        intent: "change-password",
        errors: {
          currentPassword: [
            e instanceof Error ? e.message : "Password change failed",
          ],
        },
        success: null,
      };
    }
  }

  return { intent: null, errors: null, success: null };
}

export default function Profile() {
  const { profile } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>() as
    | ProfileActionData
    | undefined;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const profileErrors =
    actionData?.intent === "update-profile" ? actionData.errors : null;
  const profileSuccess =
    actionData?.intent === "update-profile" ? actionData.success : null;
  const passwordErrors =
    actionData?.intent === "change-password" ? actionData.errors : null;
  const passwordSuccess =
    actionData?.intent === "change-password" ? actionData.success : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account settings.
        </p>
      </div>

      {/* Profile Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Your Profile</CardTitle>
            <Badge variant="secondary">
              {roleLabels[profile.role] ?? profile.role}
            </Badge>
          </div>
          <CardDescription>Update your name and email.</CardDescription>
        </CardHeader>
        <CardContent>
          {profileSuccess && (
            <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
              {profileSuccess}
            </div>
          )}
          <Form method="post" className="space-y-4">
            <input type="hidden" name="intent" value="update-profile" />
            <div className="space-y-1">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={profile.name}
                required
                className="min-h-[44px]"
              />
              {profileErrors?.name && (
                <p className="text-xs text-destructive">
                  {profileErrors.name[0]}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={profile.email}
                required
                className="min-h-[44px]"
              />
              {profileErrors?.email && (
                <p className="text-xs text-destructive">
                  {profileErrors.email[0]}
                </p>
              )}
            </div>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[44px]"
            >
              Save Profile
            </Button>
          </Form>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change Password</CardTitle>
          <CardDescription>
            Enter your current password and a new password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {passwordSuccess && (
            <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
              {passwordSuccess}
            </div>
          )}
          <Form method="post" className="space-y-4">
            <input type="hidden" name="intent" value="change-password" />
            <div className="space-y-1">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                required
                className="min-h-[44px]"
              />
              {passwordErrors?.currentPassword && (
                <p className="text-xs text-destructive">
                  {passwordErrors.currentPassword[0]}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                minLength={8}
                className="min-h-[44px]"
              />
              {passwordErrors?.newPassword && (
                <p className="text-xs text-destructive">
                  {passwordErrors.newPassword[0]}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className="min-h-[44px]"
              />
              {passwordErrors?.confirmPassword && (
                <p className="text-xs text-destructive">
                  {passwordErrors.confirmPassword[0]}
                </p>
              )}
            </div>
            <Button
              type="submit"
              variant="outline"
              disabled={isSubmitting}
              className="min-h-[44px]"
            >
              Change Password
            </Button>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
