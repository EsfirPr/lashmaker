import "server-only";

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Environment variable ${name} is required`);
  }

  return value;
}

export const env = {
  supabaseUrl: requireEnv("SUPABASE_URL"),
  supabaseServiceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  smsProvider: process.env.SMS_PROVIDER || "console",
  smsSenderName: process.env.SMS_SENDER_NAME || "LashMaker",
  sendConfirmationOnBooking:
    process.env.SMS_SEND_CONFIRMATION_ON_BOOKING !== "false",
  cronSecret: process.env.CRON_SECRET || ""
};

