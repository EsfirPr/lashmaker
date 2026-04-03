export type SendSmsInput = {
  to: string;
  message: string;
};

export interface SmsProvider {
  send(input: SendSmsInput): Promise<void>;
}

