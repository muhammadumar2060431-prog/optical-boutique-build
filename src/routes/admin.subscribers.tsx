import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle2,
  Copy,
  Download,
  Eye,
  History,
  Mail,
  Plus,
  Search,
  Send,
  Sparkles,
  Tag,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { ImageUpload } from "@/components/admin/ImageUpload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/lib/store";
import type { EmailCampaign } from "@/lib/types";

export const Route = createFileRoute("/admin/subscribers")({
  component: AdminSubscribers,
});

export function AdminSubscribers() {
  const { subscribers, campaigns, deleteSubscriber, sendCampaign, settings } =
    useStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("subscribers");

  // Campaign Composer State
  const [composerOpen, setComposerOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<EmailCampaign | null>(
    null,
  );

  const [campaignDraft, setCampaignDraft] = useState<{
    subject: string;
    headline: string;
    bodyText: string;
    bannerImage: string | null;
    promoCode: string;
    ctaText: string;
    ctaLink: string;
  }>({
    subject: "✨ Special Offer: 20% Off Your Next Eyewear",
    headline: "Exclusive VIP Discount For You",
    bodyText:
      "We're excited to introduce our new optical collection. Use the promo code below at checkout to enjoy an exclusive 20% discount on all frames and prescription lenses.",
    bannerImage: null,
    promoCode: "OPTIQUE20",
    ctaText: "Shop The Collection",
    ctaLink: "/glasses",
  });

  const filteredSubscribers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return subscribers;
    return subscribers.filter((s) => s.email.toLowerCase().includes(q));
  }, [subscribers, searchQuery]);

  const handleCopyAllEmails = () => {
    if (!subscribers.length) {
      toast.error("No subscribers to copy.");
      return;
    }
    const allEmails = subscribers.map((s) => s.email).join(", ");
    navigator.clipboard.writeText(allEmails);
    toast.success(`Copied ${subscribers.length} subscriber emails to clipboard!`);
  };

  const handleExportCSV = () => {
    if (!subscribers.length) {
      toast.error("No subscribers to export.");
      return;
    }
    const header = "Email,Date Subscribed,Status\n";
    const rows = subscribers
      .map(
        (s) =>
          `"${s.email}","${new Date(s.createdAt).toLocaleDateString()}","${s.status}"`,
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `subscribers_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Subscribers list exported as CSV.");
  };

  const handleSendCampaign = () => {
    if (!campaignDraft.subject.trim()) {
      toast.error("Please enter an email subject line.");
      return;
    }
    if (!campaignDraft.headline.trim()) {
      toast.error("Please enter a campaign headline.");
      return;
    }
    if (!campaignDraft.bodyText.trim()) {
      toast.error("Please enter message content.");
      return;
    }
    if (subscribers.length === 0) {
      toast.error("You need at least 1 subscriber to broadcast an offer.");
      return;
    }

    sendCampaign({
      subject: campaignDraft.subject.trim(),
      headline: campaignDraft.headline.trim(),
      bodyText: campaignDraft.bodyText.trim(),
      bannerImage: campaignDraft.bannerImage,
      promoCode: campaignDraft.promoCode.trim() || undefined,
      ctaText: campaignDraft.ctaText.trim() || "Shop Now",
      ctaLink: campaignDraft.ctaLink.trim() || "/glasses",
      recipientCount: subscribers.length,
    });

    setComposerOpen(false);
    setActiveTab("campaigns");
    toast.success(
      `🎉 Offer successfully broadcasted to ${subscribers.length} subscribers!`,
    );
  };

  // Generate Email HTML
  const generateEmailHtml = (data: typeof campaignDraft) => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${data.subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#0E0E10;font-family:Arial,sans-serif;color:#F6F4EF;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#0E0E10;padding:30px 15px;">
    <tr>
      <td align="center">
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color:#161619;border-radius:16px;border:1px solid #2C2C30;overflow:hidden;">
          <!-- Header Logo -->
          <tr>
            <td align="center" style="padding:28px 20px;border-bottom:1px solid #2C2C30;background-color:#101012;">
              <h1 style="margin:0;font-size:24px;letter-spacing:0.25em;color:#D4AF37;text-transform:uppercase;">${settings.storeName || "OPTIQUE"}</h1>
              <p style="margin:4px 0 0 0;font-size:11px;color:#A0A0A5;letter-spacing:0.15em;text-transform:uppercase;">Luxury Eyewear & Optics</p>
            </td>
          </tr>

          ${
            data.bannerImage
              ? `<!-- Campaign Banner Image -->
          <tr>
            <td>
              <img src="${data.bannerImage}" alt="Campaign Banner" width="600" style="width:100%;max-height:300px;object-fit:cover;display:block;" />
            </td>
          </tr>`
              : ""
          }

          <!-- Body Content -->
          <tr>
            <td style="padding:36px 30px;text-align:center;">
              <h2 style="margin:0 0 16px 0;font-size:22px;color:#FFFFFF;line-height:1.3;">${data.headline}</h2>
              <p style="margin:0 0 24px 0;font-size:14px;line-height:1.6;color:#D0D0D5;">${data.bodyText.replace(/\n/g, "<br>")}</p>

              ${
                data.promoCode
                  ? `<div style="background-color:#202025;border:1px dashed #D4AF37;border-radius:12px;padding:16px;margin:0 auto 28px auto;max-width:320px;">
                <p style="margin:0 0 6px 0;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#A0A0A5;">Use Promo Code at Checkout</p>
                <div style="font-size:20px;font-weight:bold;letter-spacing:0.2em;color:#D4AF37;">${data.promoCode}</div>
              </div>`
                  : ""
              }

              <!-- CTA Button -->
              <a href="https://${window.location.host}${data.ctaLink || "/glasses"}" style="display:inline-block;background-color:#D4AF37;color:#0E0E10;font-weight:bold;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;text-decoration:none;padding:14px 32px;border-radius:50px;">
                ${data.ctaText || "Claim Offer Now"} &rarr;
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 30px;background-color:#101012;border-top:1px solid #2C2C30;text-align:center;font-size:12px;color:#7A7A80;">
              <p style="margin:0 0 8px 0;">${settings.address || "Clifton Block 4, Karachi"}</p>
              <p style="margin:0;">You received this email because you subscribed to updates from ${settings.storeName || "OPTIQUE"}.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  };

  const handleCopyEmailHtml = () => {
    const html = generateEmailHtml(campaignDraft);
    navigator.clipboard.writeText(html);
    toast.success("Ready-to-send HTML email copied to clipboard!");
  };

  const handleOpenEmailClient = () => {
    if (!subscribers.length) {
      toast.error("No subscribers found.");
      return;
    }
    const bccList = subscribers.map((s) => s.email).join(",");
    const subject = encodeURIComponent(campaignDraft.subject);
    const body = encodeURIComponent(
      `${campaignDraft.headline}\n\n${campaignDraft.bodyText}\n\nPromo Code: ${campaignDraft.promoCode}\n\nShop Online: https://${window.location.host}${campaignDraft.ctaLink}`,
    );
    window.open(`mailto:?bcc=${bccList}&subject=${subject}&body=${body}`, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="eyebrow text-gold font-bold tracking-[0.18em] uppercase text-xs">
            Audience & Marketing
          </p>
          <h1 className="mt-1 font-display text-3xl text-foreground font-semibold">
            Subscribers & Email Offers
          </h1>
          <p className="text-xs text-ink-muted mt-1">
            Emails submitted via the website subscription bar. Compose and broadcast promotional offers anytime.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="rounded-full text-xs"
            onClick={handleCopyAllEmails}
          >
            <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy Emails ({subscribers.length})
          </Button>

          <Button
            className="rounded-full font-semibold text-xs"
            onClick={() => setComposerOpen(true)}
          >
            <Send className="mr-1.5 h-3.5 w-3.5" /> Send Offer / Campaign
          </Button>
        </div>
      </header>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card border border-stone">
          <TabsTrigger value="subscribers" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>Subscribers ({subscribers.length})</span>
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span>Campaign History ({campaigns.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: SUBSCRIBERS LIST ── */}
        <TabsContent value="subscribers" className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card p-4 rounded-2xl border border-stone">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
              <Input
                placeholder="Search subscriber emails..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 text-xs rounded-xl"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl text-xs"
                onClick={handleExportCSV}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
              </Button>
            </div>
          </div>

          {subscribers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone bg-card px-6 py-16 text-center text-sm text-ink-muted">
              <Mail className="h-10 w-10 text-gold mx-auto mb-3 opacity-60" />
              <p className="font-semibold text-foreground">No subscribers collected yet</p>
              <p className="text-xs text-ink-muted mt-1">
                When visitors submit their email in the website footer bar, they will appear here.
              </p>
            </div>
          ) : filteredSubscribers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone bg-card px-6 py-12 text-center text-xs text-ink-muted">
              No subscribers found matching "{searchQuery}".
            </div>
          ) : (
            <div className="rounded-2xl border border-stone bg-card overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="border-b border-stone bg-background/50 text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3">Subscriber Email</th>
                      <th className="px-5 py-3">Date Subscribed</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone/40">
                    {filteredSubscribers.map((s, idx) => (
                      <tr
                        key={s.id}
                        className="hover:bg-background/40 transition-colors"
                      >
                        <td className="px-5 py-3.5 font-medium text-foreground">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold/15 text-[10px] font-bold text-gold shrink-0">
                              {idx + 1}
                            </span>
                            <span>{s.email}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-ink-muted">
                          {new Date(s.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge
                            variant="secondary"
                            className="bg-emerald-500/10 text-emerald-600 border-0 text-[10px] font-semibold"
                          >
                            <CheckCircle2 className="mr-1 h-3 w-3" /> Active
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-ink-muted hover:text-foreground"
                              title="Copy Email"
                              onClick={() => {
                                navigator.clipboard.writeText(s.email);
                                toast.success(`Copied ${s.email}`);
                              }}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10"
                              title="Delete Subscriber"
                              onClick={() => {
                                if (confirm(`Remove ${s.email} from subscribers?`)) {
                                  deleteSubscriber(s.id);
                                  toast.success("Subscriber removed.");
                                }
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── TAB 2: CAMPAIGN HISTORY ── */}
        <TabsContent value="campaigns" className="space-y-4 pt-2">
          {campaigns.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone bg-card px-6 py-16 text-center text-sm text-ink-muted">
              <Send className="h-10 w-10 text-gold mx-auto mb-3 opacity-60" />
              <p className="font-semibold text-foreground">No email offers sent yet</p>
              <p className="text-xs text-ink-muted mt-1">
                Broadcast your first discount offer or new collection announcement to all subscribers.
              </p>
              <Button
                size="sm"
                className="mt-4 rounded-full"
                onClick={() => setComposerOpen(true)}
              >
                <Plus className="mr-1.5 h-4 w-4" /> Create First Campaign
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map((cmp) => (
                <div
                  key={cmp.id}
                  className="rounded-2xl border border-stone bg-card p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs hover:border-gold/50 transition-all"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground text-sm sm:text-base">
                        {cmp.subject}
                      </span>
                      {cmp.promoCode && (
                        <span className="inline-flex items-center gap-1 bg-gold/15 text-gold border border-gold/40 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          <Tag className="h-2.5 w-2.5" /> {cmp.promoCode}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ink-muted line-clamp-1">{cmp.headline} — {cmp.bodyText}</p>
                    <div className="flex items-center gap-3 pt-1 text-[11px] text-ink-muted">
                      <span>
                        Sent: {new Date(cmp.sentAt).toLocaleString("en-US", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                      <span>•</span>
                      <span className="text-emerald-600 font-medium">
                        Sent to {cmp.recipientCount} subscribers
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full text-xs"
                      onClick={() => {
                        setSelectedCampaign(cmp);
                        setPreviewOpen(true);
                      }}
                    >
                      <Eye className="mr-1.5 h-3.5 w-3.5" /> View Email
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── COMPOSE EMAIL OFFER DIALOG ── */}
      <Dialog open={composerOpen} onOpenChange={setComposerOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-gold" />
              <span>Broadcast Offer to Subscribers</span>
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
            {/* Left: Input Form */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="camp-subject">Email Subject Line *</Label>
                <Input
                  id="camp-subject"
                  value={campaignDraft.subject}
                  onChange={(e) =>
                    setCampaignDraft({ ...campaignDraft, subject: e.target.value })
                  }
                  placeholder="e.g. ✨ 25% Off New Season Acetate Frames"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="camp-headline">Offer Headline *</Label>
                <Input
                  id="camp-headline"
                  value={campaignDraft.headline}
                  onChange={(e) =>
                    setCampaignDraft({ ...campaignDraft, headline: e.target.value })
                  }
                  placeholder="e.g. VIP Member Discount"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="camp-body">Message Content *</Label>
                <Textarea
                  id="camp-body"
                  rows={4}
                  value={campaignDraft.bodyText}
                  onChange={(e) =>
                    setCampaignDraft({ ...campaignDraft, bodyText: e.target.value })
                  }
                  placeholder="Describe your special offer or announcement..."
                />
              </div>

              {/* Banner Image Upload */}
              <div className="space-y-1.5">
                <ImageUpload
                  label="Offer Banner Image (Optional)"
                  optional
                  value={campaignDraft.bannerImage}
                  onChange={(img) =>
                    setCampaignDraft({ ...campaignDraft, bannerImage: img })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="camp-promo">Promo Code (Optional)</Label>
                  <Input
                    id="camp-promo"
                    value={campaignDraft.promoCode}
                    onChange={(e) =>
                      setCampaignDraft({ ...campaignDraft, promoCode: e.target.value })
                    }
                    placeholder="e.g. OPTIQUE20"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="camp-cta">Button Text</Label>
                  <Input
                    id="camp-cta"
                    value={campaignDraft.ctaText}
                    onChange={(e) =>
                      setCampaignDraft({ ...campaignDraft, ctaText: e.target.value })
                    }
                    placeholder="e.g. Shop The Offer"
                  />
                </div>
              </div>
            </div>

            {/* Right: Live Interactive Email Template Preview */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase font-bold tracking-wider text-ink-muted">
                  Live Email Template Preview
                </Label>
                <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  Will send to {subscribers.length} recipients
                </span>
              </div>

              {/* Mock Luxury Email Container */}
              <div className="rounded-2xl border border-zinc-800 bg-[#0E0E10] text-[#F6F4EF] p-4 text-center overflow-hidden shadow-inner text-xs space-y-4">
                {/* Brand Logo Header */}
                <div className="border-b border-zinc-800 pb-3">
                  <p className="font-display font-bold tracking-[0.25em] text-gold uppercase text-base">
                    {settings.storeName || "OPTIQUE"}
                  </p>
                  <p className="text-[9px] uppercase tracking-wider text-zinc-400">
                    Luxury Eyewear & Optics
                  </p>
                </div>

                {/* Banner Image Preview if uploaded */}
                {campaignDraft.bannerImage && (
                  <div className="rounded-xl overflow-hidden border border-zinc-800 max-h-40">
                    <img
                      src={campaignDraft.bannerImage}
                      alt="Banner Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Offer Headline & Message */}
                <div className="space-y-2 px-2">
                  <h4 className="font-semibold text-white text-sm">
                    {campaignDraft.headline || "Your Headline Here"}
                  </h4>
                  <p className="text-zinc-300 text-[11px] leading-relaxed">
                    {campaignDraft.bodyText || "Your offer message will appear here."}
                  </p>

                  {/* Promo Code Box */}
                  {campaignDraft.promoCode && (
                    <div className="bg-zinc-900 border border-dashed border-gold/60 rounded-lg py-2 px-3 my-2 max-w-xs mx-auto">
                      <p className="text-[9px] text-zinc-400 uppercase tracking-widest">
                        Promo Code
                      </p>
                      <p className="text-gold font-bold tracking-wider text-sm">
                        {campaignDraft.promoCode}
                      </p>
                    </div>
                  )}

                  {/* CTA Button */}
                  <div className="pt-2">
                    <span className="inline-block bg-gold text-jet font-bold text-[11px] tracking-wider uppercase px-5 py-2 rounded-full shadow-xs">
                      {campaignDraft.ctaText || "Claim Offer Now"} →
                    </span>
                  </div>
                </div>

                {/* Email Footer */}
                <div className="border-t border-zinc-800/80 pt-3 text-[9px] text-zinc-500">
                  <p>{settings.address || "Clifton Block 4, Karachi"}</p>
                  <p className="mt-0.5">
                    Unsubscribe • Sent to all subscribed customers
                  </p>
                </div>
              </div>

              {/* Utility Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs flex-1"
                  onClick={handleCopyEmailHtml}
                >
                  <Copy className="mr-1 h-3 w-3" /> Copy HTML
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs flex-1"
                  onClick={handleOpenEmailClient}
                >
                  <Mail className="mr-1 h-3 w-3" /> Mail Client
                </Button>
              </div>
            </div>
          </div>

          {/* Bottom Broadcast Button */}
          <div className="pt-4 border-t border-stone flex items-center justify-between">
            <Button
              variant="ghost"
              className="rounded-full text-xs"
              onClick={() => setComposerOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="rounded-full font-semibold text-xs px-6"
              onClick={handleSendCampaign}
            >
              <Send className="mr-2 h-4 w-4" /> Send Offer to {subscribers.length} Subscribers
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── CAMPAIGN DETAILS / PREVIEW DIALOG ── */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          {selectedCampaign && (
            <div className="space-y-4 pt-2">
              <DialogHeader>
                <DialogTitle className="font-display text-xl text-foreground">
                  {selectedCampaign.subject}
                </DialogTitle>
                <p className="text-xs text-ink-muted">
                  Broadcasted on {new Date(selectedCampaign.sentAt).toLocaleString()} to {selectedCampaign.recipientCount} subscribers
                </p>
              </DialogHeader>

              {/* Render Preview */}
              <div className="rounded-2xl border border-zinc-800 bg-[#0E0E10] text-[#F6F4EF] p-5 text-center space-y-4 text-xs">
                <p className="font-display font-bold tracking-[0.25em] text-gold uppercase text-base">
                  {settings.storeName || "OPTIQUE"}
                </p>

                {selectedCampaign.bannerImage && (
                  <img
                    src={selectedCampaign.bannerImage}
                    alt=""
                    className="w-full max-h-48 object-cover rounded-xl"
                  />
                )}

                <h3 className="font-semibold text-white text-base">
                  {selectedCampaign.headline}
                </h3>
                <p className="text-zinc-300 leading-relaxed text-xs">
                  {selectedCampaign.bodyText}
                </p>

                {selectedCampaign.promoCode && (
                  <div className="bg-zinc-900 border border-dashed border-gold/60 rounded-lg py-2 px-4 max-w-xs mx-auto">
                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest">
                      Promo Code
                    </p>
                    <p className="text-gold font-bold text-sm">
                      {selectedCampaign.promoCode}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
