export function safeHttpUrl(value: string | null): string | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function safeTelephoneUrl(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const number = value.replace(/[^\d+]/g, "");
  return /^\+?\d{6,15}$/.test(number) ? `tel:${number}` : null;
}

export function safeWhatsAppUrl(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const number = value.replace(/\D/g, "");
  return /^\d{8,15}$/.test(number) ? `https://wa.me/${number}` : null;
}
