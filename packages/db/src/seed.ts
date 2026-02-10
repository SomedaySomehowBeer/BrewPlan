import { db } from "./client";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { queries } from "./queries/index";
import * as schema from "./schema/index";

// Run migrations first
migrate(db, { migrationsFolder: "./src/migrations" });
console.log("Migrations applied.");

const now = new Date().toISOString();

// ── Seed Admin User ──────────────────────────────────
const email = process.env.SEED_USER_EMAIL || "admin@brewplan.local";
const password = process.env.SEED_USER_PASSWORD || "changeme";
const name = process.env.SEED_USER_NAME || "Brewer";

const existingUser = queries.auth.getUserByEmail(email);
if (!existingUser) {
  queries.auth.createUser({ email, password, name, role: "admin" });
  console.log(`Created admin user: ${email}`);
} else {
  console.log(`Admin user already exists: ${email}`);
}

// Seed additional test users (brewer and viewer)
const testUsers = [
  { email: "brewer@brewplan.local", password: "changeme", name: "Test Brewer", role: "brewer" as const },
  { email: "viewer@brewplan.local", password: "changeme", name: "Test Viewer", role: "viewer" as const },
];
for (const tu of testUsers) {
  const existing = queries.auth.getUserByEmail(tu.email);
  if (!existing) {
    queries.auth.createUser(tu);
    console.log(`Created ${tu.role} user: ${tu.email}`);
  }
}

// ── Seed Inventory Items ─────────────────────────────
const inventoryData = [
  { name: "Pale Malt (Barrett Burston)", category: "grain" as const, unit: "kg" as const, unitCost: 3.5, isGlutenFree: true, subcategory: "Base Malt", countryOfOrigin: "Australia", reorderPoint: 25, reorderQty: 50 },
  { name: "Munich Malt", category: "grain" as const, unit: "kg" as const, unitCost: 4.2, isGlutenFree: true, subcategory: "Specialty Malt", countryOfOrigin: "Germany", reorderPoint: 10, reorderQty: 25 },
  { name: "Crystal 60", category: "grain" as const, unit: "kg" as const, unitCost: 5.0, isGlutenFree: true, subcategory: "Specialty Malt", countryOfOrigin: "UK", reorderPoint: 5, reorderQty: 10 },
  { name: "Millet Malt", category: "grain" as const, unit: "kg" as const, unitCost: 6.0, isGlutenFree: true, subcategory: "GF Base Malt", countryOfOrigin: "Australia", reorderPoint: 20, reorderQty: 40 },
  { name: "Buckwheat Malt", category: "grain" as const, unit: "kg" as const, unitCost: 7.5, isGlutenFree: true, subcategory: "GF Specialty Malt", countryOfOrigin: "Australia", reorderPoint: 10, reorderQty: 20 },
  { name: "Rice Malt", category: "grain" as const, unit: "kg" as const, unitCost: 5.5, isGlutenFree: true, subcategory: "GF Base Malt", countryOfOrigin: "Australia", reorderPoint: 15, reorderQty: 30 },
  { name: "Cascade Hops", category: "hop" as const, unit: "g" as const, unitCost: 0.06, isGlutenFree: true, subcategory: "Bittering Hop", countryOfOrigin: "USA", reorderPoint: 500, reorderQty: 1000 },
  { name: "Citra Hops", category: "hop" as const, unit: "g" as const, unitCost: 0.08, isGlutenFree: true, subcategory: "Aroma Hop", countryOfOrigin: "USA", reorderPoint: 500, reorderQty: 1000 },
  { name: "Galaxy Hops", category: "hop" as const, unit: "g" as const, unitCost: 0.09, isGlutenFree: true, subcategory: "Dual Purpose Hop", countryOfOrigin: "Australia", reorderPoint: 500, reorderQty: 1000 },
  { name: "Safale US-05", category: "yeast" as const, unit: "each" as const, unitCost: 8.0, isGlutenFree: true, subcategory: "Dry Yeast", countryOfOrigin: "Belgium", reorderPoint: 5, reorderQty: 10 },
  { name: "Clarity Ferm", category: "adjunct" as const, unit: "ml" as const, unitCost: 0.5, isGlutenFree: true, subcategory: "Enzyme", notes: "Gluten-reducing enzyme" },
  { name: "Gypsum (CaSO4)", category: "water_chemistry" as const, unit: "g" as const, unitCost: 0.02, isGlutenFree: true, subcategory: "Water Salt" },
];

const inventoryItems: Record<string, string> = {};
for (const item of inventoryData) {
  const existing = db
    .select()
    .from(schema.inventoryItems)
    .where(
      eq(schema.inventoryItems.name, item.name)
    )
    .get();
  if (!existing) {
    const created = queries.inventory.create(item);
    inventoryItems[item.name] = created.id;
    console.log(`Created inventory item: ${item.name}`);
  } else {
    inventoryItems[item.name] = existing.id;
    console.log(`Inventory item exists: ${item.name}`);
  }
}

// ── Seed Inventory Lots ──────────────────────────────
const lotData = [
  { itemName: "Millet Malt", lotNumber: "MM-2026-001", quantity: 50, unitCost: 6.0, location: "Dry store" },
  { itemName: "Buckwheat Malt", lotNumber: "BW-2026-001", quantity: 25, unitCost: 7.5, location: "Dry store" },
  { itemName: "Rice Malt", lotNumber: "RM-2026-001", quantity: 30, unitCost: 5.5, location: "Dry store" },
  { itemName: "Cascade Hops", lotNumber: "CH-2026-001", quantity: 2000, unitCost: 0.06, location: "Cold store" },
  { itemName: "Citra Hops", lotNumber: "CT-2026-001", quantity: 1500, unitCost: 0.08, location: "Cold store" },
  { itemName: "Galaxy Hops", lotNumber: "GX-2026-001", quantity: 1000, unitCost: 0.09, location: "Cold store" },
  { itemName: "Safale US-05", lotNumber: "US05-2026-001", quantity: 10, unitCost: 8.0, location: "Yeast fridge" },
  { itemName: "Clarity Ferm", lotNumber: "CF-2026-001", quantity: 500, unitCost: 0.5, location: "Yeast fridge" },
  { itemName: "Gypsum (CaSO4)", lotNumber: "GY-2026-001", quantity: 5000, unitCost: 0.02, location: "Dry store" },
];

for (const lot of lotData) {
  const itemId = inventoryItems[lot.itemName];
  if (!itemId) continue;

  const existing = db
    .select()
    .from(schema.inventoryLots)
    .where(
      eq(schema.inventoryLots.lotNumber, lot.lotNumber)
    )
    .get();

  if (!existing) {
    const item = db
      .select()
      .from(schema.inventoryItems)
      .where(eq(schema.inventoryItems.id, itemId))
      .get();
    queries.inventory.createLot({
      inventoryItemId: itemId,
      lotNumber: lot.lotNumber,
      quantityOnHand: lot.quantity,
      unit: item!.unit as "kg" | "g" | "ml" | "l" | "each",
      unitCost: lot.unitCost,
      receivedDate: "2026-01-15",
      location: lot.location,
    });
    console.log(`Created lot: ${lot.lotNumber}`);
  } else {
    console.log(`Lot exists: ${lot.lotNumber}`);
  }
}

// ── Seed Recipes ─────────────────────────────────────
const recipeData = [
  {
    name: "GF Pale Ale",
    style: "American Pale Ale",
    description: "A clean, crisp gluten-free pale ale with citrus hop character.",
    batchSizeLitres: 50,
    boilDurationMinutes: 60,
    mashTempCelsius: 65,
    targetOg: 1.052,
    targetFg: 1.012,
    targetAbv: 5.2,
    targetIbu: 35,
    targetSrm: 6,
    estimatedBrewDays: 1,
    estimatedFermentationDays: 14,
    estimatedConditioningDays: 7,
    ingredients: [
      { itemName: "Millet Malt", quantity: 5, unit: "kg" as const, usageStage: "mash" as const, sortOrder: 0, notes: undefined },
      { itemName: "Rice Malt", quantity: 2.5, unit: "kg" as const, usageStage: "mash" as const, sortOrder: 1, notes: undefined },
      { itemName: "Cascade Hops", quantity: 30, unit: "g" as const, usageStage: "boil" as const, useTimeMinutes: 60, sortOrder: 2, notes: undefined },
      { itemName: "Citra Hops", quantity: 20, unit: "g" as const, usageStage: "boil" as const, useTimeMinutes: 15, sortOrder: 3, notes: undefined },
      { itemName: "Citra Hops", quantity: 30, unit: "g" as const, usageStage: "dry_hop" as const, useTimeMinutes: 4320, sortOrder: 4, notes: "3-day dry hop" },
      { itemName: "Safale US-05", quantity: 1, unit: "each" as const, usageStage: "ferment" as const, sortOrder: 5, notes: undefined },
      { itemName: "Clarity Ferm", quantity: 10, unit: "ml" as const, usageStage: "ferment" as const, sortOrder: 6, notes: undefined },
    ],
  },
  {
    name: "GF Session IPA",
    style: "Session IPA",
    description: "Low ABV, big hop aroma. Gluten-free and refreshing.",
    batchSizeLitres: 50,
    boilDurationMinutes: 60,
    mashTempCelsius: 63,
    targetOg: 1.042,
    targetFg: 1.008,
    targetAbv: 4.4,
    targetIbu: 45,
    targetSrm: 5,
    estimatedBrewDays: 1,
    estimatedFermentationDays: 10,
    estimatedConditioningDays: 5,
    ingredients: [
      { itemName: "Millet Malt", quantity: 4, unit: "kg" as const, usageStage: "mash" as const, sortOrder: 0, notes: undefined },
      { itemName: "Rice Malt", quantity: 2, unit: "kg" as const, usageStage: "mash" as const, sortOrder: 1, notes: undefined },
      { itemName: "Galaxy Hops", quantity: 25, unit: "g" as const, usageStage: "boil" as const, useTimeMinutes: 60, sortOrder: 2, notes: undefined },
      { itemName: "Galaxy Hops", quantity: 40, unit: "g" as const, usageStage: "whirlpool" as const, useTimeMinutes: 20, sortOrder: 3, notes: undefined },
      { itemName: "Galaxy Hops", quantity: 50, unit: "g" as const, usageStage: "dry_hop" as const, useTimeMinutes: 4320, sortOrder: 4, notes: "3-day dry hop" },
      { itemName: "Safale US-05", quantity: 1, unit: "each" as const, usageStage: "ferment" as const, sortOrder: 5, notes: undefined },
      { itemName: "Clarity Ferm", quantity: 10, unit: "ml" as const, usageStage: "ferment" as const, sortOrder: 6, notes: undefined },
    ],
  },
  {
    name: "GF Golden Lager",
    style: "Golden Lager",
    description: "A clean, malty gluten-free lager. Easy drinking.",
    batchSizeLitres: 50,
    boilDurationMinutes: 60,
    mashTempCelsius: 64,
    targetOg: 1.048,
    targetFg: 1.010,
    targetAbv: 5.0,
    targetIbu: 20,
    targetSrm: 4,
    estimatedBrewDays: 1,
    estimatedFermentationDays: 21,
    estimatedConditioningDays: 14,
    ingredients: [
      { itemName: "Millet Malt", quantity: 5.5, unit: "kg" as const, usageStage: "mash" as const, sortOrder: 0, notes: undefined },
      { itemName: "Rice Malt", quantity: 3, unit: "kg" as const, usageStage: "mash" as const, sortOrder: 1, notes: undefined },
      { itemName: "Cascade Hops", quantity: 20, unit: "g" as const, usageStage: "boil" as const, useTimeMinutes: 60, sortOrder: 2, notes: undefined },
      { itemName: "Safale US-05", quantity: 1, unit: "each" as const, usageStage: "ferment" as const, sortOrder: 3, notes: undefined },
      { itemName: "Clarity Ferm", quantity: 10, unit: "ml" as const, usageStage: "ferment" as const, sortOrder: 4, notes: undefined },
      { itemName: "Gypsum (CaSO4)", quantity: 5, unit: "g" as const, usageStage: "mash" as const, sortOrder: 5, notes: undefined },
    ],
  },
];

const recipeIds: Record<string, string> = {};
for (const recipeInput of recipeData) {
  const { ingredients, ...recipeFields } = recipeInput;

  const existing = db
    .select()
    .from(schema.recipes)
    .where(eq(schema.recipes.name, recipeFields.name))
    .get();

  if (!existing) {
    const recipe = queries.recipes.create(recipeFields);
    queries.recipes.setStatus(recipe.id, "active");
    recipeIds[recipeFields.name] = recipe.id;

    for (const ing of ingredients) {
      const itemId = inventoryItems[ing.itemName];
      if (!itemId) {
        console.log(`  Warning: inventory item not found: ${ing.itemName}`);
        continue;
      }
      queries.recipes.addIngredient(recipe.id, {
        inventoryItemId: itemId,
        quantity: ing.quantity,
        unit: ing.unit,
        usageStage: ing.usageStage,
        useTimeMinutes: ing.useTimeMinutes ?? null,
        sortOrder: ing.sortOrder,
        notes: ing.notes ?? null,
      });
    }
    console.log(`Created recipe: ${recipeFields.name} with ${ingredients.length} ingredients`);
  } else {
    recipeIds[recipeFields.name] = existing.id;
    console.log(`Recipe exists: ${recipeFields.name}`);
  }
}

// ── Seed Vessels ─────────────────────────────────────
const vesselData = [
  { name: "FV1", vesselType: "fermenter" as const, capacityLitres: 60, location: "Fermentation room" },
  { name: "FV2", vesselType: "fermenter" as const, capacityLitres: 60, location: "Fermentation room" },
  { name: "FV3", vesselType: "fermenter" as const, capacityLitres: 120, location: "Fermentation room" },
  { name: "Kettle", vesselType: "kettle" as const, capacityLitres: 70, location: "Brewhouse" },
];

const vesselIds: Record<string, string> = {};
for (const v of vesselData) {
  const existing = db
    .select()
    .from(schema.vessels)
    .where(eq(schema.vessels.name, v.name))
    .get();

  if (!existing) {
    const vessel = queries.vessels.create(v);
    vesselIds[v.name] = vessel.id;
    console.log(`Created vessel: ${v.name}`);
  } else {
    vesselIds[v.name] = existing.id;
    console.log(`Vessel exists: ${v.name}`);
  }
}

// ── Seed Batches ─────────────────────────────────────
const paleAleId = recipeIds["GF Pale Ale"];
const sessionIpaId = recipeIds["GF Session IPA"];
const fv1Id = vesselIds["FV1"];
const fv2Id = vesselIds["FV2"];

if (paleAleId && fv1Id) {
  const existingBatches = db.select().from(schema.brewBatches).all();
  if (existingBatches.length === 0) {
    // A planned batch
    const batch1 = queries.batches.create({
      recipeId: paleAleId,
      plannedDate: "2026-02-15",
      batchSizeLitres: 50,
      vesselId: fv1Id,
      notes: "First brew of the year",
    });
    console.log(`Created batch: ${batch1.batchNumber} (planned)`);

    // A fermenting batch
    if (sessionIpaId && fv2Id) {
      const batch2 = queries.batches.create({
        recipeId: sessionIpaId,
        plannedDate: "2026-02-01",
        batchSizeLitres: 50,
        vesselId: fv2Id,
      });
      // Transition through to fermenting
      queries.batches.update(batch2.id, {
        actualOg: 1.044,
        actualVolumeLitres: 48,
      });
      queries.batches.transition(batch2.id, "brewing");
      // Add a consumption record so we can transition to fermenting
      const recipeWithIngredients = queries.recipes.getWithIngredients(sessionIpaId);
      if (recipeWithIngredients && recipeWithIngredients.ingredients.length > 0) {
        const lots = db.select().from(schema.inventoryLots).all();
        if (lots.length > 0) {
          queries.batches.recordConsumption(batch2.id, {
            recipeIngredientId: recipeWithIngredients.ingredients[0].id,
            inventoryLotId: lots[0].id,
            plannedQuantity: 4,
            actualQuantity: 4,
            unit: "kg",
            usageStage: "mash",
          });
        }
      }
      queries.batches.transition(batch2.id, "fermenting");

      // Add some fermentation log entries
      queries.batches.addFermentationEntry(batch2.id, {
        gravity: 1.044,
        temperatureCelsius: 18,
        ph: 4.2,
        notes: "Pitch day",
        loggedBy: name,
      });
      queries.batches.addFermentationEntry(batch2.id, {
        gravity: 1.030,
        temperatureCelsius: 19,
        ph: 4.1,
        notes: "Active fermentation",
        loggedBy: name,
      });
      console.log(`Created batch: ${batch2.batchNumber} (fermenting, with log entries)`);
    }
  } else {
    console.log("Batches already exist, skipping.");
  }
}

// ── Seed Suppliers ───────────────────────────────────
const supplierData = [
  {
    name: "Grouse Malting",
    contactName: "Sarah Mitchell",
    email: "orders@grousemalting.com.au",
    phone: "08 9756 1234",
    address: "42 Industrial Way, Brunswick WA 6224",
    website: "https://grousemalting.com.au",
    paymentTerms: "Net 30",
    leadTimeDays: 5,
    minimumOrderValue: 200,
    notes: "Primary GF malt supplier. Local to WA.",
  },
  {
    name: "Hopco Australia",
    contactName: "David Chen",
    email: "sales@hopco.com.au",
    phone: "03 9421 5678",
    address: "15 Hop Lane, Myrtleford VIC 3737",
    paymentTerms: "Net 14",
    leadTimeDays: 7,
    minimumOrderValue: 150,
    notes: "Australian and imported hops.",
  },
  {
    name: "YeastWest",
    contactName: "Lisa Park",
    email: "info@yeastwest.com.au",
    phone: "08 9335 9012",
    address: "8 Ferment Drive, Fremantle WA 6160",
    paymentTerms: "COD",
    leadTimeDays: 3,
    minimumOrderValue: 50,
    notes: "Yeast and enzymes. Same-week delivery in WA.",
  },
];

const supplierIds: Record<string, string> = {};
for (const sup of supplierData) {
  const existing = db
    .select()
    .from(schema.suppliers)
    .where(eq(schema.suppliers.name, sup.name))
    .get();

  if (!existing) {
    const created = queries.suppliers.create(sup);
    supplierIds[sup.name] = created.id;
    console.log(`Created supplier: ${sup.name}`);
  } else {
    supplierIds[sup.name] = existing.id;
    console.log(`Supplier exists: ${sup.name}`);
  }
}

// Link inventory items to suppliers
const itemSupplierMap: Record<string, string> = {
  "Millet Malt": "Grouse Malting",
  "Buckwheat Malt": "Grouse Malting",
  "Rice Malt": "Grouse Malting",
  "Cascade Hops": "Hopco Australia",
  "Citra Hops": "Hopco Australia",
  "Galaxy Hops": "Hopco Australia",
  "Safale US-05": "YeastWest",
  "Clarity Ferm": "YeastWest",
};

for (const [itemName, supplierName] of Object.entries(itemSupplierMap)) {
  const itemId = inventoryItems[itemName];
  const supplierId = supplierIds[supplierName];
  if (itemId && supplierId) {
    const item = db
      .select()
      .from(schema.inventoryItems)
      .where(eq(schema.inventoryItems.id, itemId))
      .get();
    if (item && !item.supplierId) {
      queries.inventory.update(itemId, { supplierId } as Record<string, unknown>);
      console.log(`Linked ${itemName} → ${supplierName}`);
    }
  }
}

// ── Seed Customers ──────────────────────────────────
const customerData = [
  {
    name: "The Eagle Bar",
    customerType: "venue" as const,
    contactName: "James O'Brien",
    email: "james@theeaglebar.com.au",
    phone: "08 9755 2345",
    addressLine1: "12 Queen Street",
    city: "Busselton",
    state: "WA",
    postcode: "6280",
    paymentTerms: "Net 14",
    deliveryInstructions: "Rear loading dock, ring bell",
  },
  {
    name: "Vasse Valley Wines & Beer",
    customerType: "bottle_shop" as const,
    contactName: "Kim Nguyen",
    email: "kim@vassevalley.com.au",
    phone: "08 9756 3456",
    addressLine1: "88 Bussell Highway",
    city: "Vasse",
    state: "WA",
    postcode: "6280",
    paymentTerms: "Net 30",
  },
  {
    name: "Margaret River Markets",
    customerType: "market" as const,
    contactName: "Community Markets Inc",
    email: "stalls@mrmarkets.com.au",
    phone: "08 9757 4567",
    addressLine1: "Education Drive",
    city: "Margaret River",
    state: "WA",
    postcode: "6285",
    paymentTerms: "COD",
    deliveryInstructions: "Saturday mornings only. Stall 22.",
  },
  {
    name: "Taproom Walk-in",
    customerType: "taproom" as const,
    notes: "Walk-in taproom sales. No delivery needed.",
  },
];

const customerIds: Record<string, string> = {};
for (const cust of customerData) {
  const existing = db
    .select()
    .from(schema.customers)
    .where(eq(schema.customers.name, cust.name))
    .get();

  if (!existing) {
    const created = queries.customers.create(cust);
    customerIds[cust.name] = created.id;
    console.log(`Created customer: ${cust.name}`);
  } else {
    customerIds[cust.name] = existing.id;
    console.log(`Customer exists: ${cust.name}`);
  }
}

// ── Seed a Draft PO ─────────────────────────────────
const grouseMaltingId = supplierIds["Grouse Malting"];
if (grouseMaltingId) {
  const existingPOs = db.select().from(schema.purchaseOrders).all();
  if (existingPOs.length === 0) {
    const po = queries.purchasing.create({
      supplierId: grouseMaltingId,
      expectedDeliveryDate: "2026-02-20",
      notes: "Restock GF malts for February brews",
    });
    // Add lines
    const milletId = inventoryItems["Millet Malt"];
    const buckwheatId = inventoryItems["Buckwheat Malt"];
    if (milletId) {
      queries.purchasing.addLine(po.id, {
        inventoryItemId: milletId,
        quantityOrdered: 50,
        unit: "kg",
        unitCost: 6.0,
      });
    }
    if (buckwheatId) {
      queries.purchasing.addLine(po.id, {
        inventoryItemId: buckwheatId,
        quantityOrdered: 25,
        unit: "kg",
        unitCost: 7.5,
      });
    }
    console.log(`Created PO: ${po.poNumber} (draft)`);
  } else {
    console.log("POs already exist, skipping.");
  }
}

// ── Seed a Draft Order ──────────────────────────────
const eagleBarId = customerIds["The Eagle Bar"];
if (eagleBarId && paleAleId) {
  const existingOrders = db.select().from(schema.orders).all();
  if (existingOrders.length === 0) {
    const order = queries.orders.create({
      customerId: eagleBarId,
      deliveryDate: "2026-03-01",
      channel: "wholesale",
      notes: "Monthly keg order",
    });
    queries.orders.addLine(order.id, {
      recipeId: paleAleId,
      format: "keg_50l",
      quantity: 3,
      unitPrice: 250,
    });
    if (sessionIpaId) {
      queries.orders.addLine(order.id, {
        recipeId: sessionIpaId,
        format: "keg_50l",
        quantity: 2,
        unitPrice: 230,
      });
    }
    console.log(`Created order: ${order.orderNumber} (draft)`);
  } else {
    console.log("Orders already exist, skipping.");
  }
}

// ── Seed Brewery Profile ──────────────────────────────
const existingProfile = queries.settings.getProfile();
if (!existingProfile) {
  queries.settings.updateProfile({
    name: "Someday Somehow Brewing",
    address: "42 Brewers Lane, Vasse WA 6280",
    phone: "08 9756 7890",
    email: "brew@somedaysomehow.com.au",
    website: "https://somedaysomehow.com.au",
    abn: "12 345 678 901",
    liquorLicenceNumber: "LIQ-2025-0042",
    defaultCurrency: "AUD",
    defaultBatchPrefix: "BP",
    defaultOrderPrefix: "ORD",
    defaultPoPrefix: "PO",
    invoiceFooter: "Payment: BSB 036-042, Acc 123456. Terms: Net 14 days.",
  });
  console.log("Created brewery profile: Someday Somehow Brewing");
} else {
  console.log("Brewery profile exists.");
}

// ── Seed Sample Quality Checks ───────────────────────
const allBatches = db.select().from(schema.brewBatches).all();
const fermentingBatch = allBatches.find((b) => b.status === "fermenting");
if (fermentingBatch) {
  const existingQC = queries.quality.listByBatch(fermentingBatch.id);
  if (existingQC.length === 0) {
    queries.quality.create({
      brewBatchId: fermentingBatch.id,
      checkType: "pre_ferment",
      checkedBy: name,
      ph: 5.3,
      notes: "Pre-ferment check — pH within range, good wort clarity.",
      result: "pass",
    });
    queries.quality.create({
      brewBatchId: fermentingBatch.id,
      checkType: "mid_ferment",
      checkedBy: name,
      ph: 4.2,
      dissolvedOxygen: 0.03,
      notes: "Mid-ferment check — healthy fermentation activity.",
      result: "pass",
    });
    console.log(`Created 2 quality checks for batch ${fermentingBatch.batchNumber}`);
  } else {
    console.log("Quality checks already exist, skipping.");
  }
}

// ── Seed Sample Process Steps ────────────────────────
const paleAleRecipeId = recipeIds["GF Pale Ale"];
if (paleAleRecipeId) {
  const existingSteps = queries.recipes.getProcessSteps(paleAleRecipeId);
  if (existingSteps.length === 0) {
    queries.recipes.addProcessStep(paleAleRecipeId, {
      stage: "mash",
      instruction: "Single infusion mash at 65°C for 60 minutes. Adjust pH to 5.2-5.4 with lactic acid if needed.",
      durationMinutes: 60,
      temperatureCelsius: 65,
      sortOrder: 0,
    });
    queries.recipes.addProcessStep(paleAleRecipeId, {
      stage: "boil",
      instruction: "60-minute boil. Add bittering hops at start, aroma hops at 15 minutes remaining.",
      durationMinutes: 60,
      temperatureCelsius: 100,
      sortOrder: 1,
    });
    queries.recipes.addProcessStep(paleAleRecipeId, {
      stage: "ferment",
      instruction: "Cool to 18°C, pitch yeast and Clarity Ferm. Ferment at 18-20°C for 7-10 days.",
      durationMinutes: null,
      temperatureCelsius: 18,
      sortOrder: 2,
    });
    queries.recipes.addProcessStep(paleAleRecipeId, {
      stage: "ferment",
      instruction: "Dry hop at day 5, leave for 3 days. Cold crash at 2°C for 48 hours.",
      durationMinutes: null,
      temperatureCelsius: 2,
      sortOrder: 3,
    });
    console.log("Created 4 process steps for GF Pale Ale");
  } else {
    console.log("Process steps already exist, skipping.");
  }
}

console.log("\nSeed complete!");
