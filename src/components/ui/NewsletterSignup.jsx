// components/ui/NewsletterSignup.jsx
import { useState } from "react";
import { Mail, CheckCircle } from "lucide-react";

export default function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email) { setSubmitted(true); setEmail(""); }
  };

  return (
    <section className="py-16 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="glass p-8 text-center border border-cyber/20 rounded-2xl
                        shadow-[0_0_60px_rgba(0,212,255,0.06)]">
          <Mail size={36} className="text-cyber mx-auto mb-4" />
          <h3 className="font-display text-2xl font-bold mb-2">Stay in the Loop</h3>
          <p className="text-white/60 mb-6">
            Get updates on new workshops, resources, and project milestones.
          </p>
          {submitted ? (
            <div className="flex items-center justify-center gap-2 text-teal py-4">
              <CheckCircle size={20} />
              <span className="font-display tracking-wide">You're subscribed! Thank you.</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="input-field flex-1"
              />
              <button type="submit" className="btn-cyber whitespace-nowrap">
                Subscribe
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
