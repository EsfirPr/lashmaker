import "server-only";
import { env } from "@/lib/env";
import { ConsoleSmsProvider } from "@/lib/sms/console-provider";
import { getSmsLogPreview, type SmsProvider } from "@/lib/sms/provider";
import { ProntoSmsProvider } from "@/lib/sms/prontosms";
import { SmsRuProvider } from "@/lib/sms/smsru";

function createSmsProvider(): SmsProvider {
  console.info("[sms] Selecting provider", {
    provider: env.smsProvider
  });

  switch (env.smsProvider) {
    case "prontosms":
      return new ProntoSmsProvider();
    case "smsru":
      return new SmsRuProvider();
    case "console":
    default:
      return new ConsoleSmsProvider();
  }
}

export const smsProvider = createSmsProvider();

export async function sendSms(to: string, text: string) {
  console.info("[sms] Sending message", {
    provider: env.smsProvider,
    to,
    messagePreview: getSmsLogPreview(text)
  });

  await smsProvider.send({
    to,
    message: text
  });
}
