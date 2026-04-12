export type SendSmsInput = {
  to: string;
  message: string;
};

export interface SmsProvider {
  send(input: SendSmsInput): Promise<void>;
}

export function getSmsLogPreview(message: string) {
  if (/код подтверждения|код входа/i.test(message)) {
    return "sms-code:[redacted]";
  }

  return message.slice(0, 80);
}
