import "server-only";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { env } from "@/lib/env";
import { smsProvider } from "@/lib/sms";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AdminSlotView, Booking, BookingWithSlot, DaySchedule, TimeSlot } from "@/lib/types";
import {
  bookingInputSchema,
  createSlotSchema,
  deleteSlotSchema,
  tokenSchema
} from "@/lib/validators";
import {
  createPublicBookingUrl,
  formatDateLabel,
  formatSlotRange,
  getRelativeDate,
  getTomorrowDate
} from "@/lib/utils";

type CreateBookingInput = {
  name: string;
  phone: string;
  style: string;
  notes?: string;
  date: string;
  slotId: string;
};

type CreateSlotInput = {
  slotDate: string;
  startTime: string;
  endTime: string;
};

function generateToken() {
  return randomBytes(18).toString("base64url");
}

function buildConfirmationMessage(booking: BookingWithSlot) {
  if (!booking.time_slots) {
    return "Ваша запись подтверждена.";
  }

  return [
    `${env.smsSenderName}: запись подтверждена.`,
    `${formatDateLabel(booking.time_slots.slot_date)}, ${formatSlotRange(booking.time_slots)}.`,
    `Стиль: ${booking.style}.`,
    `Детали: ${createPublicBookingUrl(booking.public_token)}`
  ].join(" ");
}

function buildReminderMessage(booking: BookingWithSlot) {
  if (!booking.time_slots) {
    return `${env.smsSenderName}: напоминаем о вашей записи завтра.`;
  }

  return [
    `${env.smsSenderName}: напоминаем о записи завтра.`,
    `${formatDateLabel(booking.time_slots.slot_date)}, ${formatSlotRange(booking.time_slots)}.`,
    `Стиль: ${booking.style}.`
  ].join(" ");
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

export async function listAvailableSlots(date: string) {
  const parsed = bookingInputSchema.pick({ date: true }).parse({ date });
  const supabase = getSupabaseAdminClient();

  const { data: slots, error: slotsError } = await supabase
    .from("time_slots")
    .select("*")
    .eq("slot_date", parsed.date)
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
  return safeSlots.filter((slot) => !busySlotIds.has(slot.id));
}

export async function createBooking(input: CreateBookingInput) {
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
    try {
      await smsProvider.send({
        to: data.phone,
        message: buildConfirmationMessage(data as BookingWithSlot)
      });
    } catch (smsError) {
      console.error("Failed to send booking confirmation SMS", smsError);
    }
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/booking/${data.public_token}`);

  return {
    token: (data as BookingWithSlot).public_token
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

  return (data as BookingWithSlot | null) || null;
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

  return data as BookingWithSlot;
}

export async function listScheduleDays(daysAhead = 14) {
  const supabase = getSupabaseAdminClient();
  const startDate = getRelativeDate(0);
  const endDate = getRelativeDate(daysAhead);

  const { data: slots, error } = await supabase
    .from("time_slots")
    .select("*")
    .gte("slot_date", startDate)
    .lte("slot_date", endDate)
    .order("slot_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const safeSlots = (slots || []) as TimeSlot[];
  const slotIds = safeSlots.map((slot) => slot.id);
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

  const grouped = new Map<string, AdminSlotView[]>();

  for (const slot of safeSlots) {
    const bookings = bookingsBySlot.get(slot.id) || [];
    const activeBooking = bookings.find((item) => item.status === "confirmed") || null;
    const cancelledBookings = bookings.filter((item) => item.status === "cancelled");
    const current = grouped.get(slot.slot_date) || [];
    current.push({
      ...slot,
      activeBooking,
      cancelledBookings
    });
    grouped.set(slot.slot_date, current);
  }

  return Array.from(grouped.entries()).map<DaySchedule>(([date, daySlots]) => ({
    date,
    slots: daySlots
  }));
}

export async function createTimeSlot(input: CreateSlotInput) {
  const payload = createSlotSchema.parse(input);
  const supabase = getSupabaseAdminClient();

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

export async function sendTomorrowReminders() {
  const supabase = getSupabaseAdminClient();
  const tomorrow = getTomorrowDate();

  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      id,
      name,
      phone,
      style,
      notes,
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
    .eq("time_slots.slot_date", tomorrow);

  if (error) {
    throw new Error(error.message);
  }

  let sent = 0;

  for (const booking of ((data || []) as BookingWithSlot[])) {
    await smsProvider.send({
      to: booking.phone,
      message: buildReminderMessage(booking)
    });

    const { error: updateError } = await supabase
      .from("bookings")
      .update({ reminder_sent: true })
      .eq("id", booking.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    sent += 1;
  }

  return {
    date: tomorrow,
    sent
  };
}
