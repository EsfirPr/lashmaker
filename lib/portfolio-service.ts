import "server-only";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  MasterCertificate,
  MasterProfile,
  MasterService,
  PortfolioItem,
  SafeUser,
  User
} from "@/lib/types";
import { masterServiceIdSchema, masterServiceInputSchema } from "@/lib/validators";

const portfolioBucket = "portfolio";
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxImageSize = 5 * 1024 * 1024;
const missingRelationErrorCodes = new Set(["42P01", "42703"]);
// Uploaded asset URLs are versioned with timestamp + uuid, so a long browser cache is safe.
const staticImageCacheControl = "31536000";

function toSafeUser(user: User): SafeUser {
  const { password_hash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

function sanitizeFileName(name: string) {
  const cleaned = name.toLowerCase().replace(/[^a-z0-9.\-_]+/g, "-");
  return cleaned.replace(/^-+|-+$/g, "") || "portfolio-image";
}

export function resolveMasterProfile(master: SafeUser, profile: MasterProfile | null): MasterProfile {
  const fallbackProfile: MasterProfile = {
    user_id: master.id,
    display_name: master.name || master.nickname || "LashMaker",
    headline: "Наращивание ресниц, которое подчёркивает взгляд и не спорит с вашим стилем",
    bio:
      "Помогаю подобрать форму и объем так, чтобы взгляд выглядел выразительно, а образ оставался гармоничным в повседневной жизни и на съемках.",
    years_experience: 3,
    lash_experience_years: 2,
    avatar_path: null,
    avatar_url: null,
    updated_at: new Date(0).toISOString()
  };

  if (!profile) {
    return fallbackProfile;
  }

  return {
    ...fallbackProfile,
    ...profile,
    display_name: profile.display_name ?? fallbackProfile.display_name,
    headline: profile.headline ?? fallbackProfile.headline,
    bio: profile.bio ?? fallbackProfile.bio,
    years_experience: profile.years_experience ?? fallbackProfile.years_experience,
    lash_experience_years:
      profile.lash_experience_years ?? fallbackProfile.lash_experience_years,
    avatar_path: profile.avatar_path ?? fallbackProfile.avatar_path,
    avatar_url: profile.avatar_url ?? fallbackProfile.avatar_url
  };
}

function isMissingRelationError(error: { code?: string | null; message?: string | null }) {
  return (
    (error.code ? missingRelationErrorCodes.has(error.code) : false) ||
    error.message?.includes("does not exist") ||
    false
  );
}

async function uploadImageToBucket(ownerId: string, folder: string, file: File) {
  if (!allowedImageTypes.has(file.type)) {
    throw new Error("Загрузите JPG, PNG или WEBP");
  }

  if (file.size > maxImageSize) {
    throw new Error("Файл должен быть не больше 5 МБ");
  }

  const supabase = getSupabaseAdminClient();
  const path = `${ownerId}/${folder}/${Date.now()}-${randomUUID()}-${sanitizeFileName(file.name)}`;
  const { error: uploadError } = await supabase.storage
    .from(portfolioBucket)
    .upload(path, file, {
      cacheControl: staticImageCacheControl,
      upsert: false,
      contentType: file.type
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data: publicUrlData } = supabase.storage.from(portfolioBucket).getPublicUrl(path);
  return {
    path,
    publicUrl: publicUrlData.publicUrl
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
    if (isMissingRelationError(error)) {
      return null;
    }

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

export async function getLandingCertificates() {
  const master = await getMasterUser();

  if (!master) {
    return [] as MasterCertificate[];
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("master_certificates")
    .select("*")
    .eq("owner_id", master.id)
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingRelationError(error)) {
      return [] as MasterCertificate[];
    }

    throw new Error(error.message);
  }

  return (data || []) as MasterCertificate[];
}

export async function getLandingServices() {
  const master = await getMasterUser();

  if (!master) {
    return [] as MasterService[];
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("master_services")
    .select("*")
    .eq("owner_id", master.id)
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingRelationError(error)) {
      return [] as MasterService[];
    }

    throw new Error(error.message);
  }

  return (data || []) as MasterService[];
}

export async function getLandingMasterProfile() {
  const master = await getMasterUser();

  if (!master) {
    return null;
  }

  const profile = await getMasterProfileByUserId(master.id);
  return resolveMasterProfile(master, profile);
}

export async function getMasterProfileForOwner(ownerId: string) {
  return getMasterProfileByUserId(ownerId);
}

export async function getPortfolioDashboardData(ownerId: string) {
  const supabase = getSupabaseAdminClient();
  const [profile, portfolioItems, certificates, services] = await Promise.all([
    getMasterProfileByUserId(ownerId),
    supabase
      .from("portfolio_items")
      .select("*")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false }),
    supabase
      .from("master_certificates")
      .select("*")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false }),
    supabase
      .from("master_services")
      .select("*")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: true })
  ]);

  if (portfolioItems.error) {
    throw new Error(portfolioItems.error.message);
  }

  if (certificates.error && !isMissingRelationError(certificates.error)) {
    throw new Error(certificates.error.message);
  }

  if (services.error && !isMissingRelationError(services.error)) {
    throw new Error(services.error.message);
  }

  return {
    profile,
    items: Array.isArray(portfolioItems.data) ? (portfolioItems.data as PortfolioItem[]) : [],
    certificates: Array.isArray(certificates.data)
      ? (certificates.data as MasterCertificate[])
      : [],
    services: Array.isArray(services.data) ? (services.data as MasterService[]) : []
  };
}

export async function updateMasterProfile(input: {
  ownerId: string;
  displayName: string;
  headline: string;
  bio: string;
  yearsExperience: number | null;
  lashExperienceYears: number | null;
}) {
  const supabase = getSupabaseAdminClient();
  const payload = {
    user_id: input.ownerId,
    display_name: input.displayName.trim() || null,
    headline: input.headline.trim() || null,
    bio: input.bio.trim() || null,
    years_experience: input.yearsExperience,
    lash_experience_years: input.lashExperienceYears,
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
  const supabase = getSupabaseAdminClient();
  const uploadedImage = await uploadImageToBucket(input.ownerId, "portfolio", input.file);
  const { error: insertError } = await supabase.from("portfolio_items").insert({
    owner_id: input.ownerId,
    image_path: uploadedImage.path,
    image_url: uploadedImage.publicUrl,
    caption: input.caption?.trim() || null
  });

  if (insertError) {
    await supabase.storage.from(portfolioBucket).remove([uploadedImage.path]);
    throw new Error(insertError.message);
  }

  revalidatePath("/");
  revalidatePath("/account");
  revalidatePath("/master/dashboard");
}

export async function uploadMasterAvatar(input: {
  ownerId: string;
  file: File;
}) {
  const supabase = getSupabaseAdminClient();
  const currentProfile = await getMasterProfileByUserId(input.ownerId);
  const uploadedImage = await uploadImageToBucket(input.ownerId, "avatar", input.file);
  const payload = {
    user_id: input.ownerId,
    avatar_path: uploadedImage.path,
    avatar_url: uploadedImage.publicUrl,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase.from("master_profiles").upsert(payload, {
    onConflict: "user_id"
  });

  if (error) {
    await supabase.storage.from(portfolioBucket).remove([uploadedImage.path]);
    throw new Error(error.message);
  }

  if (currentProfile?.avatar_path) {
    await supabase.storage.from(portfolioBucket).remove([currentProfile.avatar_path]);
  }

  revalidatePath("/");
  revalidatePath("/master/dashboard");
}

export async function uploadMasterCertificates(input: {
  ownerId: string;
  files: File[];
}) {
  if (input.files.length === 0) {
    throw new Error("Выберите хотя бы одно изображение сертификата");
  }

  const supabase = getSupabaseAdminClient();
  const uploadedImages: Array<{ path: string; publicUrl: string }> = [];

  try {
    for (const file of input.files) {
      uploadedImages.push(await uploadImageToBucket(input.ownerId, "certificates", file));
    }

    const { error } = await supabase.from("master_certificates").insert(
      uploadedImages.map((image) => ({
        owner_id: input.ownerId,
        image_path: image.path,
        image_url: image.publicUrl
      }))
    );

    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    if (uploadedImages.length > 0) {
      await supabase.storage.from(portfolioBucket).remove(uploadedImages.map((image) => image.path));
    }

    throw error;
  }

  revalidatePath("/");
  revalidatePath("/master/dashboard");
}

export async function deleteMasterCertificate(certificateId: string, ownerId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("master_certificates")
    .select("*")
    .eq("id", certificateId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const certificate = (data as MasterCertificate | null) || null;

  if (!certificate) {
    throw new Error("Сертификат не найден");
  }

  const { error: removeStorageError } = await supabase
    .storage
    .from(portfolioBucket)
    .remove([certificate.image_path]);

  if (removeStorageError) {
    throw new Error(removeStorageError.message);
  }

  const { error: deleteError } = await supabase
    .from("master_certificates")
    .delete()
    .eq("id", certificate.id)
    .eq("owner_id", ownerId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  revalidatePath("/");
  revalidatePath("/master/dashboard");
}

export async function createMasterService(input: {
  ownerId: string;
  name: string;
  price: number;
  duration?: string;
  description?: string;
  image?: File | null;
}) {
  const payload = masterServiceInputSchema.parse(input);
  const supabase = getSupabaseAdminClient();
  const uploadedImage = input.image ? await uploadImageToBucket(input.ownerId, "services", input.image) : null;
  const insertPayload: {
    owner_id: string;
    name: string;
    price: number;
    duration: string | null;
    description: string | null;
    image_path?: string;
    image_url?: string;
  } = {
    owner_id: input.ownerId,
    name: payload.name,
    price: payload.price,
    duration: payload.duration || null,
    description: payload.description || null
  };

  if (uploadedImage) {
    insertPayload.image_path = uploadedImage.path;
    insertPayload.image_url = uploadedImage.publicUrl;
  }

  const { error } = await supabase.from("master_services").insert(insertPayload);

  if (error) {
    if (uploadedImage) {
      await supabase.storage.from(portfolioBucket).remove([uploadedImage.path]);
    }

    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/master/dashboard");
  revalidatePath("/master/profile");
}

export async function updateMasterService(input: {
  ownerId: string;
  serviceId: string;
  name: string;
  price: number;
  duration?: string;
  description?: string;
  image?: File | null;
}) {
  const payload = masterServiceInputSchema.parse(input);
  const parsedId = masterServiceIdSchema.parse({ serviceId: input.serviceId });
  const supabase = getSupabaseAdminClient();
  const currentService = input.image
    ? await getMasterServiceById(parsedId.serviceId, input.ownerId)
    : null;
  const uploadedImage = input.image ? await uploadImageToBucket(input.ownerId, "services", input.image) : null;
  const updatePayload: {
    name: string;
    price: number;
    duration: string | null;
    description: string | null;
    image_path?: string | null;
    image_url?: string | null;
  } = {
    name: payload.name,
    price: payload.price,
    duration: payload.duration || null,
    description: payload.description || null
  };

  if (uploadedImage) {
    updatePayload.image_path = uploadedImage.path;
    updatePayload.image_url = uploadedImage.publicUrl;
  }

  const { error } = await supabase
    .from("master_services")
    .update(updatePayload)
    .eq("id", parsedId.serviceId)
    .eq("owner_id", input.ownerId);

  if (error) {
    if (uploadedImage) {
      await supabase.storage.from(portfolioBucket).remove([uploadedImage.path]);
    }

    throw new Error(error.message);
  }

  if (uploadedImage && currentService?.image_path) {
    await supabase.storage.from(portfolioBucket).remove([currentService.image_path]);
  }

  revalidatePath("/");
  revalidatePath("/master/dashboard");
  revalidatePath("/master/profile");
}

export async function deleteMasterService(serviceId: string, ownerId: string) {
  const parsedId = masterServiceIdSchema.parse({ serviceId });
  const supabase = getSupabaseAdminClient();
  const service = await getMasterServiceById(parsedId.serviceId, ownerId);
  const { error } = await supabase
    .from("master_services")
    .delete()
    .eq("id", parsedId.serviceId)
    .eq("owner_id", ownerId);

  if (error) {
    throw new Error(error.message);
  }

  if (service?.image_path) {
    await supabase.storage.from(portfolioBucket).remove([service.image_path]);
  }

  revalidatePath("/");
  revalidatePath("/master/dashboard");
  revalidatePath("/master/profile");
}

async function getMasterServiceById(serviceId: string, ownerId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("master_services")
    .select("*")
    .eq("id", serviceId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as MasterService | null) || null;
}

export async function deleteMasterServiceImage(serviceId: string, ownerId: string) {
  const parsedId = masterServiceIdSchema.parse({ serviceId });
  const supabase = getSupabaseAdminClient();
  const service = await getMasterServiceById(parsedId.serviceId, ownerId);

  if (!service) {
    throw new Error("Услуга не найдена");
  }

  if (!service.image_path) {
    return;
  }

  const { error } = await supabase
    .from("master_services")
    .update({
      image_path: null,
      image_url: null
    })
    .eq("id", parsedId.serviceId)
    .eq("owner_id", ownerId);

  if (error) {
    throw new Error(error.message);
  }

  await supabase.storage.from(portfolioBucket).remove([service.image_path]);

  revalidatePath("/");
  revalidatePath("/master/dashboard");
  revalidatePath("/master/profile");
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
