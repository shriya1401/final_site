// components/ui/GlassCard.jsx
// Reusable glassmorphism card with optional glow color

export default function GlassCard({ children, className = "", color = "", hover = true }) {
  const glowMap = {
    cyber: "hover:border-cyan-400/40 hover:shadow-[0_0_40px_rgba(0,212,255,0.12)]",
    violet: "hover:border-violet-400/40 hover:shadow-[0_0_40px_rgba(124,58,237,0.12)]",
    teal: "hover:border-teal-400/40 hover:shadow-[0_0_40px_rgba(20,184,166,0.12)]",
  };
  return (
    <div className={`glass p-6 ${hover ? `transition-all duration-300 hover:-translate-y-1 ${glowMap[color] || "hover:border-white/20"}` : ""} ${className}`}>
      {children}
    </div>
  );
}
