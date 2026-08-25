export function whatsappLink(number: string, message: string) {
  const digits = number.replace(/[^0-9]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function productEnquiryMessage(opts: {
  storeName: string;
  productName: string;
  variantLabel?: string | null;
  url: string;
}) {
  const variant = opts.variantLabel ? ` (${opts.variantLabel})` : "";
  return `Hello ${opts.storeName}, I'd like to order: ${opts.productName}${variant}\n${opts.url}`;
}
