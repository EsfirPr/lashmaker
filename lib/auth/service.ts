import "server-only";
import { randomInt } from "node:crypto";
import { env } from "@/lib/env";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { sendSms } from "@/lib/sms";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  ClientOverview,
  PhoneVerification,
  SafeUser,
  TimeSlot,
  User,
  VerificationPurpose
} from "@/lib/types";
import {
  beginClientRegistrationSchema,
  beginClientSmsLoginSchema,
  clientLoginSchema,
  loginSchema,
  masterLoginSchema,
  phonePattern,
  verifyClientRegistrationSchema,
  verifyClientSmsLoginSchema
} from "@/lib/validators";
import { normalizePhone } from "@/lib/utils/phone";
import { formatDateLabel, formatSlotRange, getSlotStartDate } from "@/lib/utils";

const verificationCodeLength = 4;
const verificationTtlMinutes = 10;
const resendCooldownSeconds = 60;
const maxVerificationAttempts = 5;

function toSafeUser(user: User): SafeUser {
  const { password_hash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

function generateVerificationCode() {
  const min = 10 ** (verificationCodeLength - 1);
  const max = 10 ** verificationCodeLength;
  return String(randomInt(min, max));
}

function buildVerificationMessage(code: string) {
  return `Ваш код подтверждения: ${code}`;
}

function buildLoginCodeMessage(code: string) {
  return `Ваш код входа: ${code}`;
}

function getVerificationExpiryDate() {
  return new Date(Date.now() + verificationTtlMinutes * 60 * 1000);
}

function getResendAvailableAtDate() {
  return new Date(Date.now() + resendCooldownSeconds * 1000);
}

function isVerificationExpired(verification: PhoneVerification) {
  return new Date(verification.expires_at) <= new Date();
}

function toVerificationState(verification: PhoneVerification) {
  return {
    phone: verification.phone,
    expiresAt: verification.expires_at,
    resendAvailableAt: new Date(
      new Date(verification.last_sent_at).getTime() + resendCooldownSeconds * 1000
    ).toISOString()
  };
}

async function getPhoneVerification(phone: string, purpose: VerificationPurpose) {
  const normalizedPhone = normalizePhone(phone);
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("phone_verifications")
    .select("*")
    .eq("phone", normalizedPhone)
    .eq("purpose", purpose)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as PhoneVerification | null) || null;
}

async function assertClientPhoneAvailable(phone: string) {
  const existingUser = await getClientUserByPhone(phone);

  if (existingUser) {
    throw new Error("Пользователь с таким номером уже существует");
  }
}

async function savePhoneVerification(input: {
  name: string;
  phone: string;
  passwordHash: string;
  codeHash: string;
  purpose: VerificationPurpose;
}) {
  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();
  const expiresAt = getVerificationExpiryDate().toISOString();

  const { data, error } = await supabase
    .from("phone_verifications")
    .upsert(
      {
        phone: input.phone,
        name: input.name,
        password_hash: input.passwordHash,
        code_hash: input.codeHash,
        purpose: input.purpose,
        expires_at: expiresAt,
        used_at: null,
        attempts: 0,
        last_sent_at: now,
        updated_at: now
      },
      {
        onConflict: "phone,purpose"
      }
    )
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as PhoneVerification;
}

async function markVerificationUsed(phone: string, purpose: VerificationPurpose) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("phone_verifications")
    .update({
      used_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("phone", normalizePhone(phone))
    .eq("purpose", purpose);

  if (error) {
    throw new Error(error.message);
  }
}

async function incrementVerificationAttempts(
  phone: string,
  purpose: VerificationPurpose,
  attempts: number
) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("phone_verifications")
    .update({
      attempts: attempts + 1,
      updated_at: new Date().toISOString()
    })
    .eq("phone", normalizePhone(phone))
    .eq("purpose", purpose);

  if (error) {
    throw new Error(error.message);
  }
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

async function requireExistingClientByPhone(phone: string) {
  const client = await getClientUserByPhone(phone);

  if (!client) {
    throw new Error("Аккаунт с таким номером не найден");
  }

  return client;
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

async function createClientUser(input: {
  name: string;
  phone: string;
  passwordHash: string;
}) {
  const supabase = getSupabaseAdminClient();
  const existingUser = await getClientUserByPhone(input.phone);

  if (existingUser) {
    throw new Error("Пользователь с таким номером уже существует");
  }

  const { data, error } = await supabase
    .from("users")
    .insert({
      name: input.name,
      phone: input.phone,
      password_hash: input.passwordHash,
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

export async function beginClientRegistration(input: {
  name: string;
  phone: string;
  password: string;
  privacyAccepted: boolean;
}) {
  const payload = beginClientRegistrationSchema.parse(input);
  await assertClientPhoneAvailable(payload.phone);

  const existingVerification = await getPhoneVerification(payload.phone, "registration");

  if (
    existingVerification &&
    !existingVerification.used_at &&
    !isVerificationExpired(existingVerification)
  ) {
    const resendAvailableAt = new Date(
      new Date(existingVerification.last_sent_at).getTime() + resendCooldownSeconds * 1000
    );

    if (resendAvailableAt > new Date()) {
      throw new Error("Код уже отправлен. Попробуйте запросить его повторно чуть позже");
    }
  }

  const passwordHash = await hashPassword(payload.password);
  const code = generateVerificationCode();
  const codeHash = await hashPassword(code);
  const verification = await savePhoneVerification({
    name: payload.name,
    phone: payload.phone,
    passwordHash,
    codeHash,
    purpose: "registration"
  });

  try {
    await sendSms(payload.phone, buildVerificationMessage(code));
  } catch (error) {
    console.error("Failed to send registration verification SMS", {
      phone: payload.phone,
      error: error instanceof Error ? error.message : error
    });
    throw new Error("Не удалось отправить SMS с кодом. Попробуйте ещё раз");
  }

  return toVerificationState(verification);
}

export async function resendClientVerificationCode(phone: string) {
  const normalizedPhone = normalizePhone(phone);
  await assertClientPhoneAvailable(normalizedPhone);

  const existingVerification = await getPhoneVerification(normalizedPhone, "registration");

  if (!existingVerification || existingVerification.used_at) {
    throw new Error("Сначала заполните форму регистрации");
  }

  const resendAvailableAt = new Date(
    new Date(existingVerification.last_sent_at).getTime() + resendCooldownSeconds * 1000
  );

  if (resendAvailableAt > new Date()) {
    throw new Error("Повторная отправка пока недоступна. Подождите немного");
  }

  const code = generateVerificationCode();
  const codeHash = await hashPassword(code);
  const verification = await savePhoneVerification({
    name: existingVerification.name,
    phone: normalizedPhone,
    passwordHash: existingVerification.password_hash,
    codeHash,
    purpose: "registration"
  });

  try {
    await sendSms(normalizedPhone, buildVerificationMessage(code));
  } catch (error) {
    console.error("Failed to resend registration verification SMS", {
      phone: normalizedPhone,
      error: error instanceof Error ? error.message : error
    });
    throw new Error("Не удалось отправить SMS с кодом. Попробуйте ещё раз");
  }

  return toVerificationState(verification);
}

export async function verifyClientRegistration(input: {
  phone: string;
  code: string;
}) {
  const payload = verifyClientRegistrationSchema.parse(input);
  await assertClientPhoneAvailable(payload.phone);

  const verification = await getPhoneVerification(payload.phone, "registration");

  if (!verification || verification.used_at) {
    throw new Error("Код подтверждения не найден. Запросите новый код");
  }

  if (isVerificationExpired(verification)) {
    throw new Error("Срок действия кода истёк. Запросите новый код");
  }

  if (verification.attempts >= maxVerificationAttempts) {
    throw new Error("Превышено количество попыток. Запросите новый код");
  }

  const isValidCode = await verifyPassword(payload.code, verification.code_hash);

  if (!isValidCode) {
    await incrementVerificationAttempts(payload.phone, "registration", verification.attempts);
    throw new Error("Неверный код подтверждения");
  }

  const user = await createClientUser({
    name: verification.name,
    phone: verification.phone,
    passwordHash: verification.password_hash
  });

  await markVerificationUsed(verification.phone, "registration");

  return user;
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

export async function beginClientSmsLogin(input: { phone: string }) {
  const payload = beginClientSmsLoginSchema.parse(input);
  const user = await requireExistingClientByPhone(payload.phone);
  const existingVerification = await getPhoneVerification(payload.phone, "login");

  if (
    existingVerification &&
    !existingVerification.used_at &&
    !isVerificationExpired(existingVerification)
  ) {
    const resendAvailableAt = new Date(
      new Date(existingVerification.last_sent_at).getTime() + resendCooldownSeconds * 1000
    );

    if (resendAvailableAt > new Date()) {
      throw new Error("Код уже отправлен. Попробуйте запросить его повторно чуть позже");
    }
  }

  const code = generateVerificationCode();
  const codeHash = await hashPassword(code);
  const verification = await savePhoneVerification({
    name: user.name || user.phone || "Клиент",
    phone: payload.phone,
    passwordHash: user.password_hash,
    codeHash,
    purpose: "login"
  });

  try {
    await sendSms(payload.phone, buildLoginCodeMessage(code));
  } catch (error) {
    console.error("Failed to send login verification SMS", {
      phone: payload.phone,
      error: error instanceof Error ? error.message : error
    });
    throw new Error("Не удалось отправить SMS с кодом. Попробуйте ещё раз");
  }

  return toVerificationState(verification);
}

export async function resendClientSmsLoginCode(phone: string) {
  const normalizedPhone = normalizePhone(phone);
  const user = await requireExistingClientByPhone(normalizedPhone);
  const existingVerification = await getPhoneVerification(normalizedPhone, "login");

  if (!existingVerification || existingVerification.used_at) {
    throw new Error("Сначала запросите код для входа");
  }

  const resendAvailableAt = new Date(
    new Date(existingVerification.last_sent_at).getTime() + resendCooldownSeconds * 1000
  );

  if (resendAvailableAt > new Date()) {
    throw new Error("Повторная отправка пока недоступна. Подождите немного");
  }

  const code = generateVerificationCode();
  const codeHash = await hashPassword(code);
  const verification = await savePhoneVerification({
    name: user.name || user.phone || "Клиент",
    phone: normalizedPhone,
    passwordHash: user.password_hash,
    codeHash,
    purpose: "login"
  });

  try {
    await sendSms(normalizedPhone, buildLoginCodeMessage(code));
  } catch (error) {
    console.error("Failed to resend login verification SMS", {
      phone: normalizedPhone,
      error: error instanceof Error ? error.message : error
    });
    throw new Error("Не удалось отправить SMS с кодом. Попробуйте ещё раз");
  }

  return toVerificationState(verification);
}

export async function verifyClientSmsLogin(input: { phone: string; code: string }) {
  const payload = verifyClientSmsLoginSchema.parse(input);
  const user = await requireExistingClientByPhone(payload.phone);
  const verification = await getPhoneVerification(payload.phone, "login");

  if (!verification || verification.used_at) {
    throw new Error("Код входа не найден. Запросите новый код");
  }

  if (isVerificationExpired(verification)) {
    throw new Error("Срок действия кода истёк. Запросите новый код");
  }

  if (verification.attempts >= maxVerificationAttempts) {
    throw new Error("Превышено количество попыток. Запросите новый код");
  }

  const isValidCode = await verifyPassword(payload.code, verification.code_hash);

  if (!isValidCode) {
    await incrementVerificationAttempts(payload.phone, "login", verification.attempts);
    throw new Error("Неверный код входа");
  }

  await markVerificationUsed(verification.phone, "login");

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
