import { db } from "../server/db";
import { categories, products, marketReports } from "../shared/schema";
import { eq, and, isNull, sql } from "drizzle-orm";

type Node = { name: string; icon?: string; children?: Node[] };

const HIERARCHY: Node[] = [
  {
    name: "Steel & Iron",
    icon: "Factory",
    children: [
      { name: "Reinforcement Steel", children: [{ name: "Deformed Bars (Rebar)" }, { name: "Plain Bars" }, { name: "Coil Rebar" }, { name: "Wire Rod" }] },
      { name: "Structural Steel", children: [{ name: "I Beams" }, { name: "H Beams" }, { name: "U Channels" }, { name: "C Channels" }, { name: "Angle Bars" }, { name: "T Bars" }, { name: "Flat Bars" }, { name: "Square Bars" }, { name: "Round Bars" }] },
      { name: "Steel Pipes & Tubes", children: [{ name: "Round Pipes" }, { name: "Square Pipes" }, { name: "Rectangular Pipes" }, { name: "Galvanized Pipes" }, { name: "Seamless Pipes" }, { name: "Welded Pipes" }, { name: "Black Steel Pipes" }, { name: "Hollow Sections" }] },
      { name: "Steel Sheets", children: [{ name: "Mild Steel Sheets" }, { name: "Galvanized Sheets" }, { name: "Corrugated Sheets" }, { name: "Chequered Plates" }, { name: "Hot Rolled Sheets" }, { name: "Cold Rolled Sheets" }, { name: "Stainless Steel Sheets" }] },
      { name: "Steel Plates", children: [{ name: "Carbon Steel Plates" }, { name: "Stainless Plates" }, { name: "Wear Resistant Plates" }, { name: "Boiler Plates" }] },
      { name: "Wire Products", children: [{ name: "Binding Wire" }, { name: "GI Wire" }, { name: "Steel Wire Rope" }, { name: "Barbed Wire" }, { name: "Chain Link Fence" }, { name: "Welded Mesh" }, { name: "Expanded Metal" }] },
      { name: "Steel Accessories", children: [{ name: "Pipe Fittings" }, { name: "Steel Clamps" }, { name: "Flanges" }, { name: "Couplings" }, { name: "Elbows" }, { name: "Reducers" }] },
    ],
  },
  {
    name: "Aluminum",
    icon: "Layers",
    children: [
      { name: "Aluminum Profiles", children: [{ name: "Door Profiles" }, { name: "Window Profiles" }, { name: "Curtain Wall Profiles" }, { name: "Industrial Profiles" }] },
      { name: "Aluminum Sheets", children: [{ name: "Plain Sheets" }, { name: "Composite Panels (ACP)" }, { name: "Embossed Sheets" }, { name: "Roofing Sheets" }] },
      { name: "Aluminum Tubes", children: [{ name: "Round Tubes" }, { name: "Square Tubes" }, { name: "Rectangular Tubes" }] },
      { name: "Aluminum Bars", children: [{ name: "Flat Bars" }, { name: "Round Bars" }, { name: "Angle Bars" }] },
      { name: "Aluminum Accessories", children: [{ name: "Handles" }, { name: "Hinges" }, { name: "Locks" }, { name: "Sliding Systems" }, { name: "Glass Connectors" }] },
    ],
  },
  {
    name: "Construction Machinery",
    icon: "Truck",
    children: [
      { name: "Earth Moving Equipment", children: [{ name: "Excavators" }, { name: "Backhoe Loaders" }, { name: "Bulldozers" }, { name: "Wheel Loaders" }, { name: "Motor Graders" }] },
      { name: "Lifting Equipment", children: [{ name: "Tower Cranes" }, { name: "Mobile Cranes" }, { name: "Forklifts" }, { name: "Hoists" }] },
      { name: "Road Equipment", children: [{ name: "Asphalt Pavers" }, { name: "Rollers" }, { name: "Concrete Cutters" }] },
      { name: "Concrete Equipment", children: [{ name: "Concrete Mixers" }, { name: "Batching Plants" }, { name: "Concrete Pumps" }, { name: "Vibrators" }] },
      { name: "Compaction Equipment", children: [{ name: "Plate Compactors" }, { name: "Rammers" }, { name: "Rollers" }] },
      { name: "Drilling Equipment", children: [{ name: "Core Drills" }, { name: "Rotary Drills" }, { name: "Jack Hammers" }] },
    ],
  },
  {
    name: "Construction Tools",
    icon: "Wrench",
    children: [
      { name: "Hand Tools", children: [{ name: "Hammers" }, { name: "Pliers" }, { name: "Screwdrivers" }, { name: "Chisels" }, { name: "Wrenches" }, { name: "Spanners" }, { name: "Saws" }, { name: "Levels" }, { name: "Measuring Tape" }] },
      { name: "Power Tools", children: [{ name: "Angle Grinders" }, { name: "Drills" }, { name: "Rotary Hammers" }, { name: "Circular Saws" }, { name: "Jig Saws" }, { name: "Cut-off Machines" }, { name: "Heat Guns" }, { name: "Sanders" }] },
      { name: "Cutting Tools", children: [{ name: "Drill Bits" }, { name: "Saw Blades" }, { name: "Grinding Discs" }, { name: "Diamond Blades" }] },
      { name: "Measuring Tools", children: [{ name: "Laser Levels" }, { name: "Spirit Levels" }, { name: "Vernier Calipers" }, { name: "Distance Meters" }] },
    ],
  },
  {
    name: "Building Materials",
    icon: "HardHat",
    children: [
      { name: "Cement" }, { name: "Sand" }, { name: "Aggregate" }, { name: "Gravel" }, { name: "Blocks" },
      { name: "Bricks" }, { name: "Gypsum" }, { name: "Lime" }, { name: "Mortar" }, { name: "Ready Mix Concrete" },
    ],
  },
  {
    name: "Roofing Materials",
    icon: "Home",
    children: [
      { name: "Roofing Sheets" }, { name: "Corrugated Sheets" }, { name: "Ridge Caps" }, { name: "Gutters" },
      { name: "Downpipes" }, { name: "Roofing Nails" }, { name: "Roof Insulation" },
    ],
  },
  {
    name: "Plumbing",
    icon: "Droplets",
    children: [
      { name: "Pipes", children: [{ name: "PVC" }, { name: "HDPE" }, { name: "PPR" }, { name: "CPVC" }, { name: "GI Pipes" }] },
      { name: "Pipe Fittings", children: [{ name: "Elbows" }, { name: "Tees" }, { name: "Couplings" }, { name: "Reducers" }, { name: "Unions" }] },
      { name: "Valves", children: [{ name: "Ball Valves" }, { name: "Gate Valves" }, { name: "Butterfly Valves" }] },
      { name: "Sanitary", children: [{ name: "Toilets" }, { name: "Wash Basins" }, { name: "Kitchen Sinks" }, { name: "Faucets" }, { name: "Showers" }] },
    ],
  },
  {
    name: "Electrical Materials",
    icon: "Zap",
    children: [
      { name: "Cables", children: [{ name: "House Wiring" }, { name: "Power Cables" }, { name: "Flexible Cables" }] },
      { name: "Distribution", children: [{ name: "Distribution Boards" }, { name: "Circuit Breakers" }, { name: "Switches" }, { name: "Sockets" }] },
      { name: "Lighting", children: [{ name: "LED Bulbs" }, { name: "Flood Lights" }, { name: "Street Lights" }, { name: "Ceiling Lights" }] },
      { name: "Accessories", children: [{ name: "Cable Trays" }, { name: "Conduits" }, { name: "Cable Glands" }] },
    ],
  },
  {
    name: "Welding Equipment",
    icon: "Flame",
    children: [
      { name: "Welding Machines", children: [{ name: "MIG Welders" }, { name: "TIG Welders" }, { name: "Arc Welders" }] },
      { name: "Welding Electrodes" }, { name: "Welding Wires" }, { name: "Gas Regulators" }, { name: "Welding Helmets" },
    ],
  },
  {
    name: "Fasteners & Hardware",
    icon: "Settings",
    children: [
      { name: "Bolts" }, { name: "Nuts" }, { name: "Washers" }, { name: "Screws" }, { name: "Rivets" },
      { name: "Anchors" }, { name: "Nails" }, { name: "Hinges" }, { name: "Locks" }, { name: "Handles" },
    ],
  },
  {
    name: "Paint & Chemicals",
    icon: "Paintbrush",
    children: [
      { name: "Paint", children: [{ name: "Interior" }, { name: "Exterior" }, { name: "Epoxy" }, { name: "Primer" }] },
      { name: "Construction Chemicals", children: [{ name: "Waterproofing" }, { name: "Tile Adhesives" }, { name: "Grout" }] },
      { name: "Sealants", children: [{ name: "Silicone" }, { name: "Epoxy Resin" }] },
    ],
  },
  {
    name: "Safety Equipment (PPE)",
    icon: "Shield",
    children: [
      { name: "Safety Helmets" }, { name: "Reflective Vests" }, { name: "Gloves" }, { name: "Safety Shoes" },
      { name: "Goggles" }, { name: "Ear Protection" }, { name: "Dust Masks" }, { name: "Respirators" }, { name: "Harnesses" },
    ],
  },
  {
    name: "Industrial Equipment",
    icon: "Cog",
    children: [
      { name: "Air Compressors" }, { name: "Generators" }, { name: "Water Pumps" }, { name: "Electric Motors" },
      { name: "Pressure Washers" }, { name: "Diesel Engines" },
    ],
  },
  {
    name: "Scaffolding & Formwork",
    icon: "Building2",
    children: [
      { name: "Scaffolding", children: [{ name: "Steel Pipes" }, { name: "Frames" }, { name: "Couplers" }, { name: "Walk Boards" }, { name: "Base Jacks" }] },
      { name: "Formwork", children: [{ name: "Steel Formwork" }, { name: "Timber Formwork" }, { name: "Plastic Formwork" }, { name: "Plywood" }] },
    ],
  },
  {
    name: "Doors & Windows",
    icon: "DoorOpen",
    children: [
      { name: "Doors", children: [{ name: "Steel Doors" }, { name: "Wooden Doors" }, { name: "Security Doors" }, { name: "Fire Rated Doors" }] },
      { name: "Windows", children: [{ name: "Aluminum Windows" }, { name: "UPVC Windows" }, { name: "Sliding Windows" }, { name: "Casement Windows" }] },
    ],
  },
  {
    name: "Flooring & Finishing",
    icon: "Grid3x3",
    children: [
      { name: "Ceramic Tiles" }, { name: "Porcelain Tiles" }, { name: "Granite" }, { name: "Marble" },
      { name: "Vinyl Flooring" }, { name: "Skirting" }, { name: "Ceiling Boards" },
    ],
  },
  {
    name: "Glass",
    icon: "Square",
    children: [
      { name: "Tempered Glass" }, { name: "Laminated Glass" }, { name: "Reflective Glass" }, { name: "Clear Glass" },
      { name: "Mirror Glass" }, { name: "Glass Accessories" },
    ],
  },
  {
    name: "Water Systems",
    icon: "Waves",
    children: [
      { name: "Water Tanks" }, { name: "Water Pumps" }, { name: "Borehole Equipment" }, { name: "Filters" }, { name: "Solar Water Heaters" },
    ],
  },
  {
    name: "Fencing & Security",
    icon: "Fence",
    children: [
      { name: "Chain Link Fence" }, { name: "Razor Wire" }, { name: "Barbed Wire" }, { name: "Fence Posts" },
      { name: "Gates" }, { name: "Security Barriers" },
    ],
  },
  {
    name: "Agriculture & Irrigation",
    icon: "Sprout",
    children: [
      { name: "Water Pumps" }, { name: "Irrigation Pipes" }, { name: "Sprinklers" }, { name: "Drip Systems" }, { name: "Storage Tanks" },
    ],
  },
  {
    name: "Heavy Equipment Spare Parts",
    icon: "Puzzle",
    children: [
      { name: "Excavator Parts" }, { name: "Loader Parts" }, { name: "Engine Parts" }, { name: "Hydraulic Pumps" },
      { name: "Filters" }, { name: "Tracks" }, { name: "Buckets" }, { name: "Undercarriage Parts" },
    ],
  },
  {
    name: "Industrial Consumables",
    icon: "Disc",
    children: [
      { name: "Grinding Wheels" }, { name: "Cutting Discs" }, { name: "Lubricants" }, { name: "Grease" },
      { name: "Hydraulic Oil" }, { name: "Engine Oil" }, { name: "Cleaning Chemicals" },
    ],
  },
  {
    name: "Services",
    icon: "Handshake",
    children: [
      { name: "Equipment Rental" }, { name: "Steel Fabrication" }, { name: "Welding Services" }, { name: "Transportation" },
      { name: "Installation" }, { name: "Maintenance" }, { name: "Crane Rental" },
    ],
  },
];

async function upsertCategory(name: string, parentId: string | null, sortOrder: number, icon?: string): Promise<string> {
  const existing = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.name, name), parentId === null ? isNull(categories.parentId) : eq(categories.parentId, parentId)));
  if (existing.length > 0) {
    await db.update(categories).set({ sortOrder, ...(icon ? { icon } : {}) }).where(eq(categories.id, existing[0].id));
    return existing[0].id;
  }
  const [row] = await db
    .insert(categories)
    .values({ name, parentId, sortOrder, icon: icon ?? null })
    .returning({ id: categories.id });
  return row.id;
}

async function seed() {
  // 1. Migrate legacy flat categories into the new hierarchy
  const legacy = await db.select().from(categories).where(isNull(categories.parentId));
  const steel = legacy.find(c => c.name === "Steel");
  const iron = legacy.find(c => c.name === "Iron");
  const construction = legacy.find(c => c.name === "Construction");

  // Reuse the legacy "Steel" row as the new "Steel & Iron" main category
  if (steel) {
    await db.update(categories).set({ name: "Steel & Iron", icon: "Factory", sortOrder: 1 }).where(eq(categories.id, steel.id));
    console.log("Renamed legacy 'Steel' -> 'Steel & Iron'");
  }

  // 2. Seed the full hierarchy (idempotent)
  const mainIds = new Map<string, string>();
  let mainOrder = 0;
  for (const main of HIERARCHY) {
    mainOrder++;
    const mainId = await upsertCategory(main.name, null, mainOrder, main.icon);
    mainIds.set(main.name, mainId);
    let subOrder = 0;
    for (const sub of main.children ?? []) {
      subOrder++;
      const subId = await upsertCategory(sub.name, mainId, subOrder);
      let typeOrder = 0;
      for (const type of sub.children ?? []) {
        typeOrder++;
        await upsertCategory(type.name, subId, typeOrder);
      }
    }
  }

  // 3. Remap legacy 'Iron' and 'Construction' references, then remove those rows
  const steelIronId = mainIds.get("Steel & Iron")!;
  const buildingId = mainIds.get("Building Materials")!;

  if (iron) {
    await db.update(products).set({ categoryId: steelIronId }).where(eq(products.categoryId, iron.id));
    await db.update(marketReports).set({ categoryId: steelIronId }).where(eq(marketReports.categoryId, iron.id));
    await db.delete(categories).where(eq(categories.id, iron.id));
    console.log("Remapped legacy 'Iron' -> 'Steel & Iron' and removed it");
  }
  if (construction) {
    await db.update(products).set({ categoryId: buildingId }).where(eq(products.categoryId, construction.id));
    await db.update(marketReports).set({ categoryId: buildingId }).where(eq(marketReports.categoryId, construction.id));
    await db.delete(categories).where(eq(categories.id, construction.id));
    console.log("Remapped legacy 'Construction' -> 'Building Materials' and removed it");
  }

  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(categories);
  console.log(`Done. Total categories in DB: ${count}`);
}

seed().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
