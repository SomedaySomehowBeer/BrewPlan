import {
  Form,
  useLoaderData,
  useActionData,
  useNavigation,
} from "react-router";
import type { Route } from "./+types/recipes.$id.process";
import { requireUser } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { recipeProcessStepSchema } from "@brewplan/shared";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "~/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Trash2, Plus } from "lucide-react";

const stageLabels: Record<string, string> = {
  mash: "Mash",
  boil: "Boil",
  whirlpool: "Whirlpool",
  ferment: "Ferment",
  condition: "Condition",
  package: "Package",
};

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireUser(request);

  const recipe = queries.recipes.get(params.id);
  if (!recipe) {
    throw new Response("Recipe not found", { status: 404 });
  }

  const steps = queries.recipes.getProcessSteps(params.id);
  return { recipe, steps };
}

export async function action({ request, params }: Route.ActionArgs) {
  await requireUser(request);

  const formData = await request.formData();
  const intent = String(formData.get("intent"));

  if (intent === "add") {
    const raw = {
      stage: formData.get("stage"),
      instruction: formData.get("instruction"),
      durationMinutes: formData.get("durationMinutes") || null,
      temperatureCelsius: formData.get("temperatureCelsius") || null,
      sortOrder: formData.get("sortOrder") || "0",
    };

    const result = recipeProcessStepSchema.safeParse(raw);
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0];
        if (key) errors[String(key)] = issue.message;
      }
      return { errors, values: raw, intent: "add" };
    }

    queries.recipes.addProcessStep(params.id, result.data);
    return { ok: true, intent: "add" };
  }

  if (intent === "remove") {
    const stepId = String(formData.get("stepId"));
    if (stepId) {
      queries.recipes.removeProcessStep(stepId);
    }
    return { ok: true, intent: "remove" };
  }

  return { ok: false };
}

export default function RecipeProcess() {
  const { recipe, steps } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const errors =
    actionData?.intent === "add"
      ? (actionData as { errors?: Record<string, string> })?.errors
      : undefined;
  const values =
    actionData?.intent === "add"
      ? (actionData as { values?: Record<string, unknown> })?.values
      : undefined;

  return (
    <div className="space-y-6">
      {/* Add process step form */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4" />
            Add Process Step
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-4">
            <input type="hidden" name="intent" value="add" />

            {errors && Object.keys(errors).length > 0 && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                Please fix the errors below.
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label htmlFor="stage">Stage *</Label>
                <Select
                  name="stage"
                  defaultValue={(values?.stage as string) ?? ""}
                >
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue placeholder="Select stage..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(stageLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors?.stage && (
                  <p className="text-xs text-destructive">{errors.stage}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="durationMinutes">Duration (min)</Label>
                <Input
                  id="durationMinutes"
                  name="durationMinutes"
                  type="number"
                  defaultValue={(values?.durationMinutes as string) ?? ""}
                  className="min-h-[44px]"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="temperatureCelsius">Temp (&deg;C)</Label>
                <Input
                  id="temperatureCelsius"
                  name="temperatureCelsius"
                  type="number"
                  step="0.1"
                  defaultValue={(values?.temperatureCelsius as string) ?? ""}
                  className="min-h-[44px]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="instruction">Instruction *</Label>
              <Textarea
                id="instruction"
                name="instruction"
                rows={3}
                defaultValue={(values?.instruction as string) ?? ""}
                placeholder="Describe this process step..."
              />
              {errors?.instruction && (
                <p className="text-xs text-destructive">{errors.instruction}</p>
              )}
            </div>

            <input
              type="hidden"
              name="sortOrder"
              value={steps.length}
            />

            <Button
              type="submit"
              size="lg"
              className="w-full min-h-[56px] text-base"
              disabled={isSubmitting}
            >
              Add Step
            </Button>
          </Form>
        </CardContent>
      </Card>

      {/* Process steps list */}
      {steps.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Process Steps ({steps.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className="p-4 flex items-start gap-3"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {index + 1}
                  </span>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {stageLabels[step.stage] ?? step.stage}
                      </Badge>
                      {step.durationMinutes != null && (
                        <span className="text-xs text-muted-foreground">
                          {step.durationMinutes} min
                        </span>
                      )}
                      {step.temperatureCelsius != null && (
                        <span className="text-xs text-muted-foreground">
                          {step.temperatureCelsius}&deg;C
                        </span>
                      )}
                    </div>
                    <p className="text-sm">{step.instruction}</p>
                  </div>
                  <Form method="post">
                    <input type="hidden" name="intent" value="remove" />
                    <input type="hidden" name="stepId" value={step.id} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      className="min-h-[44px] min-w-[44px] text-muted-foreground hover:text-destructive"
                      disabled={isSubmitting}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </Form>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <p>No process steps yet. Add your first step above.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
