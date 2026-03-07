import { useState, useEffect, type RefObject } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Link2, Check, MessageCircle, Send, Loader2 } from "lucide-react";
import { SiFacebook, SiInstagram } from "react-icons/si";
import { FaXTwitter } from "react-icons/fa6";
import { NextdoorIcon } from "@/components/nextdoor-icon";
import { useAuth } from "@/hooks/use-auth";

const IG_PREFIX = import.meta.env.VITE_INSTAGRAM_PROVIDER === 'native' ? '/api/instagram-native' : '/api/instagram';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
  }, []);
  return isMobile;
}

interface ShareButtonsProps {
  url?: string;
  title: string;
  text: string;
  dogId?: number;
  dogName?: string;
  dogBreed?: string;
  orgId?: number;
  /** Portrait image URL to attach as MMS picture */
  portraitImageUrl?: string;
  /** Organization's website URL */
  orgWebsiteUrl?: string;
  /** Ref to a DOM element to capture as image for Instagram (used on showcase) */
  captureRef?: RefObject<HTMLDivElement | null>;
  /** Caption context for showcase posts (e.g. business name) */
  showcaseName?: string;
  /** URL to send to the pet owner via Text/Copy (customer pawfile URL) */
  ownerUrl?: string;
  /** Business showcase URL for the social media popup option (/business/{slug}) */
  showcaseUrl?: string;
}

type SocialPlatform = 'facebook' | 'x' | 'nextdoor' | 'instagram';

export function ShareButtons({ url, title, text, dogId, dogName, dogBreed, orgId, portraitImageUrl, orgWebsiteUrl, captureRef, showcaseName, ownerUrl, showcaseUrl }: ShareButtonsProps) {
  const { toast } = useToast();
  const { session, isAuthenticated } = useAuth();
  const [copied, setCopied] = useState(false);
  const [smsOpen, setSmsOpen] = useState(false);
  const [igOpen, setIgOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [smsConsent, setSmsConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [igPosting, setIgPosting] = useState(false);
  const [igCaption, setIgCaption] = useState("");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Social media pre-share popup state
  const [socialPopupOpen, setSocialPopupOpen] = useState(false);
  const [socialPlatform, setSocialPlatform] = useState<SocialPlatform | null>(null);
  const [shareChoice, setShareChoice] = useState<'pet' | 'showcase'>('pet');

  const isMobile = useIsMobile();
  const shareUrl = url || window.location.href;
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(text);

  // Text/Copy use ownerUrl (pet owner's clean portal), social media keeps shareUrl (staff page)
  const ownerShareUrl = ownerUrl || shareUrl;
  const smsBody = `${text} Tap the link below to view and order a keepsake! ${ownerShareUrl}`;
  const smsHref = `sms:?body=${encodeURIComponent(smsBody)}`;

  // Show Instagram button when we have a dogId OR a captureRef (showcase)
  const canPostIg = !!dogId || !!captureRef;

  // Check Instagram connection status
  const igStatusUrl = orgId
    ? `${IG_PREFIX}/status?orgId=${orgId}`
    : `${IG_PREFIX}/status`;
  const { data: igStatus } = useQuery<{ connected: boolean; username?: string; orgId?: number }>({
    queryKey: [igStatusUrl],
    enabled: isAuthenticated && canPostIg,
  });

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(ownerShareUrl);
    setCopied(true);
    toast({ title: "Link Copied!", description: "Paste it anywhere to share." });
    setTimeout(() => setCopied(false), 2000);
  };

  const openShare = (href: string) => {
    window.open(href, "_blank", "noopener,noreferrer,width=600,height=500");
  };

  // Open social media popup before sharing
  const handleSocialClick = (platform: SocialPlatform) => {
    setSocialPlatform(platform);
    setShareChoice('pet');
    setSocialPopupOpen(true);
  };

  const executeSocialShare = async () => {
    if (!socialPlatform) return;
    setSocialPopupOpen(false);

    const targetUrl = shareChoice === 'showcase' && showcaseUrl ? showcaseUrl : shareUrl;
    const encodedTarget = encodeURIComponent(targetUrl);
    const encodedShareText = encodeURIComponent(text);

    if (socialPlatform === 'instagram') {
      if (shareChoice === 'showcase' && showcaseUrl) {
        // For showcase on IG, use the captureRef if available
        await handleIgButtonClick(showcaseUrl);
      } else {
        await handleIgButtonClick();
      }
      return;
    }

    const hrefs: Record<SocialPlatform, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedTarget}`,
      x: `https://x.com/intent/tweet?url=${encodedTarget}&text=${encodedShareText}`,
      nextdoor: `https://nextdoor.com/sharekit/?source=pawtraitpros&body=${encodedShareText}%20${encodedTarget}`,
      instagram: '',
    };

    openShare(hrefs[socialPlatform]);
  };

  // Poll for retry delivery status and notify user
  const pollRetryStatus = (messageId: string, phone: string) => {
    let polls = 0;
    const maxPolls = 60; // 30 min at 30s intervals
    const interval = setInterval(async () => {
      polls++;
      if (polls > maxPolls) {
        clearInterval(interval);
        return;
      }
      try {
        const res = await fetch(`/api/sms-status/${messageId}`, {
          headers: { Authorization: `Bearer ${session?.access_token}` },
        });
        const data = await res.json();
        if (data.status === "delivered") {
          clearInterval(interval);
          toast({ title: "Text Delivered!", description: `Your text to ${phone} was delivered.` });
        } else if (data.status === "failed") {
          clearInterval(interval);
          toast({ title: "Text Failed", description: `Could not deliver text to ${phone} after multiple attempts.`, variant: "destructive" });
        }
        // "pending" or "unknown" — keep polling
      } catch {
        // Ignore poll errors, keep trying
      }
    }, 30000);
  };

  const handleSendSms = async () => {
    if (!phoneNumber.trim()) return;
    if (!session?.access_token) {
      toast({ title: "Sign In Required", description: "Please log in to send a text.", variant: "destructive" });
      return;
    }
    setSending(true);
    const targetPhone = phoneNumber;

    // Capture the full branded card (includes org logo)
    let imageToSend: string | undefined;
    if (captureRef?.current) {
      try {
        toast({ title: "Preparing image...", description: "Adding branding to portrait." });
        const { toPng } = await import("html-to-image");
        imageToSend = await toPng(captureRef.current, { quality: 0.95, pixelRatio: 2, backgroundColor: "#ffffff" });
      } catch (err: any) {
        setSending(false);
        toast({ title: "Failed to prepare image", description: err?.message || "Could not capture the portrait card.", variant: "destructive" });
        return;
      }
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000);

      const res = await fetch("/api/send-sms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ to: phoneNumber, message: smsBody, mediaUrl: imageToSend || undefined }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = await res.json();

      if (data.queued) {
        // Message delayed due to carrier rate limits
        toast({ title: "Message Queued", description: "Will deliver in a few minutes to avoid carrier limits." });
        if (data.messageId) pollRetryStatus(data.messageId, targetPhone);
        setSmsOpen(false);
        setPhoneNumber("");
        return;
      }

      if (data.retrying) {
        // Carrier rejected but auto-retry scheduled
        toast({ title: "Text failed — will retry shortly and notify upon delivery.", description: `Retrying delivery to ${targetPhone}.`, variant: "destructive" });
        if (data.messageId) pollRetryStatus(data.messageId, targetPhone);
        setSmsOpen(false);
        setPhoneNumber("");
        return;
      }

      if (!res.ok) throw new Error(data.error || "Failed to send");

      if (data.delivered) {
        toast({ title: "Text Delivered!", description: `Message delivered to ${targetPhone}` });
      } else {
        // Telnyx accepted but delivery not yet confirmed (polling timed out)
        toast({ title: "Text Sent!", description: `Message sent to ${targetPhone}` });
      }
      setSmsOpen(false);
      setPhoneNumber("");
    } catch (err: any) {
      if (err.name === "AbortError") {
        toast({ title: "Sending is taking longer than expected", description: "The message may still be delivered.", variant: "destructive" });
      } else {
        toast({ title: "Failed to Send", description: err.message, variant: "destructive" });
      }
    } finally {
      setSending(false);
    }
  };

  const handleIgButtonClick = async (overrideShareUrl?: string) => {
    if (!captureRef?.current) return;
    // Always capture the full card (pawfile or showcase) — it has all the info
    try {
      toast({ title: "Capturing image...", description: "Please wait." });
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(captureRef.current, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });
      setCapturedImage(dataUrl);
      const targetShareUrl = overrideShareUrl || ownerUrl || shareUrl;
      const defaultCaption = dogId
        ? `Meet ${dogName || 'this adorable pet'}! ${dogBreed ? `A beautiful ${dogBreed}. ` : ''}Check out their portrait at ${targetShareUrl}\n\n#pawtraitpros #petportrait #petprofessional #petgrooming`
        : `Check out the beautiful pet portraits at ${showcaseName || 'our business'}! Visit ${targetShareUrl} to learn more.\n\n#pawtraitpros #petportrait #petprofessional #petgrooming`;
      setIgCaption(defaultCaption);
      setIgOpen(true);
    } catch (err) {
      console.error("Failed to capture image:", err);
      toast({ title: "Capture Failed", description: "Could not capture the image.", variant: "destructive" });
    }
  };

  const handlePostToInstagram = async () => {
    setIgPosting(true);
    try {
      if (!capturedImage || !orgId) {
        throw new Error("Nothing to post");
      }
      // Always send the captured image — it's the full pawfile/showcase card
      const body = { orgId, image: capturedImage, caption: igCaption };
      const res = await fetch(`${IG_PREFIX}/post`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to post");
      toast({ title: "Posted to Instagram!", description: capturedImage ? "Showcase posted to Instagram!" : `${dogName || 'Pet'}'s portrait is now on Instagram.` });
      setIgOpen(false);
      setCapturedImage(null);
    } catch (err: any) {
      toast({ title: "Instagram Post Failed", description: err.message, variant: "destructive" });
    } finally {
      setIgPosting(false);
    }
  };

  const platformLabel: Record<SocialPlatform, string> = {
    facebook: 'Facebook',
    x: 'X',
    nextdoor: 'Nextdoor',
    instagram: 'Instagram',
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="outline"
              onClick={() => handleSocialClick('facebook')}
              data-testid="button-share-facebook"
            >
              <SiFacebook className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Share on Facebook</TooltipContent>
        </Tooltip>
        {igStatus?.connected && canPostIg ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="outline"
                onClick={() => handleSocialClick('instagram')}
                data-testid="button-share-instagram"
              >
                <SiInstagram className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Post to Instagram{igStatus.username ? ` @${igStatus.username}` : ''}</TooltipContent>
          </Tooltip>
        ) : null}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="outline"
              onClick={() => handleSocialClick('x')}
              data-testid="button-share-x"
            >
              <FaXTwitter className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Share on X</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="outline"
              onClick={() => handleSocialClick('nextdoor')}
              data-testid="button-share-nextdoor"
            >
              <NextdoorIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Share on Nextdoor</TooltipContent>
        </Tooltip>
        {isMobile ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <a href={smsHref}>
                <Button
                  size="icon"
                  variant="outline"
                  data-testid="button-share-sms"
                >
                  <MessageCircle className="h-4 w-4" />
                </Button>
              </a>
            </TooltipTrigger>
            <TooltipContent>Send via Text</TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="outline"
                onClick={() => setSmsOpen(true)}
                data-testid="button-share-sms"
              >
                <MessageCircle className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Send via Text</TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="outline"
              onClick={handleCopyLink}
              data-testid="button-copy-link"
            >
              {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{copied ? "Copied!" : "Copy Link"}</TooltipContent>
        </Tooltip>
      </div>

      {/* Social media pre-share popup */}
      <Dialog open={socialPopupOpen} onOpenChange={setSocialPopupOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Share on {socialPlatform ? platformLabel[socialPlatform] : ''}</DialogTitle>
            <DialogDescription>What would you like to share?</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="radio"
                name="shareChoice"
                value="pet"
                checked={shareChoice === 'pet'}
                onChange={() => setShareChoice('pet')}
                className="mt-0.5"
              />
              <div>
                <p className="text-sm font-medium">{dogName ? `${dogName}'s portrait` : 'This pet\'s portrait'}</p>
                <p className="text-xs text-muted-foreground">Share this individual pet's pawfile</p>
              </div>
            </label>
            {showcaseUrl && (
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="radio"
                  name="shareChoice"
                  value="showcase"
                  checked={shareChoice === 'showcase'}
                  onChange={() => setShareChoice('showcase')}
                  className="mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium">Full client showcase</p>
                  <p className="text-xs text-muted-foreground">Share your showcase of all current clients</p>
                </div>
              </label>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setSocialPopupOpen(false)}>Never mind</Button>
            <Button onClick={executeSocialShare}>Share</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={smsOpen} onOpenChange={(open) => { setSmsOpen(open); if (!open) { setSmsConsent(false); setPhoneNumber(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send via Text</DialogTitle>
            <DialogDescription>Enter a phone number to text this link to.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input
              placeholder="(555) 123-4567"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && phoneNumber.trim() && handleSendSms()}
              disabled={sending}
              className="flex-1"
            />
            <Button onClick={handleSendSms} disabled={sending || !phoneNumber.trim()}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              By providing your phone number, you agree to receive SMS notifications from Pawtrait Pros. Message frequency may vary. Standard Message and Data Rates may apply. Reply STOP to opt out. Reply HELP for help. We will not share mobile information with third parties for promotional or marketing purposes.
            </p>
            <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={smsConsent}
                onChange={(e) => setSmsConsent(e.target.checked)}
                className="mt-0.5 rounded border-gray-300"
              />
              <span>I agree to receive this text message.</span>
            </label>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={igOpen} onOpenChange={setIgOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SiInstagram className="h-5 w-5" />
              Post to Instagram
            </DialogTitle>
            <DialogDescription>
              {igStatus?.username ? `Posting to @${igStatus.username}` : 'Post this portrait to your Instagram'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {capturedImage && (
              <div className="rounded-md overflow-hidden border max-h-48">
                <img src={capturedImage} alt="Showcase preview" className="w-full object-contain" />
              </div>
            )}
            <Textarea
              value={igCaption}
              onChange={(e) => setIgCaption(e.target.value)}
              rows={5}
              placeholder="Write a caption..."
              disabled={igPosting}
              className="resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIgOpen(false)} disabled={igPosting}>
                Cancel
              </Button>
              <Button onClick={handlePostToInstagram} disabled={igPosting}>
                {igPosting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <SiInstagram className="h-4 w-4 mr-2" />}
                Post
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
