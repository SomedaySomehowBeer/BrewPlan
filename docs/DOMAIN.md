# BrewPlan — Domain Model

> Brewery management software for small-to-medium craft breweries.
> Inspired by [CraftPlan](https://github.com/puemos/craftplan), adapted for brewing operations.

---

## Domain Overview

BrewPlan covers the full brewery lifecycle:

```
Recipes → Production Planning → Brew Day → Fermentation → Packaging → Inventory → Orders → Delivery
    ↑                                                                       |
    └─── Purchasing ← Supplier Management ←────────────────────────────────┘
```

### Modules

| Module | CraftPlan Equivalent | Brewery Adaptation |
|--------|---------------------|--------------------|
| **Recipes** | Catalog & BOMs | Beer recipes with brewing-specific fields (OG, FG, IBU, SRM, ABV), ingredient bill with usage stages (mash, boil, ferment, dry-hop) |
| **Inventory** | Inventory | Raw materials + finished goods (kegs, packaged stock), lot tracking, allergen flags |
| **Brewing** | Production Batching | Brew-day workflow with vessel assignment, fermentation tracking, gravity/temp readings |
| **Vessels** | *(new)* | Fermenters, brites, kettles — capacity planning and scheduling |
| **Packaging** | *(new)* | Keg/can/bottle runs from fermented batches, finished goods into inventory |
| **Orders** | Orders | Wholesale (kegs to venues, packaged to retailers) + taproom/cellar-door sales |
| **Customers** | Customers | Venues, bottle shops, distributors, taproom walk-ins |
| **Purchasing** | Purchasing | Suppliers (maltsters, hop merchants, yeast labs, packaging suppliers), POs, receiving |
| **Planning** | Overview & Planner | Brew schedule, vessel availability, materials requirements |
| **Quality** | *(new)* | QC checkpoints — pH, DO, micro, sensory panels |
| **Settings** | Settings | Units, currency, tax config, brewery profile |

---

## 1. Recipes

A recipe is the blueprint for a beer. It defines what goes in (ingredients), how it's made (process), and what comes out (targets).

### Recipe

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| name | string | e.g. "Pale Ale v3" |
| style | string | e.g. "American Pale Ale" — free text or from BJCP list |
| status | enum | `draft`, `active`, `archived` |
| version | integer | Auto-incremented on clone/revision |
| parent_recipe_id | uuid? | FK → Recipe. Links versions together |
| description | text | Tasting notes, story, brewer's notes |
| batch_size_litres | decimal | Target volume into fermenter |
| boil_duration_minutes | integer | Typically 60 |
| mash_temp_celsius | decimal? | Single-infusion target (detailed mash steps optional) |
| target_og | decimal? | Original gravity e.g. 1.052 |
| target_fg | decimal? | Final gravity e.g. 1.012 |
| target_abv | decimal? | Calculated or manual override |
| target_ibu | decimal? | Bitterness |
| target_srm | decimal? | Colour |
| target_co2_volumes | decimal? | Carbonation level |
| estimated_brew_days | integer | Days for brew day + transfer (typically 1) |
| estimated_fermentation_days | integer | Days in primary fermentation (e.g. 7–14) |
| estimated_conditioning_days | integer | Days conditioning/cold crash (e.g. 3–14) |
| estimated_total_days | integer | Generated: brew + fermentation + conditioning. Calendar days from brew to ready-to-package. |
| notes | text? | Internal brewing notes |
| photo_url | string? | Hero image (Tigris) |
| created_at | datetime | |
| updated_at | datetime | |

### Recipe Ingredient (BOM Line)

Each ingredient is assigned to a **usage stage** — this is the key brewing-specific adaptation of CraftPlan's generic BOM.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| recipe_id | uuid | FK → Recipe |
| inventory_item_id | uuid | FK → InventoryItem |
| quantity | decimal | Amount per batch |
| unit | enum | `kg`, `g`, `ml`, `l`, `each` |
| usage_stage | enum | `mash`, `boil`, `whirlpool`, `ferment`, `dry_hop`, `package`, `other` |
| use_time_minutes | integer? | Time in stage (e.g. 60 min boil addition, 3-day dry hop) |
| sort_order | integer | Display ordering within stage |
| notes | string? | e.g. "Add at flameout" |

**Aggregates (calculated):**
- `total_grain_kg` — sum of mash-stage grain quantities
- `total_hop_g` — sum of all hop additions
- `estimated_cost` — sum of (quantity × inventory_item.unit_cost) across all ingredients
- `cost_per_litre` — estimated_cost ÷ batch_size_litres

### Recipe Process Step *(optional — Phase 3+)*

For breweries that want to document their process beyond just ingredients.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| recipe_id | uuid | FK → Recipe |
| stage | enum | `mash`, `boil`, `whirlpool`, `ferment`, `condition`, `package` |
| instruction | text | Free text step description |
| duration_minutes | integer? | How long this step takes |
| temperature_celsius | decimal? | Target temp for this step |
| sort_order | integer | |

---

## 2. Inventory

Inventory tracks two categories: **raw materials** (inputs to brewing) and **finished goods** (beer ready for sale).

### Inventory Item (Material Master)

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| name | string | e.g. "Pale Malt (Barrett Burston)" |
| sku | string? | Internal code |
| category | enum | `grain`, `hop`, `yeast`, `adjunct`, `water_chemistry`, `packaging`, `cleaning`, `other` |
| subcategory | string? | Free text e.g. "Base Malt", "Bittering Hop" |
| unit | enum | `kg`, `g`, `ml`, `l`, `each` |
| unit_cost | decimal | Current average cost per unit |
| supplier_id | uuid? | FK → Supplier (primary supplier) |
| reorder_point | decimal? | Low-stock threshold |
| reorder_qty | decimal? | Default reorder quantity |
| minimum_order_qty | decimal? | Supplier's minimum order quantity for this item |
| allergens | string[]? | e.g. `["gluten"]` — critical for GF brewery! |
| is_gluten_free | boolean | Quick filter flag |
| country_of_origin | string? | |
| notes | text? | |
| photo_url | string? | |
| archived | boolean | Soft-delete |
| created_at | datetime | |
| updated_at | datetime | |

### Inventory Lot

Lot tracking for traceability — know exactly which bag of malt went into which brew.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| inventory_item_id | uuid | FK → InventoryItem |
| lot_number | string | Supplier's lot/batch number |
| quantity_on_hand | decimal | Current stock in this lot |
| unit | enum | Matches parent item's unit |
| unit_cost | decimal | Actual cost paid for this lot |
| received_date | date | When it arrived |
| expiry_date | date? | Best-before / use-by |
| purchase_order_id | uuid? | FK → PurchaseOrder (how it arrived) |
| location | string? | e.g. "Cold store", "Dry store bay 3" |
| notes | string? | |
| created_at | datetime | |

### Stock Movement

Every change to inventory is logged as a movement.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| inventory_lot_id | uuid | FK → InventoryLot |
| movement_type | enum | `received`, `consumed`, `adjusted`, `transferred`, `returned`, `written_off` |
| quantity | decimal | Positive = in, Negative = out |
| reference_type | string? | Polymorphic: `brew_batch`, `purchase_order`, `packaging_run`, `adjustment` |
| reference_id | uuid? | FK → the related record |
| reason | string? | e.g. "Spillage", "Inventory count correction" |
| performed_by | string? | Who did it |
| created_at | datetime | |

**Aggregates (calculated):**
- `total_on_hand` per InventoryItem — sum of all lot quantities
- `total_value` — sum of (lot.quantity_on_hand × lot.unit_cost)
- `items_below_reorder` — items where total_on_hand < reorder_point
- `expiring_soon` — lots with expiry_date within N days

**Derived inventory position (no extra tables — all calculated from existing data):**

| Calculation | Formula | Source |
|-------------|---------|--------|
| `quantity_on_hand` | Sum of all lot quantities for this item | InventoryLot.quantity_on_hand |
| `quantity_allocated` | Sum of recipe ingredient quantities across BrewBatches in `planned` or `brewing` status | BrewBatch (status ∈ [planned, brewing]) → Recipe → RecipeIngredient, scaled by batch_size_litres ÷ recipe.batch_size_litres |
| `quantity_available` | `on_hand` − `allocated` | Derived |
| `quantity_on_order` | Sum of (quantity_ordered − quantity_received) across PO lines where PO status ∈ [sent, acknowledged, partially_received] | PurchaseOrderLine → PurchaseOrder |
| `quantity_projected` | `available` + `on_order` | Derived |

This approach means planned batches automatically "claim" their ingredients without any manual allocation step. Cancel a batch and the allocation disappears because the query no longer includes it. No state machine on inventory, no reservation workflow — just maths.

---

## 3. Brewing (Production)

This is the heart of the brewery — managing brews from grain to tank.

### Brew Batch

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| batch_number | string | Auto-generated or manual, e.g. "BP-2026-042" |
| recipe_id | uuid | FK → Recipe |
| status | enum | `planned`, `brewing`, `fermenting`, `conditioning`, `ready_to_package`, `packaged`, `completed`, `dumped` |
| planned_date | date? | Scheduled brew day |
| brew_date | date? | Actual brew day |
| estimated_ready_date | date? | Generated: brew_date (or planned_date) + recipe.estimated_total_days. When we expect this batch to be ready to package. |
| target_package_date | date? | Override: if an order is driving this batch, the date we need it packaged by. |
| brewer | string? | Who brewed it |
| batch_size_litres | decimal | Planned volume (from recipe, can override) |
| actual_volume_litres | decimal? | What actually went into fermenter |
| actual_og | decimal? | Measured OG |
| actual_fg | decimal? | Measured FG |
| actual_abv | decimal? | Calculated from OG/FG |
| actual_ibu | decimal? | Estimated from actual hop additions |
| vessel_id | uuid? | FK → Vessel (primary fermenter) |
| notes | text? | Brew day notes |
| cost_snapshot | json? | Frozen ingredient costs at time of brew |
| completed_at | datetime? | When batch was marked complete |
| created_at | datetime | |
| updated_at | datetime | |

**Aggregates:**
- `total_ingredient_cost` — from cost_snapshot or sum of consumed lot costs
- `cost_per_litre` — total_ingredient_cost ÷ actual_volume_litres
- `yield_efficiency` — actual_volume_litres ÷ batch_size_litres × 100
- `attenuation` — (actual_og - actual_fg) ÷ (actual_og - 1) × 100

### Brew Ingredient Consumption

Records what was actually used (vs what the recipe called for). Links batch to specific inventory lots for traceability.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| brew_batch_id | uuid | FK → BrewBatch |
| recipe_ingredient_id | uuid? | FK → RecipeIngredient (planned line) |
| inventory_lot_id | uuid | FK → InventoryLot (specific lot consumed) |
| planned_quantity | decimal | From recipe |
| actual_quantity | decimal | What was actually used |
| unit | enum | `kg`, `g`, `ml`, `l`, `each` |
| usage_stage | enum | `mash`, `boil`, `whirlpool`, `ferment`, `dry_hop`, `package` |
| notes | string? | e.g. "Substituted Galaxy for Citra — out of stock" |
| created_at | datetime | |

### Fermentation Log Entry

Track how the beer is progressing in tank. This is a brewery-specific feature with no CraftPlan equivalent.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| brew_batch_id | uuid | FK → BrewBatch |
| logged_at | datetime | When reading was taken |
| gravity | decimal? | Current gravity reading |
| temperature_celsius | decimal? | Current fermentation temp |
| ph | decimal? | pH reading |
| notes | string? | Sensory observations, actions taken |
| logged_by | string? | |

---

## 4. Vessels

Track fermenters, brites, kettles — capacity planning and knowing what's in each tank.

### Vessel

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| name | string | e.g. "FV1", "Brite Tank A", "HLT" |
| vessel_type | enum | `fermenter`, `brite`, `kettle`, `hot_liquor_tank`, `mash_tun`, `other` |
| capacity_litres | decimal | Max working volume |
| status | enum | `available`, `in_use`, `cleaning`, `maintenance`, `out_of_service` |
| current_batch_id | uuid? | FK → BrewBatch (what's in it now) |
| location | string? | Physical location in brewery |
| notes | string? | |
| archived | boolean | |
| created_at | datetime | |
| updated_at | datetime | |

**Aggregates:**
- `utilisation_rate` — percentage of time vessels are in_use over a period
- `available_fermenter_capacity` — sum of capacity for available fermenters
- `days_in_current_use` — days since current batch was assigned

---

## 5. Packaging

Converting fermented beer into sellable units.

### Packaging Run

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| brew_batch_id | uuid | FK → BrewBatch (source beer) |
| packaging_date | date | |
| format | enum | `keg_50l`, `keg_30l`, `keg_20l`, `can_375ml`, `can_355ml`, `bottle_330ml`, `bottle_500ml`, `other` |
| format_custom | string? | If format is `other` |
| quantity_units | integer | Number of kegs/cans/bottles produced |
| volume_litres | decimal | Total volume packaged |
| best_before_date | date? | |
| notes | string? | |
| created_at | datetime | |

### Finished Goods Stock

Packaged beer available for sale. Created from packaging runs.

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| packaging_run_id | uuid | FK → PackagingRun |
| brew_batch_id | uuid | FK → BrewBatch |
| recipe_id | uuid | FK → Recipe (denormalised for easy querying) |
| product_name | string | e.g. "Pale Ale — 50L Keg" |
| format | enum | Same as PackagingRun.format |
| quantity_on_hand | integer | Units remaining |
| quantity_reserved | integer | Allocated to orders not yet dispatched |
| quantity_available | integer | Generated: on_hand - reserved |
| unit_price | decimal? | Default sell price |
| best_before_date | date? | |
| location | string? | "Cold room", "Warehouse bay 2" |
| created_at | datetime | |
| updated_at | datetime | |

---

## 6. Orders

Selling beer to customers.

### Order

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| order_number | string | Auto-generated e.g. "ORD-2026-0187" |
| customer_id | uuid | FK → Customer |
| status | enum | `draft`, `confirmed`, `picking`, `dispatched`, `delivered`, `invoiced`, `paid`, `cancelled` |
| order_date | date | |
| delivery_date | date? | Requested/scheduled delivery |
| delivery_address | text? | Override customer's default address |
| channel | enum | `wholesale`, `taproom`, `online`, `market`, `other` |
| subtotal | decimal | Sum of line totals (calculated) |
| tax | decimal | |
| total | decimal | subtotal + tax |
| notes | text? | Internal notes |
| invoice_number | string? | |
| paid_at | datetime? | |
| created_at | datetime | |
| updated_at | datetime | |

### Order Line

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| order_id | uuid | FK → Order |
| recipe_id | uuid | FK → Recipe — what beer was ordered |
| format | enum | `keg_50l`, `keg_30l`, `keg_20l`, `can_375ml`, etc. — what package format |
| finished_goods_id | uuid? | FK → FinishedGoodsStock. Null until picking/dispatch — linked when actual stock is allocated. |
| description | string | Product name + format |
| quantity | integer | Units ordered |
| unit_price | decimal | |
| line_total | decimal | quantity × unit_price |
| notes | string? | |

> **Why recipe + format instead of just finished_goods_id?** A wholesale customer ordering 5 kegs of Pale Ale for delivery in 3 weeks can place that order before the beer is even brewed. The planning system sees "we need 5 × keg_50l of Pale Ale by March 20" and works backwards: is there packaged stock? → is there beer in tank ready to package? → do we need to brew? → do we have the ingredients? The `finished_goods_id` gets linked later when the order moves to `picking` status.

**Aggregates:**
- `revenue_this_month/quarter/year` — sum of delivered order totals
- `top_products` — most ordered finished goods
- `top_customers` — highest revenue customers
- `orders_pending_delivery` — confirmed orders with upcoming delivery dates

---

## 7. Customers

### Customer

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| name | string | Business or person name |
| customer_type | enum | `venue`, `bottle_shop`, `distributor`, `taproom`, `market`, `other` |
| contact_name | string? | |
| email | string? | |
| phone | string? | |
| address_line_1 | string? | |
| address_line_2 | string? | |
| city | string? | |
| state | string? | |
| postcode | string? | |
| country | string | Default: "Australia" |
| delivery_instructions | text? | e.g. "Use rear loading dock, call 15 min before" |
| payment_terms | string? | e.g. "Net 30", "COD" |
| notes | text? | |
| archived | boolean | |
| created_at | datetime | |
| updated_at | datetime | |

**Aggregates:**
- `total_orders` — count of non-cancelled orders
- `total_revenue` — sum of paid order totals
- `last_order_date` — most recent order date
- `average_order_value`

---

## 8. Purchasing

### Supplier

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| name | string | e.g. "Bintani Australia", "Cryer Malt" |
| contact_name | string? | |
| email | string? | |
| phone | string? | |
| address | text? | |
| website | string? | |
| payment_terms | string? | |
| lead_time_days | integer? | Typical delivery time from order to receipt. Critical for purchase timing. |
| minimum_order_value | decimal? | Minimum order value for free delivery / to place an order |
| notes | text? | |
| archived | boolean | |
| created_at | datetime | |
| updated_at | datetime | |

### Purchase Order

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| po_number | string | Auto-generated e.g. "PO-2026-0034" |
| supplier_id | uuid | FK → Supplier |
| status | enum | `draft`, `sent`, `acknowledged`, `partially_received`, `received`, `cancelled` |
| order_date | date | |
| expected_delivery_date | date? | |
| subtotal | decimal | |
| tax | decimal | |
| total | decimal | |
| notes | text? | |
| created_at | datetime | |
| updated_at | datetime | |

### Purchase Order Line

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| purchase_order_id | uuid | FK → PurchaseOrder |
| inventory_item_id | uuid | FK → InventoryItem |
| quantity_ordered | decimal | |
| quantity_received | decimal | Updated as goods arrive |
| unit | enum | |
| unit_cost | decimal | |
| line_total | decimal | |
| notes | string? | |

**Receiving flow:** See [Purchase Order State Machine](#purchase-order-state-machine) for the full receive action with guards and side effects.

---

## 9. Planning

Planning is the primary goal of BrewPlan. It answers the brewer's core question: **"What do I need to do, and when, to fulfil the orders I have?"**

The planning module is a **read-only dashboard** — no dedicated tables, it queries across all other modules. The key insight is that brewery planning is a **backwards dependency chain** from customer delivery dates:

```
What orders are due?                    (Orders with delivery_date approaching)
  → What finished goods do I need?      (OrderLine: recipe + format + quantity)
    → Do I have enough packaged?        (FinishedGoodsStock.quantity_available)
      → What should I package next?     (BrewBatch in ready_to_package, prioritised by order urgency)
        → What should I brew next?      (Shortfall after packaging, given vessel availability)
          → What ingredients do I need? (Recipe ingredients × planned batches)
            → What should I order?      (Shortfall after current stock, given supplier lead times)
```

Each planning view corresponds to one level of this chain.

### 9.1 Demand View — "What do we owe?"

Starting point: confirmed orders with a `delivery_date` in the next N weeks.

| Data | Source |
|------|--------|
| Orders due, grouped by week | Order (status ∈ [confirmed, picking]) ordered by `delivery_date` |
| Demand by product | OrderLine → aggregate by `recipe_id` + `format` |
| Unfulfillable orders | Order lines where required quantity > FinishedGoodsStock.quantity_available (no stock to pick from yet) |

This tells you: "We owe 10 kegs of Pale Ale and 20 cartons of IPA cans by next Friday."

### 9.2 Packaging Priority View — "What to can/keg first?"

Matches demand against beer that's ready in tank.

| Data | Source |
|------|--------|
| Batches ready to package | BrewBatch (status = `ready_to_package`), showing recipe, volume, days in tank |
| Packaging urgency | Rank by: (a) batches that fulfil overdue orders first, (b) batches that fulfil orders due soonest, (c) batches that have been in tank longest |
| Suggested packaging runs | For each ready batch: which format and how many units, driven by unfulfilled order lines for that recipe |

This tells you: "Package the Pale Ale in FV2 into 50L kegs first — it fills next Tuesday's order for The Eagle."

### 9.3 Brew Schedule View — "What to brew and when?"

Works backwards from demand that can't be met by current tank contents or packaged stock.

| Data | Source |
|------|--------|
| Planned brews | BrewBatch (status = `planned`), showing recipe, `planned_date`, vessel, `estimated_ready_date` |
| Suggested brews | Demand (from 9.1) minus packaged stock minus in-tank volume = production shortfall. Convert shortfall to batch count using recipe.batch_size_litres. |
| Vessel availability | Vessels not assigned to active batches, or vessels with `estimated_ready_date` approaching (about to become free) |
| Brew calendar | Gantt-style: vessels on Y-axis, time on X-axis. Shows current batches (with expected free date) and planned batches. |
| Suggested brew date | For a suggested brew: `order.delivery_date` − packaging lead time (1–2 days) − `recipe.estimated_total_days` = latest brew date |

This tells you: "To fill the March 20 order, brew the Pale Ale by March 4 — FV1 is free from March 2."

### 9.4 Materials Requirements View — "What ingredients do we need?"

For all planned brews, calculate total ingredient requirements and compare against stock.

| Data | Source |
|------|--------|
| Ingredients needed | For each BrewBatch (status = `planned`): recipe ingredients × (batch.batch_size_litres ÷ recipe.batch_size_litres). Sum across all planned batches, grouped by InventoryItem. |
| Current position | InventoryItem: `quantity_on_hand`, `quantity_allocated` (by other planned batches), `quantity_available`, `quantity_on_order` |
| Shortfall | `quantity_needed` − `quantity_available` − `quantity_on_order`. Positive = need to purchase. |
| Items below reorder point | InventoryItem where `quantity_available` < `reorder_point` |
| Expiring soon | InventoryLot where `expiry_date` within N days (use first or lose it) |

This tells you: "The two planned brews need 75kg of pale malt. You have 50kg on hand (20kg allocated to Friday's brew), so 45kg available. None on order. You need to order at least 30kg."

### 9.5 Purchase Timing View — "What to order and when?"

Works backwards from planned brew dates using supplier lead times.

| Data | Source |
|------|--------|
| Required-by dates | For each shortfall item: earliest `planned_date` of the BrewBatch that needs it |
| Order-by date | `required_by_date` − `supplier.lead_time_days` − buffer (e.g. 2 days) |
| Suggested POs | Group shortfall items by supplier. Show: item, quantity needed, supplier, lead time, order-by date, estimated cost |
| Overdue orders | Items where `order_by_date` is today or past and no PO exists |
| Pending deliveries | PurchaseOrders in [sent, acknowledged, partially_received] with `expected_delivery_date` |

This tells you: "Order 30kg of pale malt from Cryer by March 1 (5-day lead time) to have it for the March 8 brew."

### 9.6 Production Summary View

Historical performance, not planning — but useful context.

| Data | Source |
|------|--------|
| Batches completed this period | BrewBatch (status ∈ [completed, packaged]) within date range |
| Total volume produced | Sum of `actual_volume_litres` |
| Average yield efficiency | Avg of `actual_volume_litres` ÷ `batch_size_litres` |
| Cost per litre trends | `total_ingredient_cost` ÷ `actual_volume_litres` over time |
| Vessel utilisation | Percentage of time vessels were in_use over period |

---

## 10. Quality *(Phase 3+)*

QC checkpoints attached to brew batches at various stages.

### Quality Check

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| brew_batch_id | uuid | FK → BrewBatch |
| check_type | enum | `pre_ferment`, `mid_ferment`, `post_ferment`, `pre_package`, `packaged`, `other` |
| checked_at | datetime | |
| checked_by | string? | |
| ph | decimal? | |
| dissolved_oxygen | decimal? | ppm/ppb |
| turbidity | decimal? | NTU |
| colour_srm | decimal? | |
| abv | decimal? | Lab-measured |
| co2_volumes | decimal? | |
| sensory_notes | text? | Tasting panel comments |
| microbiological | text? | Micro test results |
| result | enum | `pass`, `fail`, `pending` |
| notes | text? | |
| created_at | datetime | |

---

## 11. Auth

### User

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| email | string | Unique, used for login |
| password_hash | string | bcrypt hash |
| name | string | Display name |
| created_at | datetime | |
| updated_at | datetime | |

Phase 1: single user, seeded via CLI or migration. No registration flow, no roles. Cookie-based sessions with `HttpOnly` + `Secure` + `SameSite=Lax`, 7-day expiry.

Future: add `role` enum (`admin`, `brewer`, `viewer`), registration, password reset.

---

## 12. Settings

### Brewery Profile

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK (singleton) |
| name | string | Brewery name |
| logo_url | string? | |
| address | text? | |
| phone | string? | |
| email | string? | |
| website | string? | |
| abn | string? | Australian Business Number |
| liquor_licence_number | string? | |
| default_currency | string | Default: "AUD" |
| default_batch_prefix | string | e.g. "BP" for batch numbers |
| default_order_prefix | string | e.g. "ORD" |
| default_po_prefix | string | e.g. "PO" |
| invoice_footer | text? | Payment details, terms |
| created_at | datetime | |
| updated_at | datetime | |

---

## Entity Relationship Summary

```
Supplier ──1:N── PurchaseOrder ──1:N── PurchaseOrderLine ──N:1── InventoryItem
                                              │
                                    (receiving creates)
                                              ↓
                                        InventoryLot ──1:N── StockMovement

InventoryItem ──1:N── InventoryLot
InventoryItem ──1:N── RecipeIngredient ──N:1── Recipe

Recipe ──1:N── RecipeIngredient
Recipe ──1:N── RecipeProcessStep
Recipe ──1:N── BrewBatch

BrewBatch ──1:N── BrewIngredientConsumption ──N:1── InventoryLot
BrewBatch ──1:N── FermentationLogEntry
BrewBatch ──1:N── QualityCheck
BrewBatch ──N:1── Vessel
BrewBatch ──1:N── PackagingRun ──1:N── FinishedGoodsStock

Customer ──1:N── Order ──1:N── OrderLine ──N:1── Recipe (what beer)
                                         ──N:1── FinishedGoodsStock? (linked at picking)
```

---

## State Machines

Three entities have formal state machines — their transitions have guards (preconditions) and side effects that enforce business rules. All other entities either use simple status enums (Recipe) or are stateless reference data / immutable events.

### Brew Batch State Machine

The core lifecycle of a brew. This is the most complex state machine because it drives inventory consumption, vessel allocation, and finished goods creation.

```
                ┌──────────────────────────────────────────────────┐
                │                                                  ↓
planned ──→ brewing ──→ fermenting ──→ conditioning ──→ ready_to_package ──→ packaged ──→ completed
   │            │            │              │                  │                              
   ↓            ↓            ↓              ↓                  ↓                              
cancelled    dumped       dumped          dumped             dumped                           
```

| Transition | Guard | Side Effects |
|-----------|-------|--------------|
| `planned` → `brewing` | Recipe must be `active`. Vessel must be assigned (`vessel_id` set) and vessel status must be `available`. | Snapshot ingredient costs → `cost_snapshot`. Set `brew_date` to today. Set vessel status → `in_use`, vessel `current_batch_id` → this batch. |
| `brewing` → `fermenting` | `actual_og` must be recorded. At least one BrewIngredientConsumption record must exist. | Create StockMovements (type: `consumed`) for each consumption record. Decrement InventoryLot quantities. |
| `fermenting` → `conditioning` | At least one FermentationLogEntry must exist. | *(none — informational transition)* |
| `conditioning` → `ready_to_package` | `actual_fg` must be recorded. | Calculate and set `actual_abv` from OG/FG. |
| `ready_to_package` → `packaged` | At least one PackagingRun must exist for this batch. | Create FinishedGoodsStock records from PackagingRun data. Release vessel: set vessel status → `available`, clear vessel `current_batch_id`. |
| `packaged` → `completed` | *(always allowed)* | Set `completed_at` to now. |
| `planned` → `cancelled` | *(always allowed)* | Release vessel if assigned. |
| `{brewing, fermenting, conditioning, ready_to_package}` → `dumped` | *(always allowed — beer goes bad sometimes)* | Release vessel. If ingredients were consumed (status was past `brewing`), stock movements remain as historical record — no reversal. |

**Not allowed:**
- Any backward transition (no `fermenting` → `brewing`)
- `completed` → anything (terminal state)
- `dumped` → anything (terminal state)
- `cancelled` → anything (terminal state)
- Skipping states (no `planned` → `fermenting`)

**Shortcut transitions** *(optional, for small breweries that brew and transfer same day):*
- `planned` → `fermenting` — combines brewing + fermenting in one step. Applies both sets of guards and side effects.

### Order State Machine

```
draft ──→ confirmed ──→ picking ──→ dispatched ──→ delivered ──→ invoiced ──→ paid
  │           │                                       │
  ↓           ↓                                       ↓
cancelled   cancelled                              invoiced (skip delivered for pickup)
```

| Transition | Guard | Side Effects |
|-----------|-------|--------------|
| `draft` → `confirmed` | At least one OrderLine must exist. All OrderLines must have `recipe_id` and `format` set. `delivery_date` should be set. | *(none)* |
| `confirmed` → `picking` | All OrderLines must have `finished_goods_id` linked with `quantity_available` ≥ ordered quantity. | Reserve stock: increment `quantity_reserved` on each FinishedGoodsStock referenced by order lines. |
| `picking` → `dispatched` | *(always allowed)* | Decrement `quantity_on_hand` and `quantity_reserved` on each FinishedGoodsStock. Recalculate `quantity_available`. |
| `dispatched` → `delivered` | *(always allowed)* | *(none — informational)* |
| `confirmed` → `dispatched` | *(shortcut for same-day pickup/delivery)* | Applies both `picking` and `dispatched` side effects in sequence. |
| `delivered` → `invoiced` | *(always allowed)* | Generate `invoice_number` (auto-increment). |
| `dispatched` → `invoiced` | *(shortcut — invoice before delivery confirmation)* | Generate `invoice_number`. |
| `invoiced` → `paid` | *(always allowed)* | Set `paid_at` to now. |
| `draft` → `cancelled` | *(always allowed)* | *(none)* |
| `confirmed` → `cancelled` | *(always allowed)* | Release any reserved stock if picking had started via a failed/partial pick. |

**Not allowed:**
- `dispatched` → `cancelled` (beer is already on the truck)
- `delivered` → `cancelled` (beer is at the customer)
- `paid` → anything (terminal)
- Any backward transition

### Purchase Order State Machine

```
draft ──→ sent ──→ acknowledged ──→ partially_received ──→ received
  │         │           │                │
  ↓         ↓           ↓                ↓
cancelled cancelled  cancelled       cancelled
```

| Transition | Guard | Side Effects |
|-----------|-------|--------------|
| `draft` → `sent` | At least one PurchaseOrderLine must exist. All lines must have `quantity_ordered` > 0 and valid `inventory_item_id`. | Set `order_date` to today if not already set. |
| `sent` → `acknowledged` | *(always allowed)* | *(none — supplier confirmed receipt)* |
| `{sent, acknowledged}` → `partially_received` | At least one line must have `quantity_received` > 0 but not all lines fully received. | *(triggered by receive action — see below)* |
| `{sent, acknowledged, partially_received}` → `received` | All lines must have `quantity_received` ≥ `quantity_ordered`. | *(triggered by receive action — see below)* |
| `{draft, sent, acknowledged, partially_received}` → `cancelled` | *(always allowed)* | *(none — no stock reversal needed for undelivered goods)* |

**Receive action** (not a simple transition — it's a command that may trigger a transition):

When receiving goods against a PO line:
1. Validate: PO status must be `sent`, `acknowledged`, or `partially_received`
2. Update `quantity_received` on the PO line (increment by received amount)
3. Create an InventoryLot: `lot_number` from delivery docket, `unit_cost` from PO line, `received_date` = today, `purchase_order_id` = this PO
4. Create a StockMovement: type `received`, linked to the new lot, `reference_type` = `purchase_order`, `reference_id` = this PO
5. Evaluate PO status:
   - If all lines `quantity_received` ≥ `quantity_ordered` → transition to `received`
   - Else if any line `quantity_received` > 0 → transition to `partially_received`

### Recipe Status (Simple Enum — Not a State Machine)

Recipe uses a simple status field with validation rules rather than a full state machine, because transitions have no side effects:

| Status | Rule |
|--------|------|
| `draft` | Can be edited freely. Cannot be used to create a BrewBatch. |
| `active` | Can be used to create BrewBatches. Can still be edited (creates a new version via clone if ingredients change). |
| `archived` | Cannot be used to create new BrewBatches. Existing batches referencing this recipe are unaffected. Can be reactivated → `active`. |

### Vessel Status (Derived — Not a State Machine)

Vessel `status` is largely derived from BrewBatch state rather than independently managed:

| Status | Derived from |
|--------|-------------|
| `in_use` | A BrewBatch with `vessel_id` = this vessel is in state `brewing`, `fermenting`, `conditioning`, or `ready_to_package` |
| `available` | No batch assigned, not in cleaning/maintenance |
| `cleaning` | Manually set after batch released (could auto-set on batch → `packaged`) |
| `maintenance` | Manually set |
| `out_of_service` | Manually set |

Only `cleaning`, `maintenance`, and `out_of_service` are manually controlled. `in_use` and `available` are driven by batch lifecycle.

---

## Implementation Priority

### Phase 1 — Core Brewing Loop (MVP) ✅
1. ✅ **Auth** — User table, cookie sessions, login/logout. Single user, seeded.
2. ✅ **Recipes** + Recipe Ingredients (the BOM) — including time estimates
3. ✅ **Inventory Items** + Lots + Stock Movements — including derived position calculations
4. ✅ **Brew Batches** + Ingredient Consumption + Fermentation Log
5. ✅ **Vessels** (basic — just tracking what's where)
6. ✅ **Planning: Materials Requirements** (9.4) — even with just recipes and inventory, you can answer "do I have enough to brew this?"

Phase 1 constraints: metric only (no imperial), batch numbering `{prefix}-{year}-{sequence}`, mobile-first UI (44px touch targets).

### Phase 2 — Commercial Operations + Full Planning ✅
6. ✅ **Packaging Runs** + Finished Goods Stock
7. ✅ **Customers** + **Orders** + Order Lines (with forward order support)
8. ✅ **Suppliers** + **Purchase Orders** + Receiving flow (with lead times)
9. ✅ **Planning: Full chain** — Demand (9.1) → Packaging Priority (9.2) → Brew Schedule (9.3) → Purchase Timing (9.5)

### Phase 3 — Polish & Compliance
10. **Quality Checks**
11. **Settings** / Brewery Profile
12. **Recipe Versioning** (clone + parent_recipe_id chain)
13. **Recipe Process Steps** — detailed process documentation beyond ingredients
14. **Brewfather Import** — JSON export → Recipe + RecipeIngredient mapping
15. Reporting & export (CSV, invoices PDF)
16. **Planning: Production Summary** (9.6) — historical analytics
17. **Multi-user / Roles** — registration, password reset, role-based access

---

## Key Design Decisions

**Recipe vs BOM:** CraftPlan uses a generic "Product → BOM → BOM Items" pattern. BrewPlan flattens this to "Recipe → Recipe Ingredients" because a brewery's product IS its recipe. No need for an intermediate abstraction.

**Usage Stages:** The `usage_stage` enum on recipe ingredients is the single most important brewing adaptation. Knowing that 20g of hops goes in at `boil` vs `dry_hop` completely changes the beer. CraftPlan's BOM has no concept of this.

**Two-tier Inventory:** Raw materials (InventoryItem → InventoryLot) and finished goods (FinishedGoodsStock) are separate models. Raw materials are consumed during brewing; finished goods are created during packaging and sold via orders. CraftPlan combines these.

**Fermentation Tracking:** Time-series gravity and temperature data is core to brewing and has no equivalent in CraftPlan. This is the feature that makes it brewery software rather than generic manufacturing software.

**Vessel Management:** Knowing what's in each tank and when it'll be free is essential for brew scheduling. CraftPlan has no concept of production equipment.

**Cost Snapshots:** Like CraftPlan, we freeze ingredient costs at the time of brewing so historical batch costs remain accurate even if supplier prices change.

**Lot Traceability:** Full chain from supplier lot → inventory lot → brew consumption → packaging run → finished goods → customer order. Critical for recalls and quality issues.

**Gluten-Free First:** `is_gluten_free` flag and `allergens` array on every inventory item. For Someday Somehow, cross-contamination tracking is non-negotiable.

**State Machines:** Only three entities get formal state machines: Brew Batch, Order, and Purchase Order. These are the entities where transitions have real guards (preconditions that must be met) and side effects (inventory changes, vessel allocation, stock reservation). Everything else uses simple status enums or is stateless. Vessel status is mostly derived from batch state rather than independently managed. This keeps complexity where it earns its keep and avoids over-engineering reference data and immutable event records.

**Planning as a Dependency Chain:** The entire data model is shaped around one question: "What do I need to do, and when, to fulfil my orders?" Every field and relationship should be traceable through the chain: order delivery dates → finished goods demand → packaging priority → brew schedule → materials requirements → purchase timing. If a field doesn't serve this chain (or traceability/compliance), question whether it belongs.

**Forward Orders:** OrderLine references `recipe_id` + `format` rather than requiring `finished_goods_id` upfront. This allows orders to be placed before beer is brewed, which is how wholesale actually works ("I need 5 kegs of your pale ale for the 20th"). The `finished_goods_id` is linked later at picking time. This is the key enabler for demand-driven planning — without it, orders can only be placed against existing stock and the planning chain breaks.

**Derived Inventory Allocation:** Ingredient allocation is calculated, not managed. `quantity_allocated` is the sum of recipe ingredients across planned/brewing batches — no reservation workflow, no allocation state machine. Cancel a batch and the allocation vanishes because it's just a query. This keeps things simple for a small brewery while still showing "what's spoken for" vs "what's free."

**Recipe Time Estimates:** `estimated_fermentation_days` and `estimated_conditioning_days` on Recipe enable the brew schedule to work backwards from delivery dates. Without these, you can't answer "when do I need to brew this to have it ready in time?" They're estimates — actual timing varies — but they make planning possible.

**Supplier Lead Times:** `lead_time_days` on Supplier enables purchase timing. Combined with planned brew dates, the system can say "order this by Tuesday to have it for next week's brew." Simple field, high planning value.
