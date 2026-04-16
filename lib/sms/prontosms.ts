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
  const normalizedPhone = toProntoPhone(to);
  const params = new URLSearchParams({
    user: config.user,
    pwd: config.password,
    sadr: config.sender,
    dadr: normalizedPhone,
    text: message
  });

  return {
    url: `${prontoSmsApiUrl}?${params.toString()}`,
    redactedUrl: `${prontoSmsApiUrl}?${new URLSearchParams({
      user: config.user,
      pwd: "***",
      sadr: config.sender,
      dadr: normalizedPhone,
      text: getSmsLogPreview(message)
    }).toString()}`,
    config,
    normalizedPhone
  };
}

function isErrorResponse(result: string) {
  const normalized = result.trim().toLowerCase();

  return (
    normalized.startsWith("<!doctype") ||
    normalized.startsWith("<html") ||
    normalized.startsWith("error") ||
    normalized.includes("invalid") ||
    normalized.includes("denied") ||
    normalized.includes("failed")
  );
}

function extractMessageId(result: string) {
  const trimmed = result.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed) as { messageId?: string; id?: string; sms_id?: string };
    return parsed.messageId || parsed.id || parsed.sms_id || null;
  } catch {
    const match = trimmed.match(/(?:message[_\s-]?id|sms[_\s-]?id|id)\s*[:=]\s*([A-Za-z0-9_-]+)/i);
    return match?.[1] || null;
  }
}

export async function sendProntoSms(to: string, text: string) {
  const { url, redactedUrl, config, normalizedPhone } = buildRequestUrl(String(to), text);

  console.log("SMS GET REQUEST:", redactedUrl);
  console.log("SMS URL:", redactedUrl);
  console.info("[sms:prontosms] Sending request", {
    endpoint: prontoSmsApiUrl,
    user: maskValue(config.user),
    sender: config.sender,
    phone: normalizedPhone,
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
  const contentType = response.headers.get("content-type") || "unknown";
  const messageId = extractMessageId(result);

  console.log("SMS RESPONSE:", result);

  if (!response.ok) {
    console.error("[sms:prontosms] HTTP error", {
      status: response.status,
      contentType,
      phone: normalizedPhone,
      response: result
    });
    throw new Error(`ProntoSMS request failed with status ${response.status}`);
  }

  if (isErrorResponse(result)) {
    console.error("[sms:prontosms] API error", {
      contentType,
      phone: normalizedPhone,
      response: result
    });
    throw new Error(result || "ProntoSMS did not accept the message");
  }

  console.info("[sms:prontosms] SMS accepted by provider", {
    phone: normalizedPhone,
    contentType,
    messageId,
    responsePreview: result.slice(0, 160)
  });
}

export class ProntoSmsProvider implements SmsProvider {
  async send(input: SendSmsInput) {
    await sendProntoSms(input.to, input.message);
  }
}
