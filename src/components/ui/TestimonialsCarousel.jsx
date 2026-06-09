// components/ui/TestimonialsCarousel.jsx
import { useState } from "react";
import { ChevronLeft, ChevronRight, Star, Quote } from "lucide-react";
import impactData from "../../data/impact.json";

export default function TestimonialsCarousel() {
  const { testimonials } = impactData;
  const [idx, setIdx] = useState(0);

  const prev = () => setIdx((i) => (i - 1 + testimonials.length) % testimonials.length);
  const next = () => setIdx((i) => (i + 1) % testimonials.length);
  const t = testimonials[idx];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="glass p-8 rounded-2xl border border-violet/20 relative overflow-hidden">
        {/* Decorative quote */}
        <Quote size={64} className="absolute top-4 right-4 text-violet/10" />

        {/* Stars */}
        <div className="flex gap-1 mb-4">
          {Array.from({ length: t.rating }).map((_, i) => (
            <Star key={i} size={16} className="text-yellow-400 fill-yellow-400" />
          ))}
        </div>

        {/* Quote text */}
        <blockquote className="text-white/80 text-lg leading-relaxed mb-6 italic">
          "{t.quote}"
        </blockquote>

        {/* Attribution */}
        <div className="flex items-center justify-between">
          <div>
            <div className="font-display text-sm text-cyber">{t.name}</div>
            <div className="text-white/50 text-sm">{t.role}</div>
            <div className="text-white/40 text-xs">{t.school}</div>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-3">
            <button onClick={prev} className="p-2 rounded-lg bg-white/5 border border-white/10 hover:border-violet/40 hover:text-violet transition-all">
              <ChevronLeft size={18} />
            </button>
            <span className="font-mono text-xs text-white/40">{idx + 1}/{testimonials.length}</span>
            <button onClick={next} className="p-2 rounded-lg bg-white/5 border border-white/10 hover:border-violet/40 hover:text-violet transition-all">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Dots */}
        <div className="flex gap-1 mt-4 justify-center">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${i === idx ? "bg-violet w-6" : "bg-white/20"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
