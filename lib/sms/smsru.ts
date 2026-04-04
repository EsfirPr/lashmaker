import "server-only";
import type { SendSmsInput, SmsProvider } from "@/lib/sms/provider";

type SmsRuResponse = {
  status?: string;
  status_text?: string;
  sms?: Record<
    string,
    {
      status?: string;
      status_text?: string;
    }
  >;
};

function requireSmsRuApiId() {
  const apiId = process.env.SMSRU_API_ID;

  if (!apiId) {
    throw new Error("Environment variable SMSRU_API_ID is required for SMS.ru provider");
  }

  return apiId;
}

export async function sendSmsRu(to: string, text: string) {
  const params = new URLSearchParams({
    api_id: requireSmsRuApiId(),
    to: String(to),
    msg: text,
    json: "1"
  });

  const response = await fetch("https://sms.ru/sms/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params
  });

  let payload: SmsRuResponse | null = null;

  try {
    payload = (await response.json()) as SmsRuResponse;
  } catch (error) {
    console.error("[sms:smsru] Failed to parse response", error);
    throw new Error("SMS.ru returned an invalid response");
  }

  if (!response.ok) {
    console.error("[sms:smsru] HTTP error", {
      status: response.status,
      payload
    });
    throw new Error(`SMS.ru request failed with status ${response.status}`);
  }

  if (payload.status !== "OK") {
    console.error("[sms:smsru] API error", payload);
    throw new Error(payload.status_text || "SMS.ru did not accept the message");
  }
}

export class SmsRuProvider implements SmsProvider {
  async send(input: SendSmsInput) {
    await sendSmsRu(input.to, input.message);
  }
}

