// pages/LearnAI.jsx
import { useState } from "react";
import { Brain, Cpu, Car, Heart, Shield, Scale, CheckCircle, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import learnData from "../data/learn.json";
import SectionHeader from "../components/ui/SectionHeader";
import GlassCard from "../components/ui/GlassCard";

const ICON_MAP = { Brain, Cpu, Car, Heart, Shield, Scale };
const COLOR_CLASS = {
  cyber: { text: "text-cyan-400", border: "border-cyan-400/30", bg: "bg-cyan-400/10" },
  violet: { text: "text-violet-400", border: "border-violet-400/30", bg: "bg-violet-400/10" },
  teal: { text: "text-teal-400", border: "border-teal-400/30", bg: "bg-teal-400/10" },
};

function TopicCard({ section, expanded, onToggle }) {
  const Icon = ICON_MAP[section.icon] || Brain;
  const color = COLOR_CLASS[section.color] || COLOR_CLASS.cyber;
  return (
    <div className={`glass rounded-2xl border transition-all duration-300 ${expanded ? `${color.border} shadow-[0_0_30px_rgba(0,0,0,0.3)]` : "border-white/10 hover:border-white/20"}`}>
      <button
        className="w-full p-6 text-left flex items-start gap-4"
        onClick={onToggle}
      >
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color.bg} border ${color.border}`}>
          <Icon size={22} className={color.text} />
        </div>
        <div className="flex-1">
          <h3 className={`font-display text-lg font-bold mb-1 ${expanded ? color.text : "text-white"}`}>
            {section.title}
          </h3>
          <p className="text-white/50 text-sm">{section.summary}</p>
        </div>
        <div className="flex-shrink-0 pt-1">
          {expanded ? <ChevronUp size={18} className={color.text} /> : <ChevronDown size={18} className="text-white/40" />}
        </div>
      </button>

      {expanded && (
        <div className="px-6 pb-6 border-t border-white/10 pt-4">
          <p className="text-white/70 text-sm leading-relaxed mb-4">{section.content}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {section.keyPoints.map(pt => (
              <div key={pt} className={`text-xs px-3 py-2 rounded-lg ${color.bg} border ${color.border} ${color.text} font-mono text-center`}>
                {pt}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Quiz() {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [answers, setAnswers] = useState([]);

  const q = learnData.quiz[current];

  const handleAnswer = (idx) => {
    if (selected !== null) return;
    setSelected(idx);
    const correct = idx === q.correct;
    if (correct) setScore(s => s + 1);
    setAnswers(a => [...a, { selected: idx, correct }]);
  };

  const handleNext = () => {
    if (current + 1 >= learnData.quiz.length) {
      setDone(true);
    } else {
      setCurrent(c => c + 1);
      setSelected(null);
    }
  };

  const handleRestart = () => {
    setCurrent(0); setSelected(null); setScore(0); setDone(false); setAnswers([]);
  };

  if (done) {
    const pct = Math.round((score / learnData.quiz.length) * 100);
    return (
      <div className="glass p-8 rounded-2xl border border-cyan-400/20 text-center">
        <div className="font-display text-5xl font-black cyber-text mb-2">{pct}%</div>
        <div className="text-white/60 mb-4">{score}/{learnData.quiz.length} correct</div>
        <p className="text-white/70 mb-6">{pct >= 75 ? "🎉 Excellent! You're an AI literacy champion!" : pct >= 50 ? "Good effort! Review the topics above to strengthen your knowledge." : "Keep learning — the topics above will help you ace this next time!"}</p>
        <button onClick={handleRestart} className="btn-cyber">Try Again</button>
      </div>
    );
  }

  return (
    <div className="glass p-6 md:p-8 rounded-2xl border border-violet-400/20">
      {/* Progress */}
      <div className="flex items-center justify-between mb-6">
        <span className="font-mono text-xs text-white/40">Question {current + 1} of {learnData.quiz.length}</span>
        <div className="flex gap-1">
          {learnData.quiz.map((_, i) => (
            <div key={i} className={`w-6 h-1.5 rounded-full transition-all ${i < current ? "bg-teal-400" : i === current ? "bg-violet-400" : "bg-white/20"}`} />
          ))}
        </div>
      </div>

      <h3 className="font-display text-lg font-bold mb-6">{q.question}</h3>

      <div className="space-y-3 mb-6">
        {q.options.map((opt, idx) => {
          let cls = "glass p-4 rounded-xl border border-white/10 text-white/70 text-sm cursor-pointer hover:border-violet-400/40 transition-all";
          if (selected !== null) {
            if (idx === q.correct) cls = "glass p-4 rounded-xl border border-teal-400 bg-teal-400/10 text-teal-400 text-sm";
            else if (idx === selected && idx !== q.correct) cls = "glass p-4 rounded-xl border border-red-400 bg-red-400/10 text-red-400 text-sm";
            else cls = "glass p-4 rounded-xl border border-white/10 text-white/30 text-sm";
          }
          return (
            <button key={idx} className={`w-full text-left flex items-center gap-3 ${cls}`} onClick={() => handleAnswer(idx)}>
              {selected !== null && idx === q.correct && <CheckCircle size={16} className="text-teal-400 flex-shrink-0" />}
              {selected !== null && idx === selected && idx !== q.correct && <XCircle size={16} className="text-red-400 flex-shrink-0" />}
              <span>{opt}</span>
            </button>
          );
        })}
      </div>

      {selected !== null && (
        <div className="glass p-4 rounded-xl border border-cyan-400/20 bg-cyan-400/5 mb-4">
          <p className="text-sm text-white/70 leading-relaxed"><span className="text-cyan-400 font-semibold">Explanation: </span>{q.explanation}</p>
        </div>
      )}

      {selected !== null && (
        <button onClick={handleNext} className="btn-cyber w-full">
          {current + 1 >= learnData.quiz.length ? "See Results" : "Next Question →"}
        </button>
      )}
    </div>
  );
}

export default function LearnAI() {
  const [expanded, setExpanded] = useState("what-is-ai");

  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-4xl mx-auto">
        <SectionHeader
          tag="Education"
          title="Learn"
          highlight="Artificial Intelligence"
          subtitle="From basic concepts to real-world applications — explore AI the way it's taught in our workshops."
        />

        {/* Topic accordions */}
        <div className="space-y-3 mb-16">
          {learnData.sections.map(section => (
            <TopicCard
              key={section.id}
              section={section}
              expanded={expanded === section.id}
              onToggle={() => setExpanded(expanded === section.id ? null : section.id)}
            />
          ))}
        </div>

        {/* AI in Transportation infographic */}
        <div className="glass p-8 rounded-2xl border border-teal-400/20 mb-16 text-center">
          <h3 className="font-display text-2xl font-bold mb-2">How AI Traffic Signals Work</h3>
          <p className="text-white/50 mb-8">The three stages modeled in this project's Python simulations</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { step: "01", title: "Sense", desc: "Sensors (cameras, induction loops, radar) detect vehicles at each approach", color: "text-red-400", border: "border-red-400/30" },
              { step: "02", title: "Decide", desc: "The controller (fixed rules, sensor logic, or RL agent) picks the optimal green phase", color: "text-yellow-400", border: "border-yellow-400/30" },
              { step: "03", title: "Act", desc: "Signal switches phase; metrics (wait time, throughput, emissions) are updated", color: "text-cyan-400", border: "border-cyan-400/30" },
            ].map(item => (
              <div key={item.step} className={`glass p-6 rounded-xl border ${item.border}`}>
                <div className={`font-display text-3xl font-black ${item.color} mb-2`}>{item.step}</div>
                <div className="font-display font-bold mb-2">{item.title}</div>
                <p className="text-white/60 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quiz */}
        <div>
          <div className="text-center mb-8">
            <span className="font-mono text-xs tracking-widest text-violet-400 border border-violet-400/30 px-3 py-1 rounded-full bg-violet-400/5 mb-4 inline-block">
              KNOWLEDGE CHECK
            </span>
            <h2 className="section-title">Test Your <span className="text-violet-400">AI Knowledge</span></h2>
          </div>
          <Quiz />
        </div>
      </div>
    </div>
  );
}
