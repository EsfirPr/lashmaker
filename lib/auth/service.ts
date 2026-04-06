import "server-only";
import { env } from "@/lib/env";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ClientOverview, SafeUser, User } from "@/lib/types";
import { clientLoginSchema, clientRegisterSchema, masterLoginSchema } from "@/lib/validators";

function toSafeUser(user: User): SafeUser {
  const { password_hash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

function getMasterCredentials() {
  if (!env.masterNickname || !env.masterPassword) {
    throw new Error("MASTER_NICKNAME and MASTER_PASSWORD must be configured");
  }

  return {
    nickname: env.masterNickname,
    password: env.masterPassword
  };
}

export async function createMasterIfNotExists() {
  const { nickname, password } = getMasterCredentials();
  const supabase = getSupabaseAdminClient();

  const { data: existingUser, error: existingError } = await supabase
    .from("users")
    .select("*")
    .eq("role", "master")
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existingUser) {
    return toSafeUser(existingUser as User);
  }

  const passwordHash = await hashPassword(password);
  const { data, error } = await supabase
    .from("users")
    .insert({
      nickname,
      password_hash: passwordHash,
      role: "master"
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: concurrentUser, error: concurrentError } = await supabase
        .from("users")
        .select("*")
        .eq("role", "master")
        .maybeSingle();

      if (concurrentError) {
        throw new Error(concurrentError.message);
      }

      if (concurrentUser) {
        return toSafeUser(concurrentUser as User);
      }
    }

    throw new Error(error.message);
  }

  return toSafeUser(data as User);
}

export async function registerClient(input: { phone: string; password: string }) {
  const payload = clientRegisterSchema.parse(input);
  const supabase = getSupabaseAdminClient();
  const passwordHash = await hashPassword(payload.password);

  const { data, error } = await supabase
    .from("users")
    .insert({
      phone: payload.phone,
      password_hash: passwordHash,
      role: "client"
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Пользователь с таким телефоном уже существует");
    }

    throw new Error(error.message);
  }

  return toSafeUser(data as User);
}

export async function authenticateClient(input: { phone: string; password: string }) {
  const payload = clientLoginSchema.parse(input);
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("role", "client")
    .eq("phone", payload.phone)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Клиент с таким номером не найден");
  }

  const user = data as User;
  const isValidPassword = await verifyPassword(payload.password, user.password_hash);

  if (!isValidPassword) {
    throw new Error("Неверный пароль");
  }

  return toSafeUser(user);
}

export async function authenticateMaster(input: { nickname: string; password: string }) {
  const payload = masterLoginSchema.parse(input);
  await createMasterIfNotExists();

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("role", "master")
    .eq("nickname", payload.nickname)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Мастер с таким nickname не найден");
  }

  const user = data as User;
  const isValidPassword = await verifyPassword(payload.password, user.password_hash);

  if (!isValidPassword) {
    throw new Error("Неверный пароль");
  }

  return toSafeUser(user);
}

export async function getUserById(userId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.from("users").select("*").eq("id", userId).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? toSafeUser(data as User) : null;
}

export async function listClientsForMaster() {
  const supabase = getSupabaseAdminClient();
  const { data: clients, error: clientsError } = await supabase
    .from("users")
    .select("id, phone, nickname, role, created_at")
    .eq("role", "client")
    .order("created_at", { ascending: false });

  if (clientsError) {
    throw new Error(clientsError.message);
  }

  const clientList = (clients || []) as SafeUser[];

  if (!clientList.length) {
    return [] as ClientOverview[];
  }

  const clientIds = clientList.map((client) => client.id);
  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select("user_id")
    .in("user_id", clientIds);

  if (bookingsError) {
    throw new Error(bookingsError.message);
  }

  const counts = new Map<string, number>();

  for (const booking of bookings || []) {
    const userId = booking.user_id as string | null;

    if (!userId) {
      continue;
    }

    counts.set(userId, (counts.get(userId) || 0) + 1);
  }

  return clientList.map<ClientOverview>((client) => ({
    ...client,
    bookingsCount: counts.get(client.id) || 0
  }));
}

