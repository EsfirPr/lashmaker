import { z } from "zod";

export const STYLE_OPTIONS = [
  "Классика",
  "2D",
  "3D",
  "Лисий эффект",
  "Мокрый эффект"
] as const;

export const phonePattern = /^[+0-9()\-\s]{10,20}$/;

export const bookingInputSchema = z.object({
  name: z.string().trim().min(2, "Укажите имя").max(100, "Слишком длинное имя"),
  phone: z
    .string()
    .trim()
    .regex(phonePattern, "Укажите корректный номер телефона"),
  style: z
    .string()
    .trim()
    .refine((value) => STYLE_OPTIONS.includes(value as (typeof STYLE_OPTIONS)[number]), {
      message: "Выберите стиль наращивания"
    }),
  notes: z.string().trim().max(500, "Слишком длинные пожелания").optional().default(""),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Некорректная дата"),
  slotId: z.string().uuid("Некорректный слот")
});

export const createSlotSchema = z
  .object({
    slotDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Введите дату"),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "Введите время начала"),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, "Введите время окончания")
  })
  .refine((value) => value.startTime < value.endTime, {
    path: ["endTime"],
    message: "Окончание должно быть позже начала"
  });

export const deleteSlotSchema = z.object({
  slotId: z.string().uuid("Некорректный идентификатор слота")
});

export const tokenSchema = z.object({
  token: z.string().min(8).max(128)
});

export const clientRegisterSchema = z.object({
  name: z.string().trim().min(2, "Укажите имя").max(100, "Слишком длинное имя"),
  phone: z
    .string()
    .trim()
    .regex(phonePattern, "Укажите корректный номер телефона"),
  password: z.string().min(6, "Пароль должен быть не короче 6 символов")
});

export const clientLoginSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(phonePattern, "Укажите корректный номер телефона"),
  password: z.string().min(6, "Введите пароль")
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(2, "Введите телефон или nickname"),
  password: z.string().min(6, "Введите пароль")
});

export const masterLoginSchema = z.object({
  nickname: z.string().trim().min(3, "Введите nickname мастера"),
  password: z.string().min(6, "Введите пароль")
});

export const bookingIdSchema = z.object({
  bookingId: z.string().uuid("Некорректный идентификатор записи")
});
