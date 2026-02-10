import * as auth from "./auth";
import * as recipes from "./recipes";
import * as inventory from "./inventory";
import * as brewing from "./brewing";
import * as vessels from "./vessels";
import * as planning from "./planning";
import * as packaging from "./packaging";
import * as suppliers from "./suppliers";
import * as purchasing from "./purchasing";
import * as customers from "./customers";
import * as orders from "./orders";
import * as quality from "./quality";
import * as settings from "./settings";
import * as reporting from "./reporting";
import * as brewfatherImport from "./import";

export const queries = {
  auth,
  recipes,
  inventory,
  batches: brewing,
  brewing,
  vessels,
  planning,
  packaging,
  suppliers,
  purchasing,
  customers,
  orders,
  quality,
  settings,
  reporting,
  brewfatherImport,
};

export {
  auth,
  recipes,
  inventory,
  brewing,
  vessels,
  planning,
  packaging,
  suppliers,
  purchasing,
  customers,
  orders,
  quality,
  settings,
  reporting,
  brewfatherImport,
};
