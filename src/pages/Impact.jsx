// pages/Impact.jsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar, Cell } from "recharts";
import { Target, TrendingUp, Users, Award, Image } from "lucide-react";
import impactData from "../data/impact.json";
import SectionHeader from "../components/ui/SectionHeader";
import GlassCard from "../components/ui/GlassCard";
import AnimatedCounter from "../components/ui/AnimatedCounter";
import NewsletterSignup from "../components/ui/NewsletterSignup";

const GOAL_COLORS = ["#00d4ff", "#7c3aed", "#14b8a6", "#f59e0b"];

function GoalProgress({ goal, color, index }) {
  return (
    <div className="glass p-5 rounded-2xl border border-white/10 hover:border-white/20 transition-all">
      <div className="flex justify-between items-start mb-3">
        <p className="text-white/70 text-sm flex-1 pr-4">{goal.goal}</p>
        <span className="font-display text-lg font-bold flex-shrink-0" style={{ color }}>
          {goal.progress}%
        </span>
      </div>
      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${goal.progress}%`, background: color }}
        />
      </div>
      <div className="flex justify-between text-xs font-mono text-white/30 mt-2">
        <span>{goal.current} achieved</span>
        <span>Goal: {goal.target}</span>
      </div>
    </div>
  );
}

export default function Impact() {
  const workshopChartData = [
    { name: "Elementary", workshops: 2, students: 50 },
    { name: "Middle School", workshops: 2, students: 30 },
    { name: "High School", workshops: 1, students: 20 },
  ];

  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          tag="Project Impact"
          title="Making a Difference in"
          highlight="Our Community"
          subtitle="Tracking our progress toward making AI education accessible to every student in San Diego County."
        />

        {/* Key metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {impactData.impactMetrics.map((m, i) => (
            <div key={i} className="metric-card">
              <div className="font-display text-3xl font-black cyber-text mb-1">{m.value}</div>
              <div className="font-display text-xs text-white/70 mb-2">{m.label}</div>
              <div className="text-white/40 text-xs leading-snug">{m.description}</div>
            </div>
          ))}
        </div>

        {/* Goals progress */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <Target size={20} className="text-cyan-400" />
            <h2 className="font-display text-2xl font-bold">Project Goals</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {impactData.goals.map((goal, i) => (
              <GoalProgress key={goal.id} goal={goal} color={GOAL_COLORS[i % GOAL_COLORS.length]} index={i} />
            ))}
          </div>
        </div>

      


        <NewsletterSignup />
      </div>
    </div>
  );
}
