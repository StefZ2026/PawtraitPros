import { Link } from "wouter";
import { Dog, Cat } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Link href="/" className="flex items-center gap-1.5 font-serif text-2xl font-bold text-primary">
            <span className="flex items-center gap-0.5"><Dog className="h-6 w-6" /><Cat className="h-6 w-6" /></span>
            Pawtrait Pros
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-24 pb-16 max-w-3xl">
        <h1 className="text-3xl font-serif font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: February 17, 2026</p>

        <div className="prose prose-stone dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-serif font-semibold mb-3">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Pawtrait Pros ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services at pawtraitpros.com (the "Service"). This policy applies to all users worldwide, including those in the European Economic Area (EEA), United Kingdom (UK), and California. By using the Service, you agree to the practices described in this policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-semibold mb-3">2. Data Controller</h2>
            <p className="text-muted-foreground leading-relaxed">
              Pawtrait Pros is the data controller responsible for your personal data. If you have questions about how your data is processed, or wish to exercise your rights, contact us at{" "}
              <a href="mailto:support@pawtraitpros.com" className="text-primary hover:underline">support@pawtraitpros.com</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-semibold mb-3">3. Legal Basis for Processing (GDPR)</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              For users in the EEA and UK, we process your personal data based on the following legal grounds:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Contract performance:</strong> Processing necessary to provide the Service you signed up for — account management, portrait generation, subscription billing, and pet profile management</li>
              <li><strong>Legitimate interests:</strong> Security monitoring, fraud prevention, service improvement, and analytics — where our interests do not override your fundamental rights</li>
              <li><strong>Consent:</strong> Where you explicitly opt in to features such as connecting third-party social media accounts (e.g., Instagram) or receiving optional communications</li>
              <li><strong>Legal obligation:</strong> Where we are required by law to process or retain certain data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-serif font-semibold mb-3">4. Information We Collect</h2>
            <h3 className="text-lg font-semibold mb-2">Account Information</h3>
            <p className="text-muted-foreground leading-relaxed mb-3">
              When you create an account, we collect your email address and password. Accounts are managed through Supabase, a secure authentication provider. We do not store your password directly — it is handled by Supabase's authentication infrastructure.
            </p>
            <h3 className="text-lg font-semibold mb-2">Organization Information</h3>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Business users provide information including organization name, description, location, website, logo, and contact details. This information is displayed publicly on your business showcase page to help clients find and connect with your business.
            </p>
            <h3 className="text-lg font-semibold mb-2">Pet Information</h3>
            <p className="text-muted-foreground leading-relaxed mb-3">
              You may upload pet photos, names, breeds, ages, species, descriptions, and other details about animals in your care. Pet photos are used to generate AI-powered artistic portraits.
            </p>
            <h3 className="text-lg font-semibold mb-2">Payment Information</h3>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Payment processing is handled by Stripe. We do not store your credit card numbers or bank account details. Stripe collects and processes payment information in accordance with their own{" "}
              <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">privacy policy</a>.
              We receive only transaction confirmation details (such as subscription status and plan type).
            </p>
            <h3 className="text-lg font-semibold mb-2">Social Media Integrations</h3>
            <p className="text-muted-foreground leading-relaxed mb-3">
              If you connect your Instagram account, we store an access token, your Instagram user ID, and username. This data is used solely to post pet portraits to your Instagram account on your behalf. You can disconnect your Instagram at any time from your Settings page, which immediately deletes all stored Instagram credentials.
            </p>
            <h3 className="text-lg font-semibold mb-2">Automatically Collected Information</h3>
            <p className="text-muted-foreground leading-relaxed">
              We may collect standard web server logs including IP addresses, browser type, referring pages, and timestamps. This data is used for security monitoring and service improvement. We do not use tracking cookies for advertising purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-semibold mb-3">5. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>To provide and maintain the Service, including generating AI portraits of your pets</li>
              <li>To create and manage your account and organization profile</li>
              <li>To process subscription payments through Stripe</li>
              <li>To display your business and pet portraits on public showcase pages</li>
              <li>To enable sharing of pet profiles via social media (including Instagram posting), text messaging, and link sharing</li>
              <li>To send transactional communications related to your account</li>
              <li>To monitor and improve the security and performance of the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-serif font-semibold mb-3">6. AI Portrait Generation</h2>
            <p className="text-muted-foreground leading-relaxed">
              Pet photos you upload are sent to Google's Gemini AI service to generate artistic portraits. These images are processed solely for the purpose of creating your requested portraits. We do not use your pet photos for AI model training. Generated portraits are stored in our database and associated with your pet profiles. Google's processing of this data is governed by their{" "}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">privacy policy</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-semibold mb-3">7. SMS/Text Messaging</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Pawtrait Pros offers an optional SMS feature that allows users to share pet portrait links via text message. By using this feature, you consent to the following:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Opt-in:</strong> SMS messages are only sent when you explicitly enter a phone number and check the consent box in the "Send via Text" dialog. No automated or marketing messages are sent.</li>
              <li><strong>Message content:</strong> Messages contain a link to a pet portrait on Pawtrait Pros and a brief description. Standard message and data rates may apply.</li>
              <li><strong>Opt-out:</strong> Recipients can reply STOP to any message to opt out of future texts from this number.</li>
              <li><strong>Phone numbers:</strong> We do not store recipient phone numbers after the message is sent. Phone numbers are transmitted to our SMS provider (Telnyx) solely for message delivery.</li>
              <li><strong>Frequency:</strong> Messages are sent only on demand — one message per share action initiated by the user.</li>
              <li><strong>Help:</strong> Reply HELP to any message for support, or contact us at stefanie@pawtraitpros.com.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-serif font-semibold mb-3">8. Data Sharing and Disclosure</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We do not sell, trade, or rent your personal information to third parties. We may share information with:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Service providers:</strong> Supabase (authentication and database), Stripe (payments), Google Gemini (AI portrait generation), Meta/Instagram (social posting), Telnyx (SMS), and Render (hosting) — each acting as data processors bound by their own privacy policies and data processing agreements</li>
              <li><strong>Public showcase pages:</strong> Organization name, description, location, logo, and pet profiles (including portraits) that you choose to make public are visible to anyone visiting your business showcase page</li>
              <li><strong>Social media platforms:</strong> When you use Instagram posting or other social sharing features, the content you choose to share is transmitted to those platforms</li>
              <li><strong>Legal requirements:</strong> We may disclose information if required by law, court order, or in response to valid legal process</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-serif font-semibold mb-3">9. International Data Transfers</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your data is stored on servers in the United States. If you are accessing the Service from the EEA, UK, or other regions with data protection laws, please be aware that your data will be transferred to and processed in the United States. We ensure appropriate safeguards are in place for such transfers, including reliance on Standard Contractual Clauses (SCCs) where applicable, and our service providers maintain appropriate data protection measures.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-semibold mb-3">10. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your personal data only for as long as necessary to provide the Service and fulfill the purposes described in this policy. Specifically:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-3">
              <li><strong>Account data:</strong> Retained while your account is active and for 30 days after deletion request to allow for recovery</li>
              <li><strong>Pet profiles and portraits:</strong> Retained while your account is active; deleted upon account deletion</li>
              <li><strong>Payment records:</strong> Retained as required by tax and financial regulations (typically 7 years)</li>
              <li><strong>Server logs:</strong> Retained for up to 90 days for security purposes</li>
              <li><strong>Instagram tokens:</strong> Deleted immediately upon disconnecting your Instagram account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-serif font-semibold mb-3">11. Data Storage and Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your data is stored securely using Supabase's PostgreSQL database infrastructure hosted on Amazon Web Services (AWS) in the United States. We use industry-standard security measures including encrypted connections (SSL/TLS), secure authentication tokens (JWT), role-based access controls, and encrypted data at rest. While we strive to protect your information, no method of electronic storage is 100% secure. In the event of a data breach, we will notify affected users and relevant supervisory authorities within 72 hours as required by GDPR.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-semibold mb-3">12. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Depending on your location, you have the following rights regarding your personal data:
            </p>
            <h3 className="text-lg font-semibold mb-2">All Users</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-3">
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of your account and all associated data</li>
              <li>Remove pet profiles and uploaded photos at any time</li>
              <li>Cancel your subscription at any time</li>
              <li>Disconnect third-party integrations (Instagram) at any time</li>
            </ul>
            <h3 className="text-lg font-semibold mb-2">EEA and UK Users (GDPR Rights)</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-3">
              <li><strong>Right of access:</strong> Request a copy of all personal data we hold about you</li>
              <li><strong>Right to rectification:</strong> Request correction of inaccurate or incomplete data</li>
              <li><strong>Right to erasure ("right to be forgotten"):</strong> Request deletion of your personal data when there is no compelling reason for continued processing</li>
              <li><strong>Right to restrict processing:</strong> Request that we limit how we use your data</li>
              <li><strong>Right to data portability:</strong> Request your data in a structured, machine-readable format (JSON or CSV)</li>
              <li><strong>Right to object:</strong> Object to processing based on legitimate interests</li>
              <li><strong>Right to withdraw consent:</strong> Where processing is based on consent, withdraw it at any time without affecting the lawfulness of prior processing</li>
              <li><strong>Right to lodge a complaint:</strong> File a complaint with your local data protection supervisory authority</li>
            </ul>
            <h3 className="text-lg font-semibold mb-2">California Users (CCPA Rights)</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-3">
              <li>Right to know what personal information is collected and how it is used</li>
              <li>Right to request deletion of personal information</li>
              <li>Right to opt out of the sale of personal information (note: we do not sell personal information)</li>
              <li>Right to non-discrimination for exercising your privacy rights</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              To exercise any of these rights, please contact us at{" "}
              <a href="mailto:support@pawtraitpros.com" className="text-primary hover:underline">support@pawtraitpros.com</a>.
              We will respond to your request within 30 days (or sooner as required by applicable law). We may ask you to verify your identity before processing your request.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-semibold mb-3">13. Cookies and Tracking</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use essential cookies only — specifically for session management and authentication. We do not use advertising cookies, tracking pixels, or third-party analytics that track you across websites. Your authentication session is managed through secure, HTTP-only tokens.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-semibold mb-3">14. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service is not directed to individuals under the age of 16 (or 13 in jurisdictions where permitted). We do not knowingly collect personal information from children. If we become aware that we have collected information from a child below the applicable age, we will take steps to delete that information promptly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-semibold mb-3">15. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of material changes by posting the new Privacy Policy on this page, updating the "Last updated" date, and, for significant changes, sending an email notification to the address associated with your account. Your continued use of the Service after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-semibold mb-3">16. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about this Privacy Policy or wish to exercise your data protection rights, please contact us at:
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              Pawtrait Pros<br />
              Email:{" "}
              <a href="mailto:support@pawtraitpros.com" className="text-primary hover:underline">
                support@pawtraitpros.com
              </a>
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              If you are in the EEA or UK and are not satisfied with our response, you have the right to lodge a complaint with your local data protection supervisory authority.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
