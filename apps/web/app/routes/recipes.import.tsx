import {
  Form,
  useLoaderData,
  useActionData,
  useNavigation,
  redirect,
} from "react-router";
import { useState } from "react";
import type { Route } from "./+types/recipes.import";
import { requireUser } from "~/lib/auth.server";
import { queries } from "~/lib/db.server";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { ArrowLeft, Upload, FileJson, Check, AlertTriangle } from "lucide-react";
import { Link } from "react-router";

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  return {};
}

export async function action({ request }: Route.ActionArgs) {
  await requireUser(request);

  const formData = await request.formData();
  const intent = String(formData.get("intent"));

  if (intent === "preview") {
    const jsonText = String(formData.get("jsonText") ?? "");
    if (!jsonText.trim()) {
      return { error: "Please paste Brewfather JSON data", preview: null };
    }

    try {
      const raw = JSON.parse(jsonText);
      const parsed = queries.brewfatherImport.parseBrewfatherJson(raw);
      return { error: null, preview: parsed, jsonText };
    } catch (e) {
      return {
        error: `Invalid JSON: ${e instanceof Error ? e.message : "Parse error"}`,
        preview: null,
      };
    }
  }

  if (intent === "import") {
    const jsonText = String(formData.get("jsonText") ?? "");
    try {
      const raw = JSON.parse(jsonText);
      const parsed = queries.brewfatherImport.parseBrewfatherJson(raw);
      const recipe = queries.brewfatherImport.importBrewfatherRecipe(parsed);
      return redirect(`/recipes/${recipe.id}`);
    } catch (e) {
      return {
        error: `Import failed: ${e instanceof Error ? e.message : "Unknown error"}`,
        preview: null,
      };
    }
  }

  return { error: null, preview: null };
}

export default function RecipeImport() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const preview = actionData?.preview;
  const error = actionData?.error;
  const jsonText = (actionData as { jsonText?: string })?.jsonText ?? "";

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="mb-2">
        <Link to="/recipes">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Recipes
        </Link>
      </Button>

      <div>
        <h2 className="text-xl font-bold">Import from Brewfather</h2>
        <p className="text-sm text-muted-foreground">
          Paste your Brewfather recipe JSON to import it into BrewPlan.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {!preview ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileJson className="h-4 w-4" />
              Paste Brewfather JSON
            </CardTitle>
            <CardDescription>
              Export a recipe from Brewfather as JSON and paste it below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form method="post" className="space-y-4">
              <input type="hidden" name="intent" value="preview" />
              <div className="space-y-1">
                <Label htmlFor="jsonText">Recipe JSON</Label>
                <Textarea
                  id="jsonText"
                  name="jsonText"
                  rows={12}
                  placeholder='{"name": "My Recipe", ...}'
                  className="font-mono text-xs"
                  defaultValue={jsonText}
                />
              </div>
              <Button
                type="submit"
                size="lg"
                className="w-full min-h-[56px] text-base"
                disabled={isSubmitting}
              >
                <Upload className="mr-2 h-5 w-5" />
                Preview Import
              </Button>
            </Form>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Preview summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Import Preview</CardTitle>
              <CardDescription>
                Review the parsed recipe before importing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Name</span>
                  <p className="font-medium">{preview.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Style</span>
                  <p className="font-medium">{preview.style}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Batch Size</span>
                  <p className="font-medium">{preview.batchSizeLitres} L</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Boil Time</span>
                  <p className="font-medium">{preview.boilTimeMinutes} min</p>
                </div>
                {preview.targetOg && (
                  <div>
                    <span className="text-muted-foreground">Target OG</span>
                    <p className="font-mono">{preview.targetOg.toFixed(3)}</p>
                  </div>
                )}
                {preview.targetAbv && (
                  <div>
                    <span className="text-muted-foreground">Target ABV</span>
                    <p className="font-mono">{preview.targetAbv.toFixed(1)}%</p>
                  </div>
                )}
                {preview.targetIbu != null && (
                  <div>
                    <span className="text-muted-foreground">IBU</span>
                    <p className="font-mono">{preview.targetIbu}</p>
                  </div>
                )}
              </div>

              {preview.notes && (
                <div>
                  <span className="text-sm text-muted-foreground">Notes</span>
                  <p className="text-sm whitespace-pre-wrap mt-1 text-muted-foreground">
                    {preview.notes.slice(0, 300)}
                    {preview.notes.length > 300 && "..."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ingredients preview */}
          {preview.fermentables.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Fermentables ({preview.fermentables.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {preview.fermentables.map((f, i) => (
                    <div key={i} className="px-4 py-2 flex items-center justify-between text-sm">
                      <div>
                        <span className="font-medium">{f.name}</span>
                        {f.supplier && (
                          <span className="ml-2 text-muted-foreground">({f.supplier})</span>
                        )}
                      </div>
                      <Badge variant="outline">{f.amount} {f.unit}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {preview.hops.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Hops ({preview.hops.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {preview.hops.map((h, i) => (
                    <div key={i} className="px-4 py-2 flex items-center justify-between text-sm">
                      <div>
                        <span className="font-medium">{h.name}</span>
                        <span className="ml-2 text-muted-foreground">{h.use}</span>
                      </div>
                      <Badge variant="outline">{h.amount} {h.unit}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {preview.yeasts.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Yeasts ({preview.yeasts.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {preview.yeasts.map((y, i) => (
                    <div key={i} className="px-4 py-2 flex items-center justify-between text-sm">
                      <div>
                        <span className="font-medium">{y.name}</span>
                        {y.supplier && (
                          <span className="ml-2 text-muted-foreground">({y.supplier})</span>
                        )}
                      </div>
                      <Badge variant="outline">{y.amount} {y.unit}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {preview.miscs.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Miscellaneous ({preview.miscs.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {preview.miscs.map((m, i) => (
                    <div key={i} className="px-4 py-2 flex items-center justify-between text-sm">
                      <div>
                        <span className="font-medium">{m.name}</span>
                        <span className="ml-2 text-muted-foreground">{m.use}</span>
                      </div>
                      <Badge variant="outline">{m.amount} {m.unit}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <Form method="post" className="flex-1">
              <input type="hidden" name="intent" value="preview" />
              <input type="hidden" name="jsonText" value="" />
              <Button
                type="submit"
                variant="outline"
                size="lg"
                className="w-full min-h-[56px] text-base"
              >
                Start Over
              </Button>
            </Form>
            <Form method="post" className="flex-1">
              <input type="hidden" name="intent" value="import" />
              <input type="hidden" name="jsonText" value={jsonText} />
              <Button
                type="submit"
                size="lg"
                className="w-full min-h-[56px] text-base"
                disabled={isSubmitting}
              >
                <Check className="mr-2 h-5 w-5" />
                Import Recipe
              </Button>
            </Form>
          </div>
        </div>
      )}
    </div>
  );
}
