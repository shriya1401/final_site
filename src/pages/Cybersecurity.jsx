// pages/Cybersecurity.jsx
import { useState } from "react";
import { Building, Lock, Fish, Eye, Bot, CheckCircle, XCircle, Shield, AlertTriangle } from "lucide-react";
import cyberData from "../data/cybersecurity.json";
import SectionHeader from "../components/ui/SectionHeader";
import GlassCard from "../components/ui/GlassCard";

const ICON_MAP = { Building, Lock, Fish, Eye, Bot, Shield };
const COLOR = {
  cyber: { text: "text-cyan-400", border: "border-cyan-400/30", bg: "bg-cyan-400/10" },
  violet: { text: "text-violet-400", border: "border-violet-400/30", bg: "bg-violet-400/10" },
  teal: { text: "text-teal-400", border: "border-teal-400/30", bg: "bg-teal-400/10" },
};

function CyberQuiz() {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const q = cyberData.quiz[current];

  const handleAnswer = (idx) => {
    if (selected !== null) return;
    setSelected(idx);
    if (idx === q.correct) setScore(s => s + 1);
  };

  const handleNext = () => {
    if (current + 1 >= cyberData.quiz.length) setDone(true);
    else { setCurrent(c => c + 1); setSelected(null); }
  };

  const restart = () => { setCurrent(0); setSelected(null); setScore(0); setDone(false); };

  if (done) {
    const pct = Math.round((score / cyberData.quiz.length) * 100);
    return (
      <div className="glass p-8 rounded-2xl border border-cyan-400/20 text-center">
        <Shield size={48} className={`mx-auto mb-4 ${pct >= 75 ? "text-teal-400" : pct >= 50 ? "text-yellow-400" : "text-red-400"}`} />
        <div className="font-display text-5xl font-black cyber-text mb-2">{pct}%</div>
        <div className="text-white/60 mb-4">Cybersecurity Score: {score}/{cyberData.quiz.length} correct</div>
        <p className="text-white/70 mb-6">
          {pct >= 75 ? "🔒 Excellent! You're cyber-aware and ready to help protect your community." : pct >= 50 ? "Good effort! Review the topics above to strengthen your defenses." : "Keep learning. cybersecurity knowledge protects you and your community!"}
        </p>
        <button onClick={restart} className="btn-cyber">Try Again</button>
      </div>
    );
  }

  return (
    <div className="glass p-6 md:p-8 rounded-2xl border border-violet-400/20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-violet-400" />
          <span className="font-mono text-xs text-white/40">Question {current + 1}/{cyberData.quiz.length}</span>
        </div>
        <div className="flex gap-1">
          {cyberData.quiz.map((_, i) => (
            <div key={i} className={`w-6 h-1.5 rounded-full transition-all ${i < current ? "bg-teal-400" : i === current ? "bg-violet-400" : "bg-white/20"}`} />
          ))}
        </div>
      </div>
      <div className="flex items-start gap-2 mb-6">
        <AlertTriangle size={18} className="text-yellow-400 flex-shrink-0 mt-0.5" />
        <h3 className="font-display text-lg font-bold">{q.question}</h3>
      </div>
      <div className="space-y-3 mb-6">
        {q.options.map((opt, idx) => {
          let cls = "glass p-4 rounded-xl border border-white/10 text-white/70 text-sm cursor-pointer hover:border-violet-400/40 transition-all text-left w-full flex items-center gap-3";
          if (selected !== null) {
            if (idx === q.correct) cls = "glass p-4 rounded-xl border border-teal-400 bg-teal-400/10 text-teal-400 text-sm text-left w-full flex items-center gap-3";
            else if (idx === selected) cls = "glass p-4 rounded-xl border border-red-400 bg-red-400/10 text-red-400 text-sm text-left w-full flex items-center gap-3";
            else cls = "glass p-4 rounded-xl border border-white/10 text-white/30 text-sm text-left w-full flex items-center gap-3";
          }
          return (
            <button key={idx} className={cls} onClick={() => handleAnswer(idx)}>
              {selected !== null && idx === q.correct && <CheckCircle size={16} className="flex-shrink-0" />}
              {selected !== null && idx === selected && idx !== q.correct && <XCircle size={16} className="flex-shrink-0" />}
              {(selected === null || (idx !== q.correct && idx !== selected)) && <div className="w-4 h-4 rounded-full border border-current flex-shrink-0 text-xs flex items-center justify-center font-mono">{String.fromCharCode(65+idx)}</div>}
              <span>{opt}</span>
            </button>
          );
        })}
      </div>
      {selected !== null && (
        <div className="glass p-4 rounded-xl border border-cyan-400/20 bg-cyan-400/5 mb-4">
          <p className="text-sm text-white/70"><span className="text-cyan-400 font-semibold">Why? </span>{q.explanation}</p>
        </div>
      )}
      {selected !== null && (
        <button onClick={handleNext} className="btn-cyber w-full">
          {current + 1 >= cyberData.quiz.length ? "See Results" : "Next Question →"}
        </button>
      )}
    </div>
  );
}

export default function Cybersecurity() {
  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-4xl mx-auto">
        <SectionHeader
          tag="Digital Safety"
          title="Cybersecurity &"
          highlight="Smart Cities"
subtitle="Why protecting AI-powered infrastructure matters, and how you can stay safe online."        />

        {/* Topics */}
        <div className="space-y-6 mb-16">
          {cyberData.topics.map(topic => {
            const Icon = ICON_MAP[topic.icon] || Shield;
            const color = COLOR[topic.color] || COLOR.cyber;
            return (
              <GlassCard key={topic.id} color={topic.color} hover={false}>
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color.bg} border ${color.border}`}>
                    <Icon size={22} className={color.text} />
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-display text-xl font-bold mb-3 ${color.text}`}>{topic.title}</h3>
                    <p className="text-white/70 text-sm leading-relaxed mb-4">{topic.content}</p>

                    {topic.example && (
                      <div className={`p-4 rounded-xl ${color.bg} border ${color.border} mb-4`}>
                        <div className={`font-mono text-xs mb-1 ${color.text}`}>REAL-WORLD EXAMPLE</div>
                        <p className="text-white/70 text-sm">{topic.example}</p>
                      </div>
                    )}

                    {topic.tips && (
                      <div>
                        <div className={`font-mono text-xs mb-2 ${color.text}`}>BEST PRACTICES</div>
                        <ul className="space-y-1">
                          {topic.tips.map(tip => (
                            <li key={tip} className="flex items-center gap-2 text-sm text-white/60">
                              <CheckCircle size={14} className={color.text} />{tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {topic.redFlags && (
                      <div>
                        <div className="font-mono text-xs mb-2 text-yellow-400">RED FLAGS TO WATCH FOR</div>
                        <ul className="space-y-1">
                          {topic.redFlags.map(flag => (
                            <li key={flag} className="flex items-center gap-2 text-sm text-white/60">
                              <AlertTriangle size={14} className="text-yellow-400" />{flag}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {topic.principles && (
                      <div>
                        <div className={`font-mono text-xs mb-2 ${color.text}`}>KEY PRINCIPLES</div>
                        <ul className="space-y-1">
                          {topic.principles.map(p => (
                            <li key={p} className="flex items-center gap-2 text-sm text-white/60">
                              <div className={`w-1.5 h-1.5 rounded-full ${color.text.replace("text-","bg-")}`} />{p}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>

        {/* Quiz */}
        <div>
          <div className="text-center mb-8">
            <span className="font-mono text-xs tracking-widest text-violet-400 border border-violet-400/30 px-3 py-1 rounded-full bg-violet-400/5 mb-4 inline-block">
              INTERACTIVE QUIZ
            </span>
            <h2 className="section-title">Test Your <span className="text-violet-400">Cyber Smarts</span></h2>
            <p className="text-white/50 mt-2">Can you spot the threats?</p>
          </div>
          <CyberQuiz />
        </div>
      </div>
    </div>
  );
}
