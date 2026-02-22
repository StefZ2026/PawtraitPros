import { Link } from "wouter";
import { Dog, Cat } from "lucide-react";

export default function Terms() {
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
        <h1 className="text-3xl font-serif font-bold mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: February 17, 2026</p>

        <div className="prose prose-stone dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-serif font-semibold mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using Pawtrait Pros ("the Service") at pawtraitpros.com, you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use the Service. These Terms apply to all users, including pet professionals, administrators, and visitors.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-semibold mb-3">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              Pawtrait Pros is a platform that helps pet professionals create and showcase AI-generated artistic pet portraits. The Service includes pet profile management, AI portrait generation, public showcase pages, social media sharing tools, and direct Instagram posting integration.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-semibold mb-3">3. Account Registration</h2>
            <p className="text-muted-foreground leading-relaxed">
              To use certain features of the Service, you must create an account. You agree to provide accurate and complete information during registration and to keep your account credentials secure. You are responsible for all activity that occurs under your account. You must notify us immediately of any unauthorized use of your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-semibold mb-3">4. Subscription Plans and Payments</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Pawtrait Pros offers subscription plans with varying features and limits. By subscribing to a paid plan, you agree to pay the applicable fees as described at the time of purchase.
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Payments are processed securely through Stripe</li>
              <li>Subscriptions renew automatically unless canceled before the renewal date</li>
              <li>You may cancel your subscription at any time; access continues until the end of the current billing period</li>
              <li>Refunds are handled on a case-by-case basis at our discretion</li>
              <li>We reserve the right to change pricing with reasonable notice</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-serif font-semibold mb-3">5. User Content</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              You retain ownership of all content you upload to the Service, including pet photos, organization logos, descriptions, and other materials ("User Content"). By uploading User Content, you grant Pawtrait Pros a non-exclusive, worldwide license to use, display, and process that content for the purpose of providing the Service, including:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Generating AI artistic portraits from your pet photos</li>
              <li>Displaying your organization and pet profiles on public showcase pages</li>
              <li>Creating Open Graph preview images for social media sharing</li>
              <li>Posting pet portraits to connected social media accounts (Instagram) on your behalf when you request it</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              You represent that you have the right to upload all User Content and that it does not infringe on any third party's rights.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-semibold mb-3">6. AI-Generated Portraits</h2>
            <p className="text-muted-foreground leading-relaxed">
              AI portraits are generated using Google's Gemini AI service. While we strive for quality results, AI generation is inherently variable and we do not guarantee specific artistic outcomes. Generated portraits are provided for use in connection with the Service, including sharing on social media to promote your business. You may use generated portraits for purposes related to promoting your business and pet services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-semibold mb-3">7. Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Use the Service for any unlawful purpose</li>
              <li>Upload content that is harmful, abusive, or violates the rights of others</li>
              <li>Attempt to gain unauthorized access to the Service or other users' accounts</li>
              <li>Use the Service to misrepresent animals or services</li>
              <li>Interfere with or disrupt the Service's infrastructure</li>
              <li>Scrape, crawl, or use automated means to access the Service without permission</li>
              <li>Use the Service to promote animal cruelty or illegal animal trade</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-serif font-semibold mb-3">8. Third-Party Integrations</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              The Service integrates with third-party platforms including Instagram (Meta), Stripe, and Google Gemini. When you connect a third-party account:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>You authorize Pawtrait Pros to interact with that platform on your behalf</li>
              <li>Your use of third-party platforms is subject to their respective terms and policies</li>
              <li>You can disconnect third-party integrations at any time from your Settings page</li>
              <li>Disconnecting immediately removes all stored credentials for that integration</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-serif font-semibold mb-3">9. Data Deletion and Account Closure</h2>
            <p className="text-muted-foreground leading-relaxed">
              You may request deletion of your account and all associated data at any time by contacting us at support@pawtraitpros.com. Upon receiving a verified deletion request, we will delete your account data within 30 days. Some data may be retained as required by law (e.g., financial records). For full details on data retention and your privacy rights, see our{" "}
              <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-semibold mb-3">10. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Pawtrait Pros name, logo, website design, and underlying technology are the property of Pawtrait Pros and are protected by applicable intellectual property laws. You may not copy, modify, distribute, or create derivative works from our Service without prior written consent.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-semibold mb-3">11. Disclaimer of Warranties</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service is provided "as is" and "as available" without warranties of any kind, whether express or implied. We do not warrant that the Service will be uninterrupted, error-free, or secure. We are not responsible for the accuracy of AI-generated content. We do not guarantee any specific outcome from using the Service, including but not limited to business outcomes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-semibold mb-3">12. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              To the maximum extent permitted by law, Pawtrait Pros shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service. Our total liability for any claims relating to the Service shall not exceed the amount you paid us in the twelve (12) months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-semibold mb-3">13. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to suspend or terminate your account at any time for violation of these Terms or for any other reason at our discretion. Upon termination, your right to use the Service ceases immediately. You may delete your account at any time by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-semibold mb-3">14. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may modify these Terms at any time. We will notify you of material changes by posting the updated Terms on this page and updating the "Last updated" date. Your continued use of the Service after changes constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-semibold mb-3">15. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the State of Georgia, United States, without regard to conflict of law provisions. Any disputes arising under these Terms shall be resolved in the state or federal courts located in Cherokee County, Georgia.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-semibold mb-3">16. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about these Terms, please contact us at{" "}
              <a href="mailto:support@pawtraitpros.com" className="text-primary hover:underline">
                support@pawtraitpros.com
              </a>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
