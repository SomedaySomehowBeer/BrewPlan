import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { db } from "../client";
import { breweryProfile } from "../schema/index";

export function getProfile() {
  return db.select().from(breweryProfile).get() ?? null;
}

export function getOrCreateProfile() {
  const existing = getProfile();
  if (existing) return existing;

  const now = new Date().toISOString();
  const id = uuid();

  db.insert(breweryProfile)
    .values({
      id,
      name: "My Brewery",
      defaultCurrency: "AUD",
      defaultBatchPrefix: "BP",
      defaultOrderPrefix: "ORD",
      defaultPoPrefix: "PO",
      createdAt: now,
      updatedAt: now,
    })
    .run();

  return getProfile()!;
}

export function updateProfile(data: {
  name: string;
  logoUrl?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  abn?: string | null;
  liquorLicenceNumber?: string | null;
  defaultCurrency?: string;
  defaultBatchPrefix?: string;
  defaultOrderPrefix?: string;
  defaultPoPrefix?: string;
  invoiceFooter?: string | null;
}) {
  const profile = getOrCreateProfile();

  db.update(breweryProfile)
    .set({
      name: data.name,
      logoUrl: data.logoUrl ?? null,
      address: data.address ?? null,
      phone: data.phone ?? null,
      email: data.email ?? null,
      website: data.website ?? null,
      abn: data.abn ?? null,
      liquorLicenceNumber: data.liquorLicenceNumber ?? null,
      defaultCurrency: data.defaultCurrency ?? "AUD",
      defaultBatchPrefix: data.defaultBatchPrefix ?? "BP",
      defaultOrderPrefix: data.defaultOrderPrefix ?? "ORD",
      defaultPoPrefix: data.defaultPoPrefix ?? "PO",
      invoiceFooter: data.invoiceFooter ?? null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(breweryProfile.id, profile.id))
    .run();

  return getProfile()!;
}
