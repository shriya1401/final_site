// pages/Home.jsx
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Zap, Shield, Rocket, ArrowRight, Users, BookOpen, Building, GraduationCap, ChevronDown } from "lucide-react";
import AnimatedCounter from "../components/ui/AnimatedCounter";
import GlassCard from "../components/ui/GlassCard";
import siteData from "../data/stats.json";

const ICON_MAP = { Zap, Shield, Rocket, Users, BookOpen, Building, GraduationCap };
const COLOR_MAP = {
  cyber: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
  violet: "text-violet-400 bg-violet-400/10 border-violet-400/20",
  teal: "text-teal-400 bg-teal-400/10 border-teal-400/20",
};

// Animated glowing particles
function ParticleField() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let W = canvas.width = window.innerWidth;
    let H = canvas.height = window.innerHeight;

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.5,
      color: ["#00d4ff", "#7c3aed", "#14b8a6"][Math.floor(Math.random() * 3)],
      alpha: Math.random() * 0.6 + 0.2,
    }));

    let raf;
    function draw() {
      ctx.clearRect(0, 0, W, H);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.floor(p.alpha * 255).toString(16).padStart(2, "0");
        ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    }
    draw();
    const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
    window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }} />;
}

export default function Home() {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 100); }, []);

  return (
    <div className="min-h-screen">
      {/* ---- HERO ---- */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden">
        <ParticleField />

        {/* Grid overlay */}
        <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />

        {/* Glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet/10 rounded-full blur-3xl animate-pulse-slow pointer-events-none" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-cyber/8 rounded-full blur-3xl animate-pulse-slow pointer-events-none" style={{ animationDelay: "2s" }} />

        <div className={`relative z-10 text-center max-w-5xl mx-auto transition-all duration-1000 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          {/* Badge */}
          <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full mb-8 border border-cyber/20">
            <div className="w-2 h-2 rounded-full bg-cyber animate-pulse" />
            <span className="font-mono text-xs text-cyber tracking-widest">GIRL SCOUT GOLD AWARD PROJECT</span>
          </div>

          {/* Title */}
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-black mb-4 leading-none">
            <span className="cyber-text">AI on the</span>
            <br />
            <span className="text-white">Streets</span>
          </h1>

          {/* Subtitle */}
          <p className="font-display text-xl md:text-2xl text-white/50 tracking-widest uppercase mb-4">
            Smarter Signals, Smarter People
          </p>

          {/* Tagline */}
          <p className="text-white/60 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            {siteData.hero.tagline}
          </p>

          {/* CTA buttons */}
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/simulation" className="btn-cyber flex items-center gap-2">
              <Zap size={18} /> Explore Simulation
            </Link>
            <Link to="/learn" className="btn-outline flex items-center gap-2">
              Learn About AI <ArrowRight size={16} />
            </Link>
            <Link to="/workshops" className="btn-violet flex items-center gap-2">
              Request a Workshop
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/30 animate-bounce">
          <span className="font-mono text-xs tracking-widest">SCROLL</span>
          <ChevronDown size={20} />
        </div>
      </section>

      {/* ---- STATS ---- */}
      <section className="py-20 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet/5 to-transparent pointer-events-none" />
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="font-mono text-xs tracking-widest text-cyber border border-cyber/30 px-3 py-1 rounded-full bg-cyber/5">
              PROJECT IMPACT
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {siteData.stats.map(stat => (
              <div key={stat.id} className="metric-card">
                <div className="font-display text-4xl md:text-5xl font-black cyber-text mb-1">
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-white/50 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- HIGHLIGHTS ---- */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="font-mono text-xs tracking-widest text-teal border border-teal/30 px-3 py-1 rounded-full bg-teal/5 mb-4 inline-block">
              PROJECT HIGHLIGHTS
            </span>
            <h2 className="section-title">What Students <span className="cyber-text">Learn & Experience</span></h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {siteData.highlights.map(h => {
              const colorClass = COLOR_MAP[h.color];
              return (
                <GlassCard key={h.id} color={h.color}>
                  <div className={`w-12 h-12 rounded-xl border flex items-center justify-center mb-4 ${colorClass}`}>
                    {h.icon === "TrafficCone" && <Zap size={22} />}
                    {h.icon === "Shield" && <Shield size={22} />}
                    {h.icon === "Rocket" && <Rocket size={22} />}
                  </div>
                  <h3 className="font-display text-lg font-bold mb-3">{h.title}</h3>
                  <p className="text-white/60 text-sm leading-relaxed">{h.description}</p>
                </GlassCard>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---- GOLD AWARD ---- */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="glass p-8 md:p-12 rounded-2xl border border-violet/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-violet/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <span className="font-mono text-xs tracking-widest text-violet border border-violet/30 px-3 py-1 rounded-full bg-violet/5 mb-4 inline-block">
                  ABOUT THE PROJECT
                </span>
                <h2 className="section-title mb-4">Girl Scout <span className="text-violet-400">Gold Award</span></h2>
                <p className="text-white/60 leading-relaxed mb-4">
                  The Gold Award is the highest achievement in Girl Scouting — awarded to girls who identify a problem in their community, develop a sustainable solution, and create lasting change.
                </p>
                <p className="text-white/60 leading-relaxed">
                  This project addresses AI literacy gaps in K–12 education by bringing hands-on simulations and workshops directly to schools across San Diego County.
                </p>
                <Link to="/about" className="btn-outline inline-flex items-center gap-2 mt-6">
                  Learn More <ArrowRight size={16} />
                </Link>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Community Benefit", value: "AI education for underserved schools" },
                  { label: "Sustainability", value: "Open-source resources + teacher training" },
                  { label: "Impact", value: "450+ students reached across 12 schools" },
                  { label: "Original Research", value: "Python simulation notebooks for 3 signal modes" },
                ].map(item => (
                  <div key={item.label} className="glass p-4 rounded-xl border border-white/10">
                    <div className="font-mono text-xs text-violet/70 mb-1">{item.label}</div>
                    <div className="text-white/80 text-sm">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- CTA ---- */}
      <section className="py-20 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="section-title mb-4">Bring This Workshop <span className="cyber-text">to Your School</span></h2>
          <p className="text-white/60 mb-8">Free workshops available for elementary, middle, and high school students across San Diego County.</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/workshops" className="btn-cyber flex items-center gap-2">
              <GraduationCap size={18} /> Request a Workshop
            </Link>
            <Link to="/resources" className="btn-outline">Browse Free Resources</Link>
          </div>
        </div>
      </section>
    </div>
  );
}