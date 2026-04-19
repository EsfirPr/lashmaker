import "server-only";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { env } from "@/lib/env";
import { sendSms, smsProvider } from "@/lib/sms";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AdminSlotView, Booking, BookingWithSlot, DaySchedule, TimeSlot } from "@/lib/types";
import {
  bookingIdSchema,
  bookingInputSchema,
  createSlotSchema,
  deleteSlotSchema,
  tokenSchema
} from "@/lib/validators";
import {
  createPublicBookingUrl,
  formatDateLabel,
  formatSlotRange,
  isBookingCancelable,
  getRelativeDate,
  getSlotEndDate,
  getSlotStartDate,
  getTodayDate
} from "@/lib/utils";

type CreateBookingInput = {
  name: string;
  phone: string;
  style: string;
  notes?: string;
  date: string;
  slotId: string;
  userId?: string | null;
};

type CreateSlotInput = {
  slotDate: string;
  startTime: string;
  endTime: string;
};

type CreateManySlotsInput = {
  slotDate: string;
  ranges: Array<{
    startTime: string;
    endTime: string;
  }>;
};

type MasterBookingsFilters = {
  status?: string;
  date?: string;
  query?: string;
};

type BookingWithMaybeSlotArray = Booking & {
  time_slots: TimeSlot | TimeSlot[] | null;
};

const reminderLeadTimeInMs = 24 * 60 * 60 * 1000;
const reminderBufferInMs = 5 * 60 * 1000;
const reminderWindowStartInMs = reminderLeadTimeInMs - reminderBufferInMs;
const reminderWindowEndInMs = reminderLeadTimeInMs + reminderBufferInMs;
const reminderLeadTimeMinutes = 24 * 60;
const appTimeZone = process.env.APP_TIMEZONE || "Europe/Moscow";
const shortDateFormatter = new Intl.DateTimeFormat("ru-RU", {
  timeZone: appTimeZone,
  day: "2-digit",
  month: "2-digit"
});

function generateToken() {
  return randomBytes(18).toString("base64url");
}

function getZonedDateParts(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: appTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(value);

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);
  const second = Number(parts.find((part) => part.type === "second")?.value);

  return {
    year,
    month,
    day,
    hour,
    minute,
    second
  };
}

function toDateKey(parts: { year: number; month: number; day: number }) {
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(
    parts.day
  ).padStart(2, "0")}`;
}

function buildUpcomingReminderMessage(booking: BookingWithSlot) {
  if (!booking.time_slots) {
    return "Напоминаем: запись завтра.";
  }

  return `Напоминаем: запись завтра в ${booking.time_slots.start_time.slice(
    0,
    5
  )}`;
}

function getUpcomingReminderWindow() {
  const now = Date.now();
  const windowStart = new Date(now + reminderWindowStartInMs);
  const windowEnd = new Date(now + reminderWindowEndInMs);

  return {
    windowStart,
    windowEnd,
    startDate: toDateKey(getZonedDateParts(windowStart)),
    endDate: toDateKey(getZonedDateParts(windowEnd))
  };
}

function normalizeBookingWithSlot(
  booking: BookingWithMaybeSlotArray | null
): BookingWithSlot | null {
  if (!booking) {
    return null;
  }

  const timeSlot = Array.isArray(booking.time_slots)
    ? (booking.time_slots[0] ?? null)
    : booking.time_slots;

  return {
    ...booking,
    time_slots: timeSlot
  };
}

function normalizeBookingsWithSlot(
  bookings: BookingWithMaybeSlotArray[] | null | undefined
): BookingWithSlot[] {
  if (!bookings) {
    return [];
  }

  return bookings
    .map((booking) => normalizeBookingWithSlot(booking))
    .filter((booking): booking is BookingWithSlot => booking !== null);
}

function rangesOverlap(
  left: Pick<CreateSlotInput, "startTime" | "endTime">,
  right: Pick<CreateSlotInput, "startTime" | "endTime">
) {
  return left.startTime < right.endTime && right.startTime < left.endTime;
}

async function assertNoSlotOverlaps(
  slotDate: string,
  ranges: Array<Pick<CreateSlotInput, "startTime" | "endTime">>
) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("time_slots")
    .select("start_time, end_time")
    .eq("slot_date", slotDate)
    .order("start_time", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const existingRanges = ((data || []) as Array<Pick<TimeSlot, "start_time" | "end_time">>).map((slot) => ({
    startTime: slot.start_time,
    endTime: slot.end_time
  }));
  const nextRanges = [...ranges].sort((left, right) => left.startTime.localeCompare(right.startTime));

  for (let index = 0; index < nextRanges.length; index += 1) {
    const current = nextRanges[index];
    const next = nextRanges[index + 1];

    if (next && rangesOverlap(current, next)) {
      throw new Error("Окна не должны пересекаться между собой");
    }

    if (existingRanges.some((range) => rangesOverlap(current, range))) {
      throw new Error("Окно пересекается с существующим расписанием");
    }
  }
}

function buildConfirmationMessage(booking: BookingWithSlot) {
  if (!booking.time_slots) {
    return "Вы записаны.";
  }

  const formattedDate = shortDateFormatter.format(new Date(`${booking.time_slots.slot_date}T00:00:00`));
  const formattedTime = booking.time_slots.start_time.slice(0, 5);

  return `Вы записаны на ${formattedDate} в ${formattedTime}`;
}

function ensureBookingCancelable(booking: BookingWithSlot) {
  if (!booking.time_slots || !isBookingCancelable(booking.time_slots)) {
    const error = new Error("Отмена возможна не позднее чем за 5 минут до начала записи");
    error.name = "BookingCancellationDeadlineError";
    throw error;
  }
}

async function getSlotById(slotId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("time_slots")
    .select("*")
    .eq("id", slotId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as TimeSlot | null) || null;
}

async function hydrateAdminSlots(slots: TimeSlot[]) {
  const supabase = getSupabaseAdminClient();
  const slotIds = slots.map((slot) => slot.id);
  const bookingsBySlot = new Map<string, Booking[]>();

  if (slotIds.length > 0) {
    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select("*")
      .in("slot_id", slotIds)
      .order("created_at", { ascending: true });

    if (bookingsError) {
      throw new Error(bookingsError.message);
    }

    for (const booking of (bookings || []) as Booking[]) {
      const current = bookingsBySlot.get(booking.slot_id) || [];
      current.push(booking);
      bookingsBySlot.set(booking.slot_id, current);
    }
  }

  return slots.map<AdminSlotView>((slot) => {
    const bookings = bookingsBySlot.get(slot.id) || [];

    return {
      ...slot,
      activeBooking: bookings.find((item) => item.status === "confirmed") || null,
      cancelledBookings: bookings.filter((item) => item.status === "cancelled")
    };
  });
}

async function cleanupPastEmptyTimeSlots() {
  const supabase = getSupabaseAdminClient();
  const today = getTodayDate();

  const { data: candidateSlots, error: slotsError } = await supabase
    .from("time_slots")
    .select("*")
    .lte("slot_date", today)
    .order("slot_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (slotsError) {
    throw new Error(slotsError.message);
  }

  const safeSlots = (candidateSlots || []) as TimeSlot[];
  const expiredSlotIds = safeSlots
    .filter((slot) => getSlotEndDate(slot) < new Date())
    .map((slot) => slot.id);

  if (expiredSlotIds.length === 0) {
    return;
  }

  const { data: linkedBookings, error: bookingsError } = await supabase
    .from("bookings")
    .select("slot_id")
    .in("slot_id", expiredSlotIds);

  if (bookingsError) {
    throw new Error(bookingsError.message);
  }

  const protectedSlotIds = new Set((linkedBookings || []).map((booking) => booking.slot_id));
  const removableSlotIds = expiredSlotIds.filter((slotId) => !protectedSlotIds.has(slotId));

  if (removableSlotIds.length === 0) {
    return;
  }

  const { error: deleteError } = await supabase
    .from("time_slots")
    .delete()
    .in("id", removableSlotIds);

  if (deleteError) {
    throw new Error(deleteError.message);
  }
}

export async function listAvailableSlots(date: string) {
  const parsed = bookingInputSchema.pick({ date: true }).parse({ date });
  return listAvailableSlotsInRange(parsed.date, parsed.date);
}

export async function listAvailableSlotsInRange(startDate: string, endDate: string) {
  await cleanupPastEmptyTimeSlots();
  const parsed = bookingInputSchema
    .pick({ date: true })
    .array()
    .parse([{ date: startDate }, { date: endDate }]);
  const supabase = getSupabaseAdminClient();
  const today = getTodayDate();
  const effectiveStartDate = parsed[0].date < today ? today : parsed[0].date;

  if (parsed[1].date < effectiveStartDate) {
    return [];
  }

  const { data: slots, error: slotsError } = await supabase
    .from("time_slots")
    .select("*")
    .gte("slot_date", effectiveStartDate)
    .lte("slot_date", parsed[1].date)
    .order("slot_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (slotsError) {
    throw new Error(slotsError.message);
  }

  const safeSlots = (slots || []) as TimeSlot[];

  if (!safeSlots.length) {
    return [];
  }

  const slotIds = safeSlots.map((slot) => slot.id);
  const { data: activeBookings, error: bookingsError } = await supabase
    .from("bookings")
    .select("slot_id")
    .in("slot_id", slotIds)
    .eq("status", "confirmed");

  if (bookingsError) {
    throw new Error(bookingsError.message);
  }

  const busySlotIds = new Set((activeBookings || []).map((booking) => booking.slot_id));
  return safeSlots.filter((slot) => !busySlotIds.has(slot.id) && getSlotEndDate(slot) > new Date());
}

export async function createBooking(input: CreateBookingInput) {
  const userId = typeof input.userId === "string" ? input.userId : null;
  const payload = bookingInputSchema.parse(input);
  const supabase = getSupabaseAdminClient();
  const slot = await getSlotById(payload.slotId);

  if (!slot || slot.slot_date !== payload.date) {
    throw new Error("Выбранный слот недоступен");
  }

  const token = generateToken();

  const { data, error } = await supabase
    .from("bookings")
    .insert({
      name: payload.name,
      phone: payload.phone,
      style: payload.style,
      notes: payload.notes || null,
      user_id: userId,
      slot_id: payload.slotId,
      status: "confirmed",
      public_token: token,
      reminder_sent: false
    })
    .select(
      `
      id,
      name,
      phone,
      style,
      notes,
      user_id,
      slot_id,
      status,
      public_token,
      reminder_sent,
      created_at,
      time_slots!bookings_slot_id_fkey (
        id,
        slot_date,
        start_time,
        end_time,
        created_at
      )
    `
    )
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Этот слот уже заняли. Выберите другое время.");
    }

    throw new Error(error.message);
  }

  if (env.sendConfirmationOnBooking) {
    const booking = normalizeBookingWithSlot(data as BookingWithMaybeSlotArray | null);

    try {
      if (booking) {
        console.info("Sending booking confirmation SMS", {
          bookingId: booking.id,
          phone: booking.phone
        });
        await sendSms(booking.phone, buildConfirmationMessage(booking));
      }
    } catch (smsError) {
      console.error("Failed to send booking confirmation SMS", {
        bookingId: booking?.id,
        phone: booking?.phone,
        error: smsError instanceof Error ? smsError.message : "Unknown error"
      });
    }
  }

  revalidatePath("/");
  revalidatePath("/account");
  revalidatePath("/admin");
  revalidatePath("/master/dashboard");
  revalidatePath(`/booking/${data.public_token}`);

  return {
    token: data.public_token
  };
}

export async function getBookingByToken(token: string) {
  const parsed = tokenSchema.parse({ token });
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      id,
      name,
      phone,
      style,
      notes,
      user_id,
      slot_id,
      status,
      public_token,
      reminder_sent,
      created_at,
      time_slots!bookings_slot_id_fkey (
        id,
        slot_date,
        start_time,
        end_time,
        created_at
      )
    `
    )
    .eq("public_token", parsed.token)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeBookingWithSlot(data as BookingWithMaybeSlotArray | null);
}

export async function cancelBookingByToken(token: string) {
  const parsed = tokenSchema.parse({ token });
  const supabase = getSupabaseAdminClient();

  const booking = await getBookingByToken(parsed.token);

  if (!booking) {
    throw new Error("Запись не найдена");
  }

  if (booking.status === "cancelled") {
    return booking;
  }

  ensureBookingCancelable(booking);

  const { data, error } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("public_token", parsed.token)
    .eq("status", "confirmed")
    .select(
      `
      id,
      name,
      phone,
      style,
      notes,
      user_id,
      slot_id,
      status,
      public_token,
      reminder_sent,
      created_at,
      time_slots!bookings_slot_id_fkey (
        id,
        slot_date,
        start_time,
        end_time,
        created_at
      )
    `
    )
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/booking/${parsed.token}`);

  const normalizedBooking = normalizeBookingWithSlot(data as BookingWithMaybeSlotArray | null);

  if (!normalizedBooking) {
    throw new Error("Не удалось получить обновленную запись");
  }

  return normalizedBooking;
}

export async function listScheduleDays(daysAhead = 14) {
  const startDate = getRelativeDate(0);
  const endDate = getRelativeDate(daysAhead);
  return listScheduleDaysInRange(startDate, endDate);
}

export async function listScheduleDaysInRange(startDate: string, endDate: string) {
  await cleanupPastEmptyTimeSlots();
  const parsed = bookingInputSchema
    .pick({ date: true })
    .array()
    .parse([{ date: startDate }, { date: endDate }]);
  const supabase = getSupabaseAdminClient();
  const today = getTodayDate();
  const effectiveStartDate = parsed[0].date < today ? today : parsed[0].date;

  if (parsed[1].date < effectiveStartDate) {
    return [];
  }

  const { data: slots, error } = await supabase
    .from("time_slots")
    .select("*")
    .gte("slot_date", effectiveStartDate)
    .lte("slot_date", parsed[1].date)
    .order("slot_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const safeSlots = (slots || []) as TimeSlot[];
  const adminSlots = await hydrateAdminSlots(safeSlots);
  const grouped = new Map<string, AdminSlotView[]>();

  for (const slot of adminSlots) {
    const current = grouped.get(slot.slot_date) || [];
    current.push(slot);
    grouped.set(slot.slot_date, current);
  }

  return Array.from(grouped.entries()).map<DaySchedule>(([date, daySlots]) => ({
    date,
    slots: daySlots
  }));
}

export async function getScheduleSlotDetail(slotId: string) {
  await cleanupPastEmptyTimeSlots();
  const payload = deleteSlotSchema.parse({ slotId });
  const slot = await getSlotById(payload.slotId);

  if (!slot) {
    return null;
  }

  const [adminSlot] = await hydrateAdminSlots([slot]);
  return adminSlot || null;
}

export async function createTimeSlot(input: CreateSlotInput) {
  const payload = createSlotSchema.parse(input);
  const supabase = getSupabaseAdminClient();
  await assertNoSlotOverlaps(payload.slotDate, [
    {
      startTime: payload.startTime,
      endTime: payload.endTime
    }
  ]);

  const { error } = await supabase.from("time_slots").insert({
    slot_date: payload.slotDate,
    start_time: payload.startTime,
    end_time: payload.endTime
  });

  if (error) {
    if (error.code === "23505") {
      throw new Error("Такое окно уже существует");
    }

    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/admin");
}

export async function createTimeSlots(input: CreateManySlotsInput) {
  const supabase = getSupabaseAdminClient();
  const validRanges = input.ranges.map((range) =>
    createSlotSchema.parse({
      slotDate: input.slotDate,
      startTime: range.startTime,
      endTime: range.endTime
    })
  );
  await assertNoSlotOverlaps(
    input.slotDate,
    validRanges.map((range) => ({
      startTime: range.startTime,
      endTime: range.endTime
    }))
  );

  const { error } = await supabase.from("time_slots").insert(
    validRanges.map((range) => ({
      slot_date: range.slotDate,
      start_time: range.startTime,
      end_time: range.endTime
    }))
  );

  if (error) {
    if (error.code === "23505") {
      throw new Error("Одно из окон уже существует");
    }

    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/master/dashboard");
  revalidatePath("/master/stats");
}

export async function deleteFreeTimeSlot(slotId: string) {
  const payload = deleteSlotSchema.parse({ slotId });
  const supabase = getSupabaseAdminClient();

  const { data: activeBooking, error: bookingError } = await supabase
    .from("bookings")
    .select("id")
    .eq("slot_id", payload.slotId)
    .eq("status", "confirmed")
    .maybeSingle();

  if (bookingError) {
    throw new Error(bookingError.message);
  }

  if (activeBooking) {
    throw new Error("Нельзя удалить занятое окно");
  }

  const { error } = await supabase.from("time_slots").delete().eq("id", payload.slotId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/admin");
}

export async function sendUpcomingReminders() {
  const supabase = getSupabaseAdminClient();
  const { windowStart, windowEnd, startDate, endDate } = getUpcomingReminderWindow();

  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      id,
      name,
      phone,
      style,
      notes,
      user_id,
      slot_id,
      status,
      public_token,
      reminder_sent,
      created_at,
      time_slots!inner (
        id,
        slot_date,
        start_time,
        end_time,
        created_at
      )
    `
    )
    .eq("status", "confirmed")
    .eq("reminder_sent", false)
    .gte("time_slots.slot_date", startDate)
    .lte("time_slots.slot_date", endDate);

  if (error) {
    throw new Error(error.message);
  }

  const bookings = normalizeBookingsWithSlot(data as BookingWithMaybeSlotArray[] | null).filter(
    (booking) => {
      if (!booking.time_slots) {
        return false;
      }

      const appointmentDate = getSlotStartDate(booking.time_slots);
      return appointmentDate >= windowStart && appointmentDate <= windowEnd;
    }
  );

  let sent = 0;
  let failed = 0;

  console.info("Prepared reminder batch", {
    targetLeadMinutes: reminderLeadTimeMinutes,
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    checked: bookings.length
  });

  for (const booking of bookings) {
    try {
      await sendSms(booking.phone, buildUpcomingReminderMessage(booking));

      const { data: updatedRows, error: updateError } = await supabase
        .from("bookings")
        .update({ reminder_sent: true })
        .eq("id", booking.id)
        .eq("reminder_sent", false)
        .select("id");

      if (updateError) {
        console.error("Failed to update reminder_sent", {
          bookingId: booking.id,
          error: updateError.message
        });
        failed += 1;
        continue;
      }

      if (!updatedRows || updatedRows.length === 0) {
        continue;
      }

      sent += 1;
    } catch (sendError) {
      console.error("Failed to send reminder SMS", {
        bookingId: booking.id,
        phone: booking.phone,
        error: sendError instanceof Error ? sendError.message : "Unknown error"
      });
      failed += 1;
    }
  }

  return {
    targetLeadMinutes: reminderLeadTimeMinutes,
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    checked: bookings.length,
    sent,
    failed
  };
}

export async function listBookingsForClient(userId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      id,
      name,
      phone,
      style,
      notes,
      user_id,
      slot_id,
      status,
      public_token,
      reminder_sent,
      created_at,
      time_slots!bookings_slot_id_fkey (
        id,
        slot_date,
        start_time,
        end_time,
        created_at
      )
    `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return normalizeBookingsWithSlot(data as BookingWithMaybeSlotArray[] | null);
}

export async function listBookingsForMaster(filters: MasterBookingsFilters = {}) {
  const supabase = getSupabaseAdminClient();
  let query = supabase
    .from("bookings")
    .select(
      `
      id,
      name,
      phone,
      style,
      notes,
      user_id,
      slot_id,
      status,
      public_token,
      reminder_sent,
      created_at,
      time_slots!bookings_slot_id_fkey (
        id,
        slot_date,
        start_time,
        end_time,
        created_at
      )
    `
    )
    .order("created_at", { ascending: false });

  if (filters.date) {
    query = query.eq("time_slots.slot_date", filters.date);
  }

  if (filters.status === "confirmed" || filters.status === "cancelled") {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const normalized = normalizeBookingsWithSlot(data as BookingWithMaybeSlotArray[] | null).sort(
    (left, right) => {
      const leftDate = left.time_slots ? getSlotStartDate(left.time_slots).getTime() : 0;
      const rightDate = right.time_slots ? getSlotStartDate(right.time_slots).getTime() : 0;
      return leftDate - rightDate;
    }
  );

  const queryTerm = filters.query?.trim().toLowerCase();

  return normalized.filter((booking) => {
    const isCompleted =
      booking.status === "confirmed" &&
      booking.time_slots &&
      getSlotEndDate(booking.time_slots) < new Date();

    if (filters.status === "completed" && !isCompleted) {
      return false;
    }

    if (filters.status === "active" && booking.status !== "confirmed") {
      return false;
    }

    if (!queryTerm) {
      return true;
    }

    return (
      booking.name.toLowerCase().includes(queryTerm) ||
      booking.phone.toLowerCase().includes(queryTerm) ||
      booking.style.toLowerCase().includes(queryTerm)
    );
  });
}

export async function cancelBookingForClient(bookingId: string, userId: string) {
  const payload = bookingIdSchema.parse({ bookingId });
  const supabase = getSupabaseAdminClient();
  const { data: existingBooking, error: bookingError } = await supabase
    .from("bookings")
    .select(
      `
      id,
      name,
      phone,
      style,
      notes,
      user_id,
      slot_id,
      status,
      public_token,
      reminder_sent,
      created_at,
      time_slots!bookings_slot_id_fkey (
        id,
        slot_date,
        start_time,
        end_time,
        created_at
      )
    `
    )
    .eq("id", payload.bookingId)
    .eq("user_id", userId)
    .maybeSingle();

  if (bookingError) {
    throw new Error(bookingError.message);
  }

  const booking = normalizeBookingWithSlot(existingBooking as BookingWithMaybeSlotArray | null);

  if (!booking) {
    throw new Error("Запись не найдена или уже отменена");
  }

  if (booking.status === "cancelled") {
    throw new Error("Запись не найдена или уже отменена");
  }

  ensureBookingCancelable(booking);

  const { data, error } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", payload.bookingId)
    .eq("user_id", userId)
    .eq("status", "confirmed")
    .select(
      `
      id,
      name,
      phone,
      style,
      notes,
      user_id,
      slot_id,
      status,
      public_token,
      reminder_sent,
      created_at,
      time_slots!bookings_slot_id_fkey (
        id,
        slot_date,
        start_time,
        end_time,
        created_at
      )
    `
    )
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Запись не найдена или уже отменена");
  }

  revalidatePath("/account");
  revalidatePath("/master/dashboard");
  revalidatePath("/admin");

  return normalizeBookingWithSlot(data as BookingWithMaybeSlotArray | null);
}
