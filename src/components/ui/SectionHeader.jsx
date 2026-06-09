// components/ui/SectionHeader.jsx
export default function SectionHeader({ tag, title, highlight, subtitle, center = true }) {
  return (
    <div className={`mb-12 ${center ? "text-center" : ""}`}>
      {tag && (
        <span className="inline-block font-mono text-xs tracking-widest text-cyber border border-cyber/30 px-3 py-1 rounded-full mb-4 bg-cyber/5">
          {tag}
        </span>
      )}
      <h2 className="section-title mb-4">
        {title}{" "}
        {highlight && <span className="cyber-text">{highlight}</span>}
      </h2>
      {subtitle && (
        <p className="text-white/60 max-w-2xl mx-auto text-lg leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}
