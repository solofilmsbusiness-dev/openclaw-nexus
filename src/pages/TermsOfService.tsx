import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const TermsOfService = () => {
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

        <h1 className="text-3xl font-display font-bold mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground font-mono mb-10">
          Last updated: March 6, 2026
        </p>

        <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-lg font-display font-semibold text-foreground mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using SoloOS, you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use the platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-display font-semibold text-foreground mb-3">2. Description of Service</h2>
            <p>
              SoloOS is an agent orchestration and monitoring platform that provides tools for managing autonomous agents, visualizing agent networks, scheduling tasks, and analyzing simulated trading data. The platform is provided "as is" for informational and operational purposes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-display font-semibold text-foreground mb-3">3. User Accounts</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized use of your account. We reserve the right to suspend or terminate accounts that violate these terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-display font-semibold text-foreground mb-3">4. Trading Disclaimer</h2>
            <p>
              The trading analytics and simulated market data provided by SoloOS are for informational purposes only and do not constitute financial advice. Simulated trading results do not represent actual trading performance. Past performance is not indicative of future results. You should consult a qualified financial advisor before making any investment decisions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-display font-semibold text-foreground mb-3">5. Acceptable Use</h2>
            <p>
              You agree not to use SoloOS for any unlawful purpose, to interfere with the platform's operation, to attempt to gain unauthorized access to other users' data, or to reverse-engineer the platform's infrastructure.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-display font-semibold text-foreground mb-3">6. Intellectual Property</h2>
            <p>
              All content, features, and functionality of SoloOS are owned by us and protected by intellectual property laws. Your agent configurations and data remain your property. You grant us a limited license to store and process your data solely to provide the service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-display font-semibold text-foreground mb-3">7. Limitation of Liability</h2>
            <p>
              SoloOS is provided without warranties of any kind, express or implied. We shall not be liable for any indirect, incidental, special, or consequential damages resulting from your use of the platform, including but not limited to loss of data or financial losses from trading decisions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-display font-semibold text-foreground mb-3">8. Modifications</h2>
            <p>
              We reserve the right to modify these terms at any time. Changes will be communicated through the platform. Your continued use of SoloOS after modifications constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-display font-semibold text-foreground mb-3">9. Termination</h2>
            <p>
              We may terminate or suspend your access to SoloOS at our sole discretion, without prior notice, for conduct that we believe violates these terms or is harmful to other users or the platform.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
