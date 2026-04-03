import "server-only";
import type { SendSmsInput, SmsProvider } from "@/lib/sms/provider";

export class ConsoleSmsProvider implements SmsProvider {
  async send(input: SendSmsInput) {
    console.info("[sms:console]", {
      to: input.to,
      message: input.message
    });
  }
}

