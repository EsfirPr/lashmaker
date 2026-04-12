import "server-only";
import { normalizePhone } from "@/lib/utils/phone";
import { getSmsLogPreview, type SendSmsInput, type SmsProvider } from "@/lib/sms/provider";

const prontoSmsApiUrl = "https://clk.prontosms.ru/sendsms.php";

function maskValue(value: string | undefined) {
  if (!value) {
    return "missing";
  }

  if (value.length <= 4) {
    return "***";
  }

  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}

function getProntoSmsConfig() {
  const user = process.env.SMS_USER || process.env.PRONTOSMS_LOGIN;
  const password = process.env.SMS_PASSWORD || process.env.PRONTOSMS_PASSWORD;
  const sender =
    process.env.SMS_SENDER ||
    process.env.PRONTOSMS_SENDER ||
    process.env.SMS_SENDER_NAME ||
    "LashMaker";

  if (!user) {
    throw new Error("Environment variable SMS_USER is required for ProntoSMS provider");
  }

  if (!password) {
    throw new Error("Environment variable SMS_PASSWORD is required for ProntoSMS provider");
  }

  if (!sender) {
    throw new Error("Environment variable SMS_SENDER is required for ProntoSMS provider");
  }

  return {
    user,
    password,
    sender
  };
}

function toProntoPhone(phone: string) {
  return normalizePhone(phone).slice(1);
}

function buildRequestUrl(to: string, message: string) {
  const config = getProntoSmsConfig();
  const params = new URLSearchParams({
    user: config.user,
    pwd: config.password,
    sadr: config.sender,
    dadr: toProntoPhone(to),
    text: message,
    translite: "1"
  });

  return {
    url: `${prontoSmsApiUrl}?${params.toString()}`,
    redactedUrl: `${prontoSmsApiUrl}?${new URLSearchParams({
      user: config.user,
      pwd: "***",
      sadr: config.sender,
      dadr: toProntoPhone(to),
      text: getSmsLogPreview(message),
      translite: "1"
    }).toString()}`,
    config
  };
}

function isErrorResponse(result: string) {
  const normalized = result.trim().toLowerCase();

  return (
    normalized.startsWith("error") ||
    normalized.includes("invalid") ||
    normalized.includes("denied") ||
    normalized.includes("failed")
  );
}

export async function sendProntoSms(to: string, text: string) {
  const { url, redactedUrl, config } = buildRequestUrl(String(to), text);

  console.log("SMS URL:", redactedUrl);
  console.info("[sms:prontosms] Sending request", {
    endpoint: prontoSmsApiUrl,
    user: maskValue(config.user),
    sender: config.sender,
    phone: toProntoPhone(String(to)),
    messagePreview: getSmsLogPreview(text)
  });

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "text/plain, text/html;q=0.9, */*;q=0.8"
    },
    cache: "no-store"
  });

  const result = await response.text();

  console.log("SMS RESPONSE:", result);

  if (!response.ok) {
    console.error("[sms:prontosms] HTTP error", {
      status: response.status,
      response: result
    });
    throw new Error(`ProntoSMS request failed with status ${response.status}`);
  }

  if (isErrorResponse(result)) {
    console.error("[sms:prontosms] API error", {
      response: result
    });
    throw new Error(result || "ProntoSMS did not accept the message");
  }
}

export class ProntoSmsProvider implements SmsProvider {
  async send(input: SendSmsInput) {
    await sendProntoSms(input.to, input.message);
  }
}
