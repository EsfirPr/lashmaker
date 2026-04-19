"use server";

import { requireUserRole } from "@/lib/auth/server";
import { createTimeSlot, createTimeSlots, deleteFreeTimeSlot } from "@/lib/booking-service";
import type { AdminSlotFormState } from "@/app/admin/state";

type SlotSelection = {
  slotDate: string;
  startTime: string;
  endTime: string;
};

export async function addTimeSlotAction(
  _prevState: AdminSlotFormState,
  formData: FormData
): Promise<AdminSlotFormState> {
  try {
    await requireUserRole("master", "/login");
    const rawSelections = String(formData.get("slotSelections") || "").trim();

    if (rawSelections) {
      const selections = JSON.parse(rawSelections) as SlotSelection[];
      const groupedSelections = selections.reduce<Map<string, SlotSelection[]>>((accumulator, selection) => {
        const current = accumulator.get(selection.slotDate) || [];
        current.push(selection);
        accumulator.set(selection.slotDate, current);
        return accumulator;
      }, new Map());

      for (const [slotDate, daySelections] of groupedSelections) {
        await createTimeSlots({
          slotDate,
          ranges: daySelections.map((selection) => ({
            startTime: selection.startTime,
            endTime: selection.endTime
          }))
        });
      }

      return {
        status: "success",
        message: `Добавлено окон: ${selections.length}`
      };
    }

    const slotDate = String(formData.get("slotDate") || "");
    const timeRanges = String(formData.get("timeRanges") || "")
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean);

    if (timeRanges.length > 0) {
      await createTimeSlots({
        slotDate,
        ranges: timeRanges.map((range) => {
          const [startTime, endTime] = range.split("-").map((value) => value.trim());
          return {
            startTime: startTime || "",
            endTime: endTime || ""
          };
        })
      });

      return {
        status: "success",
        message: `Добавлено окон: ${timeRanges.length}`
      };
    }

    await createTimeSlot({
      slotDate,
      startTime: String(formData.get("startTime") || ""),
      endTime: String(formData.get("endTime") || "")
    });

    return {
      status: "success",
      message: "Окно добавлено"
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Не удалось добавить окно"
    };
  }
}

export async function deleteTimeSlotAction(formData: FormData) {
  await requireUserRole("master", "/login");
  await deleteFreeTimeSlot(String(formData.get("slotId") || ""));
}
