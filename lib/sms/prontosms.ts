import "server-only";
import { randomUUID } from "node:crypto";
import { normalizePhone } from "@/lib/utils/phone";
import type { SendSmsInput, SmsProvider } from "@/lib/sms/provider";

type ProntoSmsResponse = {
  success?: boolean;
  status?: string | number;
  error?: string;
  message?: string;
  detail?: string;
};

type ProntoSmsAuthMode = "login_password" | "api_key";

function getProntoSmsConfig() {
  const apiUrl = process.env.PRONTOSMS_API_URL;
  const authMode = (process.env.PRONTOSMS_AUTH_MODE || "login_password") as ProntoSmsAuthMode;
  const apiKey = process.env.PRONTOSMS_API_KEY;
  const login = process.env.PRONTOSMS_LOGIN;
  const password = process.env.PRONTOSMS_PASSWORD;
  const sender = process.env.PRONTOSMS_SENDER || process.env.SMS_SENDER_NAME || "LashMaker";

  if (!apiUrl) {
    throw new Error("Environment variable PRONTOSMS_API_URL is required for ProntoSMS provider");
  }

  if (authMode === "api_key" && !apiKey) {
    throw new Error(
      "Configure PRONTOSMS_API_KEY when PRONTOSMS_AUTH_MODE=api_key"
    );
  }

  if (authMode === "login_password" && !(login && password)) {
    throw new Error(
      "Configure PRONTOSMS_LOGIN and PRONTOSMS_PASSWORD when PRONTOSMS_AUTH_MODE=login_password"
    );
  }

  return {
    apiUrl,
    authMode,
    apiKey,
    login,
    password,
    sender
  };
}

function toProntoPhone(phone: string) {
  return normalizePhone(phone).slice(1);
}

export async function sendProntoSms(to: string, text: string) {
  const config = getProntoSmsConfig();
  const message = {
    phone: toProntoPhone(String(to)),
    sender: config.sender,
    clientId: randomUUID(),
    text
  };
  const body: Record<string, unknown> = {
    messages: [message]
  };

  if (config.authMode === "api_key" && config.apiKey) {
    body.apiKey = config.apiKey;
  } else if (config.login && config.password) {
    body.login = config.login;
    body.password = config.password;
  }

  const response = await fetch(config.apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/plain;q=0.9, */*;q=0.8"
    },
    body: JSON.stringify(body)
  });

  const contentType = response.headers.get("content-type") || "";
  let payload: ProntoSmsResponse | string | null = null;

  try {
    if (contentType.includes("application/json")) {
      payload = (await response.json()) as ProntoSmsResponse;
    } else {
      payload = await response.text();
    }
  } catch (error) {
    console.error("[sms:prontosms] Failed to parse response", error);
    throw new Error("ProntoSMS returned an invalid response");
  }

  if (!response.ok) {
    console.error("[sms:prontosms] HTTP error", {
      status: response.status,
      payload
    });
    throw new Error(`ProntoSMS request failed with status ${response.status}`);
  }

  if (
    payload &&
    typeof payload === "object" &&
    ("error" in payload ||
      payload.success === false ||
      payload.status === "error" ||
      payload.status === "ERROR")
  ) {
    console.error("[sms:prontosms] API error", payload);
    throw new Error(payload.error || payload.detail || payload.message || "ProntoSMS did not accept the message");
  }
}

export class ProntoSmsProvider implements SmsProvider {
  async send(input: SendSmsInput) {
    await sendProntoSms(input.to, input.message);
  }
}
