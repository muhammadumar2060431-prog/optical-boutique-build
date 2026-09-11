import { createContext, useContext, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Mail, Phone, User, X } from "lucide-react";

import { WhatsAppIcon } from "./WhatsAppIcon";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";
import { whatsappLink } from "@/lib/whatsapp";

interface WhatsAppModalOptions {
  productName?: string;
  productId?: string | null;
  variantId?: string | null;
  variantLabel?: string | null;
}

interface WhatsAppModalContextType {
  openWhatsAppModal: (options?: WhatsAppModalOptions) => void;
  closeWhatsAppModal: () => void;
}

const WhatsAppModalContext = createContext<WhatsAppModalContextType | null>(null);

export function useWhatsAppModal() {
  const ctx = useContext(WhatsAppModalContext);
  if (!ctx) {
    return {
      openWhatsAppModal: () => {},
      closeWhatsAppModal: () => {},
    };
  }
  return ctx;
}

export function WhatsAppModalProvider({ children }: { children: ReactNode }) {
  const { settings, addOrder } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<WhatsAppModalOptions>({});

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ name?: string; phone?: string; email?: string }>({});

  const openWhatsAppModal = (opts?: WhatsAppModalOptions) => {
    setOptions(opts || {});
    setErrors({});
    setIsOpen(true);
  };

  const closeWhatsAppModal = () => {
    setIsOpen(false);
  };

  const validate = () => {
    const errs: { name?: string; phone?: string; email?: string } = {};
    if (!name.trim()) errs.name = "Please enter your full name";
    if (!phone.trim() || !/[\d\s+\-()]{7,}/.test(phone.trim())) {
      errs.phone = "Please enter a valid phone number";
    }
    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
    if (!email.trim() || !isEmailValid) {
      errs.email = "Please enter a valid email address";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const prodName = options.productName || "General Enquiry";

    // Save order record to store & database with source = 'whatsapp'
    const newOrder = addOrder({
      customerName: name.trim(),
      contact: `${phone.trim()} · ${email.trim()}`,
      productName: prodName,
      productId: options.productId || null,
      variantId: options.variantId || null,
      variantLabel: options.variantLabel || null,
      message: `WhatsApp order enquiry for ${prodName}${
        options.variantLabel ? ` (${options.variantLabel})` : ""
      }.`,
      source: "whatsapp",
    });

    const waText = `Hello ${settings.storeName}! My name is ${name.trim()} (${email.trim()}). I'd like to order / enquire about "${prodName}"${
      options.variantLabel ? ` (${options.variantLabel})` : ""
    }. Order Reference: ${newOrder.reference}`;

    const targetUrl = whatsappLink(settings.whatsapp, waText);

    toast.success("Redirecting to WhatsApp...", {
      description: `Order Ref: ${newOrder.reference}`,
    });

    setIsOpen(false);
    // Reset form fields
    setName("");
    setPhone("");
    setEmail("");

    // Redirect user to WhatsApp
    window.open(targetUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <WhatsAppModalContext.Provider value={{ openWhatsAppModal, closeWhatsAppModal }}>
      {children}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md overflow-hidden p-0 rounded-2xl border border-stone/30 bg-card shadow-2xl">
          {/* Header Banner — Gray background, white text */}
          <div className="relative bg-gradient-to-br from-gray-500 via-gray-600 to-gray-500 px-6 py-6 border-b border-gray-400/30">
            {/* Subtle gold accent line at top */}
            <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-[#C9A96E] to-transparent opacity-70" />

            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-[#25D366]/20 border border-[#25D366]/50 shadow-md">
                <WhatsAppIcon className="h-6 w-6 text-[#25D366]" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                  Direct WhatsApp Connect
                </span>
                <h3 className="font-display text-xl text-white">Chat with an Optician</h3>
              </div>
            </div>
            <p className="mt-2 text-xs text-white/80 leading-relaxed">
              Please enter your contact details below to start chatting on WhatsApp. Your inquiry will be logged in our system.
            </p>
            {options.productName && (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1 text-xs font-semibold">
                <span className="text-black/60">Product:</span>
                <span className="text-black font-bold">{options.productName}</span>
                {options.variantLabel && (
                  <span className="text-black/60">({options.variantLabel})</span>
                )}
              </div>
            )}
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-card">
            {/* Full Name */}
            <div className="space-y-1.5">
              <Label htmlFor="wa-name" className="text-xs font-bold uppercase tracking-wider text-ink">
                Your Full Name <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-ink-muted" />
                <Input
                  id="wa-name"
                  type="text"
                  placeholder="e.g. Muhammad Ali"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-9 min-h-11 bg-background border-stone/30 focus:border-[#C9A96E]/60"
                />
              </div>
              {errors.name && <p className="text-xs font-medium text-rose-500">{errors.name}</p>}
            </div>

            {/* Phone Number */}
            <div className="space-y-1.5">
              <Label htmlFor="wa-phone" className="text-xs font-bold uppercase tracking-wider text-ink">
                Phone Number <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-ink-muted" />
                <Input
                  id="wa-phone"
                  type="tel"
                  placeholder="e.g. 0300 1234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-9 min-h-11 bg-background border-stone/30 focus:border-[#C9A96E]/60"
                />
              </div>
              {errors.phone && <p className="text-xs font-medium text-rose-500">{errors.phone}</p>}
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <Label htmlFor="wa-email" className="text-xs font-bold uppercase tracking-wider text-ink">
                Email Address <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-ink-muted" />
                <Input
                  id="wa-email"
                  type="email"
                  placeholder="e.g. customer@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 min-h-11 bg-background border-stone/30 focus:border-[#C9A96E]/60"
                />
              </div>
              {errors.email && <p className="text-xs font-medium text-rose-500">{errors.email}</p>}
            </div>

            {/* Submit Button — WhatsApp green (brand color, intentionally kept) */}
            <div className="pt-3">
              <Button
                type="submit"
                className="w-full min-h-12 rounded-xl bg-[#25D366] hover:bg-[#20BA5A] text-white font-bold text-sm shadow-md shadow-[#25D366]/25 transition-all flex items-center justify-center gap-2"
              >
                <WhatsAppIcon className="h-5 w-5 text-white" />
                Continue to WhatsApp
              </Button>
              <p className="mt-2 text-center text-[11px] text-ink-muted">
                Your request will be recorded and logged for order tracking.
              </p>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </WhatsAppModalContext.Provider>
  );
}
