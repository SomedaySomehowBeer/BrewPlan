import { Form, useActionData, useNavigation, redirect } from "react-router";
import type { Route } from "./+types/users.new";
import { requireAdminAccess } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { adminCreateUserSchema } from "@brewplan/shared";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdminAccess(request);
  return {};
}

export async function action({ request }: Route.ActionArgs) {
  await requireAdminAccess(request);

  const formData = await request.formData();
  const raw = Object.fromEntries(formData);
  const parsed = adminCreateUserSchema.safeParse(raw);

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const existing = queries.auth.getUserByEmail(parsed.data.email);
  if (existing) {
    return { errors: { email: ["A user with this email already exists"] } };
  }

  const user = queries.auth.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    name: parsed.data.name,
    role: parsed.data.role,
  });

  return redirect(`/users/${user.id}`);
}

export default function NewUser() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const errors = actionData?.errors;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Create New User</CardTitle>
      </CardHeader>
      <CardContent>
        <Form method="post" className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required className="min-h-[44px]" />
            {errors?.name && (
              <p className="text-xs text-destructive">{errors.name[0]}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              className="min-h-[44px]"
            />
            {errors?.email && (
              <p className="text-xs text-destructive">{errors.email[0]}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              className="min-h-[44px]"
            />
            {errors?.password && (
              <p className="text-xs text-destructive">{errors.password[0]}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="role">Role</Label>
            <select
              id="role"
              name="role"
              defaultValue="brewer"
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[44px]"
            >
              <option value="admin">Admin</option>
              <option value="brewer">Brewer</option>
              <option value="viewer">Viewer</option>
            </select>
            {errors?.role && (
              <p className="text-xs text-destructive">{errors.role[0]}</p>
            )}
          </div>
          <Button
            type="submit"
            className="w-full min-h-[44px]"
            disabled={isSubmitting}
          >
            Create User
          </Button>
        </Form>
      </CardContent>
    </Card>
  );
}
