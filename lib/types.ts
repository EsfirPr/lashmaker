export type BookingStatus = "confirmed" | "cancelled";
export type UserRole = "master" | "client";

export type TimeSlot = {
  id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  created_at: string;
};

export type Booking = {
  id: string;
  name: string;
  phone: string;
  style: string;
  notes: string | null;
  user_id: string | null;
  slot_id: string;
  status: BookingStatus;
  public_token: string;
  reminder_sent: boolean;
  created_at: string;
};

export type User = {
  id: string;
  name: string | null;
  phone: string | null;
  nickname: string | null;
  password_hash: string;
  role: UserRole;
  created_at: string;
};

export type SafeUser = Omit<User, "password_hash">;

export type VerificationPurpose = "registration" | "login" | "change_phone";

export type PhoneVerification = {
  id: string;
  user_id: string | null;
  name: string;
  phone: string;
  password_hash: string;
  code_hash: string;
  purpose: VerificationPurpose;
  expires_at: string;
  used_at: string | null;
  attempts: number;
  last_sent_at: string;
  created_at: string;
  updated_at: string;
};

export type BookingWithSlot = Booking & {
  time_slots: TimeSlot | null;
};

export type AdminSlotView = TimeSlot & {
  activeBooking: Booking | null;
  cancelledBookings: Booking[];
};

export type DaySchedule = {
  date: string;
  slots: AdminSlotView[];
};

export type ClientOverview = SafeUser & {
  bookingsCount: number;
  displayName: string | null;
  nextBookingLabel: string | null;
};

export type MasterProfile = {
  user_id: string;
  display_name: string | null;
  headline: string | null;
  bio: string | null;
  years_experience: number | null;
  lash_experience_years: number | null;
  avatar_path: string | null;
  avatar_url: string | null;
  updated_at: string;
};

export type PortfolioItem = {
  id: string;
  owner_id: string;
  image_path: string;
  image_url: string;
  caption: string | null;
  created_at: string;
};

export type MasterCertificate = {
  id: string;
  owner_id: string;
  image_path: string;
  image_url: string;
  created_at: string;
};

export type MasterService = {
  id: string;
  owner_id: string;
  name: string;
  price: number;
  duration: string | null;
  description: string | null;
  image_path: string | null;
  image_url: string | null;
  secondary_image_path: string | null;
  secondary_image_url: string | null;
  created_at: string;
};
