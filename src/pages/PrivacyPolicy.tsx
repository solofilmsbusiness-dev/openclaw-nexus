import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10 font-mono"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        <h1 className="text-3xl font-display font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground font-mono mb-10">
          Last updated: March 6, 2026
        </p>

        <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-lg font-display font-semibold text-foreground mb-3">1. Information We Collect</h2>
            <p>
              We collect information you provide directly when you create an account, including your email address and authentication credentials. We also collect usage data such as agent configurations, graph layouts, and trading preferences to provide and improve our services.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-display font-semibold text-foreground mb-3">2. How We Use Your Information</h2>
            <p>
              Your information is used to operate and maintain your SoloOS account, save and restore your agent configurations, provide personalized trading analytics, and improve our platform. We do not sell your personal information to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-display font-semibold text-foreground mb-3">3. Data Storage & Security</h2>
            <p>
              Your data is stored securely using industry-standard encryption. Agent configurations, trading data, and account information are protected with row-level security policies ensuring only you can access your own data.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-display font-semibold text-foreground mb-3">4. Cookies & Local Storage</h2>
            <p>
              We use local storage to persist your theme preferences and session tokens. No third-party tracking cookies are used. Authentication tokens are managed securely through our backend infrastructure.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-display font-semibold text-foreground mb-3">5. Data Retention</h2>
            <p>
              We retain your account data for as long as your account is active. You may request deletion of your account and all associated data at any time by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-display font-semibold text-foreground mb-3">6. Third-Party Services</h2>
            <p>
              We use third-party services for authentication and data storage. These services have their own privacy policies governing the use of your information. Market data displayed in the trading module is fetched from external APIs and is not stored permanently.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-display font-semibold text-foreground mb-3">7. Your Rights</h2>
            <p>
              You have the right to access, correct, or delete your personal data. You may export your agent configurations at any time using the built-in export functionality. To exercise these rights, contact us through the platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-display font-semibold text-foreground mb-3">8. Changes to This Policy</h2>
            <p>
              We may update this privacy policy from time to time. We will notify you of significant changes through the platform. Continued use of SoloOS after changes constitutes acceptance of the updated policy.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
