import type { SafeUser, UserRole } from "@/lib/types";

export const SESSION_COOKIE_NAME = "lashmaker_session";
const sessionMaxAge = 60 * 60 * 24 * 30;

export type SessionPayload = {
  userId: string;
  role: UserRole;
  phone: string | null;
  nickname: string | null;
  exp: number;
};

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error("Environment variable AUTH_SECRET is required");
  }

  return secret;
}

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(value: string) {
  if (value.length % 2 !== 0) {
    return null;
  }

  const bytes = new Uint8Array(value.length / 2);

  for (let index = 0; index < value.length; index += 2) {
    const byte = Number.parseInt(value.slice(index, index + 2), 16);

    if (Number.isNaN(byte)) {
      return null;
    }

    bytes[index / 2] = byte;
  }

  return bytes;
}

async function getSigningKey() {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getAuthSecret()),
    {
      name: "HMAC",
      hash: "SHA-256"
    },
    false,
    ["sign", "verify"]
  );
}

async function signMessage(message: string) {
  const key = await getSigningKey();
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return toHex(signature);
}

export function buildSessionPayload(user: SafeUser): SessionPayload {
  return {
    userId: user.id,
    role: user.role,
    phone: user.phone,
    nickname: user.nickname,
    exp: Math.floor(Date.now() / 1000) + sessionMaxAge
  };
}

export async function createSessionCookieValue(user: SafeUser) {
  const payload = buildSessionPayload(user);
  const message = JSON.stringify(payload);
  const signature = await signMessage(message);
  return `${encodeURIComponent(message)}.${signature}`;
}

export async function verifySessionCookieValue(value: string | undefined) {
  if (!value) {
    return null;
  }

  try {
    const separatorIndex = value.lastIndexOf(".");

    if (separatorIndex <= 0) {
      return null;
    }

    const encodedMessage = value.slice(0, separatorIndex);
    const signature = value.slice(separatorIndex + 1);
    const message = decodeURIComponent(encodedMessage);
    const signatureBytes = fromHex(signature);

    if (!signatureBytes) {
      return null;
    }

    const key = await getSigningKey();
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes,
      new TextEncoder().encode(message)
    );

    if (!isValid) {
      return null;
    }

    const payload = JSON.parse(message) as SessionPayload;

    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionMaxAge
  };
}
