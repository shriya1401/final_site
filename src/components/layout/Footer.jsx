// components/layout/Footer.jsx
import { Link } from "react-router-dom";
import { Zap, Mail, Heart } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-navy-900/80 backdrop-blur-md mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-cyber/20 border border-cyber/40 flex items-center justify-center">
                <Zap size={16} className="text-cyber" />
              </div>
              <span className="font-display text-sm text-cyber tracking-widest">AI ON THE STREETS</span>
            </div>
            <p className="text-white/50 text-sm leading-relaxed max-w-sm">
              A Girl Scout Gold Award project teaching K–12 students and communities about AI,
              smart traffic systems, cybersecurity, and STEM careers.
            </p>
            <p className="text-white/30 text-xs mt-3 font-mono">
              Gold Award Project · San Diego County · 2025–2026
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display text-xs tracking-widest text-white/50 uppercase mb-4">Pages</h4>
            <ul className="space-y-2">
              {[
                ["/", "Home"],
                ["/simulation", "Simulation"],
                ["/learn", "Learn AI"],
                ["/cyber", "Cybersecurity"],
                ["/workshops", "Workshops"],
              ].map(([to, label]) => (
                <li key={to}>
                  <Link to={to} className="text-white/50 hover:text-cyber text-sm transition-colors duration-200">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display text-xs tracking-widest text-white/50 uppercase mb-4">More</h4>
            <ul className="space-y-2">
              {[
                ["/resources", "Resources"],
                ["/impact", "Impact"],
                ["/about", "About"],
                ["/workshops", "Request Workshop"],
              ].map(([to, label]) => (
                <li key={to}>
                  <Link to={to} className="text-white/50 hover:text-cyber text-sm transition-colors duration-200">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white/30 text-xs font-mono">
            © 2025–2026 AI on the Streets Gold Award Project. All rights reserved.
          </p>
          <p className="text-white/30 text-xs flex items-center gap-1">
            Made with <Heart size={12} className="text-neon-pink" /> for community impact
          </p>
        </div>
      </div>
    </footer>
  );
}
