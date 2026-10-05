import { useState } from "react";
import { ArrowRight, CheckCircle2, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

import { useStore } from "@/lib/store";
import { trackMetaEvent } from "@/lib/meta-events";
import { Reveal } from "./Reveal";

export function NewsletterSection() {
  const { addSubscriber } = useStore();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email address.");
      return;
    }

    setIsSubmitting(true);
    const submittedEmail = email.trim();
    const res = await addSubscriber(submittedEmail);
    setIsSubmitting(false);
    if (res.ok) {
      trackMetaEvent({
        eventName: "CompleteRegistration",
        userData: { email: submittedEmail },
        customData: { contentName: "Email newsletter" },
      });
      setIsSuccess(true);
      setEmail("");
      toast.success(res.message);
    } else {
      toast.error(res.message);
    }
  };

  return (
    <section className="relative max-w-full overflow-x-clip border-y border-[#5A5A5A] bg-[#666666] py-12 text-white sm:py-20">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
        <Reveal>
          {/* Main Title matching user reference image */}
          <h2 className="font-display text-3xl font-semibold tracking-normal text-white sm:text-4xl lg:text-5xl">
            Subscribe to our emails
          </h2>

          {/* Subtitle matching user reference image */}
          <p className="mt-3 text-sm sm:text-base text-white/90 max-w-xl mx-auto font-normal">
            Be the first to know about new collections and exclusive offers.
          </p>
        </Reveal>

        <Reveal delay={120}>
          <div className="mx-auto mt-7 w-full max-w-lg">
            {isSuccess ? (
              <div className="flex min-w-0 items-center justify-center gap-2.5 rounded-full bg-white px-4 py-4 text-sm font-semibold text-black shadow-xl animate-in fade-in zoom-in duration-300 sm:px-6">
                <CheckCircle2 className="h-5 w-5 text-black shrink-0" />
                <span>You're subscribed! Check your inbox for exclusive drops.</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="relative group">
                <div className="relative flex min-w-0 items-center rounded-full border border-white bg-white p-1.5 shadow-2xl shadow-black/30 transition-all duration-300 focus-within:ring-4 focus-within:ring-black/20 hover:shadow-black/40 sm:p-2">
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
                    className="min-w-0 flex-1 bg-transparent px-2 py-2.5 text-sm font-semibold text-black placeholder:text-zinc-400 placeholder:font-normal focus:outline-none disabled:opacity-50 sm:px-3 sm:py-3 sm:text-base"
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
