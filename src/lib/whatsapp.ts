export function whatsappLink(number: string, message: string) {
  const digits = number.replace(/[^0-9]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
