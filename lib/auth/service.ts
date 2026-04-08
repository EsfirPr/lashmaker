import "server-only";
import { env } from "@/lib/env";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ClientOverview, SafeUser, TimeSlot, User } from "@/lib/types";
import {
  clientLoginSchema,
  clientRegisterSchema,
  loginSchema,
  masterLoginSchema,
  phonePattern
} from "@/lib/validators";
import { normalizePhone } from "@/lib/utils/phone";
import { formatDateLabel, formatSlotRange, getSlotStartDate } from "@/lib/utils";

function toSafeUser(user: User): SafeUser {
  const { password_hash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

async function getMasterUserByNickname(nickname: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("role", "master")
    .eq("nickname", nickname)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as User | null) || null;
}

async function getClientUserByPhone(phone: string) {
  const normalizedPhone = normalizePhone(phone);
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("role", "client")
    .eq("phone", normalizedPhone)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as User | null) || null;
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

export async function registerClient(input: {
  name: string;
  phone: string;
  password: string;
  privacyAccepted: boolean;
}) {
  const payload = clientRegisterSchema.parse(input);
  const supabase = getSupabaseAdminClient();
  const existingUser = await getClientUserByPhone(payload.phone);

  if (existingUser) {
    throw new Error("Пользователь с таким номером уже существует");
  }

  const passwordHash = await hashPassword(payload.password);

  const { data, error } = await supabase
    .from("users")
    .insert({
      name: payload.name,
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
  const data = await getClientUserByPhone(payload.phone);

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

export async function authenticateUser(input: { identifier: string; password: string }) {
  const payload = loginSchema.parse(input);
  const identifier = payload.identifier.trim();
  await createMasterIfNotExists();

  const masterUser = await getMasterUserByNickname(identifier);

  if (masterUser) {
    const isValidPassword = await verifyPassword(payload.password, masterUser.password_hash);

    if (!isValidPassword) {
      throw new Error("Неверный пароль");
    }

    return toSafeUser(masterUser);
  }

  if (!phonePattern.test(identifier)) {
    throw new Error("Клиент с таким номером не найден");
  }

  return authenticateClient({
    phone: normalizePhone(identifier),
    password: payload.password
  });
}

export async function authenticateMaster(input: { nickname: string; password: string }) {
  const payload = masterLoginSchema.parse(input);
  await createMasterIfNotExists();
  const data = await getMasterUserByNickname(payload.nickname);

  if (!data) {
    throw new Error("Пользователь не найден");
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
    .select("id, name, phone, nickname, role, created_at")
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
    .select(
      `
      user_id,
      name,
      status,
      time_slots!bookings_slot_id_fkey (
        id,
        slot_date,
        start_time,
        end_time,
        created_at
      )
    `
    )
    .in("user_id", clientIds);

  if (bookingsError) {
    throw new Error(bookingsError.message);
  }

  const counts = new Map<string, number>();
  const names = new Map<string, string>();
  const nextBookings = new Map<string, { startsAt: Date; label: string }>();

  for (const booking of bookings || []) {
    const userId = booking.user_id as string | null;

    if (!userId) {
      continue;
    }

    counts.set(userId, (counts.get(userId) || 0) + 1);

    if (!names.has(userId) && typeof booking.name === "string" && booking.name.trim()) {
      names.set(userId, booking.name.trim());
    }

    const relation = booking.time_slots as TimeSlot | TimeSlot[] | null;
    const slot = Array.isArray(relation) ? (relation[0] ?? null) : relation;

    if (!slot || booking.status !== "confirmed") {
      continue;
    }

    const startsAt = getSlotStartDate(slot);

    if (startsAt < new Date()) {
      continue;
    }

    const current = nextBookings.get(userId);
    const label = `${formatDateLabel(slot.slot_date)}, ${formatSlotRange(slot)}`;

    if (!current || startsAt < current.startsAt) {
      nextBookings.set(userId, { startsAt, label });
    }
  }

  return clientList.map<ClientOverview>((client) => ({
    ...client,
    bookingsCount: counts.get(client.id) || 0,
    displayName: client.name || names.get(client.id) || null,
    nextBookingLabel: nextBookings.get(client.id)?.label || null
  }));
}
