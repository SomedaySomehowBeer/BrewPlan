import * as auth from "./auth";
import * as recipes from "./recipes";
import * as inventory from "./inventory";
import * as brewing from "./brewing";
import * as vessels from "./vessels";
import * as planning from "./planning";

export const queries = {
  auth,
  recipes,
  inventory,
  batches: brewing,
  brewing,
  vessels,
  planning,
};

export { auth, recipes, inventory, brewing, vessels, planning };
