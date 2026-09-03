import { useState } from "react";
import { ArrowRight, CheckCircle2, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

import { useStore } from "@/lib/store";
import { Reveal } from "./Reveal";

export function NewsletterSection() {
  const { addSubscriber } = useStore();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email address.");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const res = addSubscriber(email);
      setIsSubmitting(false);
      if (res.ok) {
        setIsSuccess(true);
        setEmail("");
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    }, 400);
  };

  return (
    <section className="bg-[#666666] py-16 sm:py-20 text-white relative overflow-hidden border-t border-b border-[#5A5A5A]">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center">
        <Reveal>
          {/* Main Title matching user reference image */}
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-white">
            Subscribe to our emails
          </h2>

          {/* Subtitle matching user reference image */}
          <p className="mt-3 text-sm sm:text-base text-white/90 max-w-xl mx-auto font-normal">
            Be the first to know about new collections and exclusive offers.
          </p>
        </Reveal>

        <Reveal delay={120}>
          <div className="mt-8 max-w-lg mx-auto">
            {isSuccess ? (
              <div className="flex items-center justify-center gap-2.5 py-4 px-6 rounded-full bg-white text-black font-semibold text-sm shadow-xl animate-in fade-in zoom-in duration-300">
                <CheckCircle2 className="h-5 w-5 text-black shrink-0" />
                <span>You're subscribed! Check your inbox for exclusive drops.</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="relative group">
                <div className="relative flex items-center bg-white rounded-full p-1.5 sm:p-2 shadow-2xl shadow-black/30 border border-white transition-all duration-300 focus-within:ring-4 focus-within:ring-black/20 hover:shadow-black/40">
                  {/* Mail icon */}
                  <div className="pl-3.5 sm:pl-4 text-zinc-400 flex items-center justify-center">
                    <Mail className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>

                  {/* White background input with black text */}
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    required
                    disabled={isSubmitting}
                    className="w-full bg-transparent px-3 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-black placeholder:text-zinc-400 placeholder:font-normal focus:outline-none disabled:opacity-50"
                  />

                  {/* Black circular submit button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    aria-label="Subscribe to emails"
                    className="h-9 w-9 sm:h-11 sm:w-11 rounded-full bg-black text-white hover:bg-zinc-800 shrink-0 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer shadow-md"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                    ) : (
                      <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
