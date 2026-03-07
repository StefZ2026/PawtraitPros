import { Card, CardContent } from "@/components/ui/card";
import { CheckSquare, MessageSquare, ShieldCheck } from "lucide-react";

export default function SmsOptIn() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-3xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif font-bold mb-2">SMS Opt-In Policy</h1>
          <p className="text-muted-foreground">How Pawtrait Pros handles text messaging</p>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3 mb-4">
              <MessageSquare className="h-6 w-6 text-primary mt-0.5 shrink-0" />
              <div>
                <h2 className="font-semibold text-lg mb-2">How It Works</h2>
                <p className="text-muted-foreground">
                  Pawtrait Pros allows pet professionals to share pet portraits via text message.
                  When viewing a pet portrait, users can click "Send via Text" to share the portrait
                  link with a phone number of their choice.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3 mb-4">
              <CheckSquare className="h-6 w-6 text-primary mt-0.5 shrink-0" />
              <div>
                <h2 className="font-semibold text-lg mb-2">Opt-In Process</h2>
                <p className="text-muted-foreground mb-4">
                  Before any SMS can be sent, users must complete the following steps in our "Send via Text" dialog:
                </p>

                <div className="bg-muted/50 rounded-lg p-5 border">
                  <p className="font-medium mb-3">Send via Text</p>
                  <p className="text-sm text-muted-foreground mb-3">Enter a phone number to text this link to.</p>
                  <div className="bg-background border rounded-md px-3 py-2 mb-4 text-sm text-muted-foreground">
                    (555) 123-4567
                  </div>
                  <div className="space-y-3 mb-4">
                    <label className="flex items-start gap-2 text-sm text-muted-foreground">
                      <input type="checkbox" disabled className="mt-0.5 rounded border-gray-300" />
                      <span>By providing your phone number and clicking the checkbox below you agree to receive SMS notifications from Pawtrait Pros. Message frequency may vary. Standard Message and Data Rates may apply. Reply STOP to opt out. Reply HELP for help. We will not share mobile information with third parties for promotional or marketing purposes.</span>
                    </label>
                    <label className="flex items-start gap-2 text-sm text-muted-foreground">
                      <input type="checkbox" disabled className="mt-0.5 rounded border-gray-300" />
                      <span>I have read and agree to the Pawtrait Pros <a href="/privacy" className="underline text-primary">Privacy Policy</a>.</span>
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground italic">
                    The Send button is disabled until both checkboxes are checked and a phone number is entered.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3 mb-4">
              <ShieldCheck className="h-6 w-6 text-primary mt-0.5 shrink-0" />
              <div>
                <h2 className="font-semibold text-lg mb-2">Your Rights</h2>
                <ul className="space-y-2 text-muted-foreground">
                  <li><strong>Opt-out:</strong> Reply STOP to any message to stop receiving texts from this number.</li>
                  <li><strong>Help:</strong> Reply HELP for support information, or email stefanie@pawtraitpros.com.</li>
                  <li><strong>Messaging:</strong> Message frequency may vary. SMS is sent when a user explicitly initiates a share action or to deliver service notifications.</li>
                  <li><strong>Data rates:</strong> Standard message and data rates may apply.</li>
                  <li><strong>No sharing:</strong> We will not share mobile information with third parties for promotional or marketing purposes.</li>
                  <li><strong>Data:</strong> Phone numbers are not stored after delivery.</li>
                  <li><strong>Privacy:</strong> See our full <a href="/privacy" className="underline text-primary">Privacy Policy</a> (Section 7: SMS/Text Messaging).</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Pawtrait Pros LLC &bull; <a href="mailto:stefanie@pawtraitpros.com" className="underline">stefanie@pawtraitpros.com</a> &bull; <a href="/terms" className="underline">Terms</a> &bull; <a href="/privacy" className="underline">Privacy</a>
        </p>
      </div>
    </div>
  );
}
