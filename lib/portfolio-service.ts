import "server-only";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { MasterProfile, PortfolioItem, SafeUser, User } from "@/lib/types";

const portfolioBucket = "portfolio";
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxImageSize = 5 * 1024 * 1024;

function toSafeUser(user: User): SafeUser {
  const { password_hash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

function sanitizeFileName(name: string) {
  const cleaned = name.toLowerCase().replace(/[^a-z0-9.\-_]+/g, "-");
  return cleaned.replace(/^-+|-+$/g, "") || "portfolio-image";
}

export function resolveMasterProfile(master: SafeUser, profile: MasterProfile | null): MasterProfile {
  if (profile) {
    return profile;
  }

  return {
    user_id: master.id,
    display_name: master.name || master.nickname || "LashMaker",
    headline: "Наращивание ресниц с деликатной техникой и спокойным beauty-сервисом",
    bio:
      "Помогаю подобрать форму и объем так, чтобы взгляд выглядел выразительно, а образ оставался гармоничным в повседневной жизни и на съемках.",
    years_experience: 3,
    updated_at: new Date(0).toISOString()
  };
}

async function getMasterUser() {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.from("users").select("*").eq("role", "master").maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? toSafeUser(data as User) : null;
}

async function getMasterProfileByUserId(userId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("master_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as MasterProfile | null) || null;
}

export async function getLandingPortfolioItems() {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("portfolio_items")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as PortfolioItem[];
}

export async function getLandingMasterProfile() {
  const master = await getMasterUser();

  if (!master) {
    return null;
  }

  const profile = await getMasterProfileByUserId(master.id);
  return resolveMasterProfile(master, profile);
}

export async function getPortfolioDashboardData(ownerId: string) {
  const supabase = getSupabaseAdminClient();
  const [profile, portfolioItems] = await Promise.all([
    getMasterProfileByUserId(ownerId),
    supabase
      .from("portfolio_items")
      .select("*")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false })
  ]);

  if (portfolioItems.error) {
    throw new Error(portfolioItems.error.message);
  }

  return {
    profile,
    items: (portfolioItems.data || []) as PortfolioItem[]
  };
}

export async function updateMasterProfile(input: {
  ownerId: string;
  displayName: string;
  headline: string;
  bio: string;
  yearsExperience: number | null;
}) {
  const supabase = getSupabaseAdminClient();
  const payload = {
    user_id: input.ownerId,
    display_name: input.displayName.trim() || null,
    headline: input.headline.trim() || null,
    bio: input.bio.trim() || null,
    years_experience: input.yearsExperience,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase.from("master_profiles").upsert(payload, {
    onConflict: "user_id"
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/master/dashboard");
}

export async function uploadPortfolioItem(input: {
  ownerId: string;
  file: File;
  caption?: string;
}) {
  if (!allowedImageTypes.has(input.file.type)) {
    throw new Error("Загрузите JPG, PNG или WEBP");
  }

  if (input.file.size > maxImageSize) {
    throw new Error("Файл должен быть не больше 5 МБ");
  }

  const supabase = getSupabaseAdminClient();
  const path = `${input.ownerId}/${Date.now()}-${randomUUID()}-${sanitizeFileName(input.file.name)}`;
  const { error: uploadError } = await supabase.storage
    .from(portfolioBucket)
    .upload(path, input.file, {
      cacheControl: "3600",
      upsert: false,
      contentType: input.file.type
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data: publicUrlData } = supabase.storage.from(portfolioBucket).getPublicUrl(path);
  const { error: insertError } = await supabase.from("portfolio_items").insert({
    owner_id: input.ownerId,
    image_path: path,
    image_url: publicUrlData.publicUrl,
    caption: input.caption?.trim() || null
  });

  if (insertError) {
    await supabase.storage.from(portfolioBucket).remove([path]);
    throw new Error(insertError.message);
  }

  revalidatePath("/");
  revalidatePath("/account");
  revalidatePath("/master/dashboard");
}

export async function deletePortfolioItem(itemId: string, ownerId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("portfolio_items")
    .select("*")
    .eq("id", itemId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const item = (data as PortfolioItem | null) || null;

  if (!item) {
    throw new Error("Работа не найдена");
  }

  const { error: removeStorageError } = await supabase.storage
    .from(portfolioBucket)
    .remove([item.image_path]);

  if (removeStorageError) {
    throw new Error(removeStorageError.message);
  }

  const { error: deleteError } = await supabase
    .from("portfolio_items")
    .delete()
    .eq("id", item.id)
    .eq("owner_id", ownerId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  revalidatePath("/");
  revalidatePath("/account");
  revalidatePath("/master/dashboard");
}
