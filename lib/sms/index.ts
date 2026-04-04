import "server-only";
import { env } from "@/lib/env";
import { ConsoleSmsProvider } from "@/lib/sms/console-provider";
import type { SmsProvider } from "@/lib/sms/provider";
import { SmsRuProvider } from "@/lib/sms/smsru";

function createSmsProvider(): SmsProvider {
  switch (env.smsProvider) {
    case "smsru":
      return new SmsRuProvider();
    case "console":
    default:
      return new ConsoleSmsProvider();
  }
}

export const smsProvider = createSmsProvider();
