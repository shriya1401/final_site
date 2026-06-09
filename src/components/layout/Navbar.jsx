// components/layout/Navbar.jsx
// Top navigation bar with mobile menu, dark mode toggle, and active route highlighting

import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Zap, Moon, Sun } from "lucide-react";

const LINKS = [
  { to: "/",           label: "Home" },
  { to: "/simulation", label: "Simulation" },
  { to: "/learn",      label: "Learn AI" },
  { to: "/cyber",      label: "Cybersecurity" },
  { to: "/workshops",  label: "Workshops" },
  { to: "/resources",  label: "Resources" },
  { to: "/impact",     label: "Impact" },
  { to: "/feedback",   label: "Feedback" },
  { to: "/about",      label: "About" },
];

export default function Navbar({ darkMode, toggleDark }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? "bg-navy-900/95 backdrop-blur-md border-b border-white/10 shadow-[0_4px_30px_rgba(0,212,255,0.05)]" : "bg-transparent"
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-cyber/20 border border-cyber/40 flex items-center justify-center
                          group-hover:bg-cyber/30 transition-all duration-300 animate-glow">
            <Zap size={16} className="text-cyber" />
          </div>
          <div className="hidden sm:block">
            <span className="font-display text-xs text-cyber tracking-widest">AI ON THE STREETS</span>
            <div className="font-display text-[10px] text-white/40 tracking-widest">GOLD AWARD PROJECT</div>
          </div>
        </Link>

        {/* Desktop links */}
        <div className="hidden lg:flex items-center gap-5">
          {LINKS.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`nav-link ${pathname === to ? "text-cyber after:w-full" : ""}`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleDark}
            className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/60
                       hover:text-cyber hover:border-cyber/30 transition-all duration-200"
            aria-label="Toggle dark mode"
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <Link to="/feedback" className="hidden md:block btn-cyber text-xs py-2">
            Event Feedback
          </Link>

          {/* Mobile hamburger */}
          <button
            onClick={() => setOpen(!open)}
            className="lg:hidden p-2 rounded-lg bg-white/5 border border-white/10 text-white/70"
            aria-label="Toggle menu"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`lg:hidden transition-all duration-300 overflow-hidden ${open ? "max-h-screen" : "max-h-0"}`}>
        <div className="bg-navy-900/98 backdrop-blur-md border-t border-white/10 px-4 py-4 flex flex-col gap-1">
          {LINKS.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`px-4 py-3 rounded-lg font-display text-xs tracking-widest uppercase transition-all duration-200 ${
                pathname === to
                  ? "bg-cyber/10 text-cyber border border-cyber/30"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              {label}
            </Link>
          ))}
          <Link to="/feedback" className="btn-cyber text-center mt-2">
            Event Feedback
          </Link>
        </div>
      </div>
    </nav>
  );
}
