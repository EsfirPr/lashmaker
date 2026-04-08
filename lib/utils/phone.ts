const russianPhoneDigitsLength = 11;

export function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");

  if (!cleaned) {
    throw new Error("Введите корректный номер телефона");
  }

  let digits = cleaned;

  if (digits.startsWith("8") && digits.length === russianPhoneDigitsLength) {
    digits = `7${digits.slice(1)}`;
  } else if (digits.startsWith("9") && digits.length === 10) {
    digits = `7${digits}`;
  } else if (digits.startsWith("7") && digits.length === russianPhoneDigitsLength) {
    digits = digits;
  } else if (digits.startsWith("7") && digits.length !== russianPhoneDigitsLength) {
    throw new Error("Введите корректный номер телефона");
  } else {
    throw new Error("Введите корректный номер телефона");
  }

  if (digits.length !== russianPhoneDigitsLength) {
    throw new Error("Введите корректный номер телефона");
  }

  return `+${digits}`;
}
