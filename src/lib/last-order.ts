/** Lightweight receipt of the most recent checkout, kept so the confirmation
 *  page can show line items and totals even after a hard refresh. */
export interface OrderReceiptLine {
  name: string;
  variantLabel: string | null;
  qty: number;
  price: number;
}

export interface OrderReceipt {
  reference: string;
  placedAt: string;
  customerName: string;
  phone: string;
  email: string;
  notes: string;
  lines: OrderReceiptLine[];
  subtotal: number;
}

const KEY = "optique.lastOrder.v1";

export function saveOrderReceipt(receipt: OrderReceipt) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(receipt));
  } catch {
    /* storage unavailable — confirmation still renders from store data */
  }
}

export function loadOrderReceipt(reference?: string): OrderReceipt | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OrderReceipt;
    if (!parsed || typeof parsed.reference !== "string" || !Array.isArray(parsed.lines)) return null;
    if (reference && parsed.reference.toLowerCase() !== reference.trim().toLowerCase()) return null;
    return parsed;
  } catch {
    return null;
  }
}
