// pages/Impact.jsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar, Cell } from "recharts";
import { Target, TrendingUp, Users, Award, Image } from "lucide-react";
import impactData from "../data/impact.json";
import SectionHeader from "../components/ui/SectionHeader";
import GlassCard from "../components/ui/GlassCard";
import AnimatedCounter from "../components/ui/AnimatedCounter";
import TestimonialsCarousel from "../components/ui/TestimonialsCarousel";
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
    { name: "Elementary", workshops: 6, students: 150 },
    { name: "Middle School", workshops: 8, students: 200 },
    { name: "High School", workshops: 4, students: 100 },
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

        {/* Workshop breakdown chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-16">
          <GlassCard hover={false}>
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp size={18} className="text-cyan-400" />
              <h3 className="font-display text-lg font-bold">Workshops by Audience</h3>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={workshopChartData}>
                <XAxis dataKey="name" tick={{ fill: "#ffffff60", fontSize: 11 }} />
                <YAxis tick={{ fill: "#ffffff60", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "#0a1628", border: "1px solid rgba(0,212,255,0.2)", borderRadius: 8 }}
                  labelStyle={{ color: "#fff" }}
                />
                <Bar dataKey="workshops" name="Workshops" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                <Bar dataKey="students" name="Students" fill="#00d4ff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>

          <GlassCard hover={false}>
            <div className="flex items-center gap-2 mb-4">
              <Users size={18} className="text-violet-400" />
              <h3 className="font-display text-lg font-bold">Student Totals</h3>
            </div>
            <div className="space-y-4 mt-6">
              {[
                { label: "Elementary (K–5)", value: 150, total: 450, color: "#14b8a6" },
                { label: "Middle School (6–8)", value: 200, total: 450, color: "#7c3aed" },
                { label: "High School (9–12)", value: 100, total: 450, color: "#00d4ff" },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/70">{item.label}</span>
                    <span className="font-mono text-xs" style={{ color: item.color }}>{item.value}</span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full">
                    <div className="h-full rounded-full" style={{ width: `${(item.value / item.total) * 100}%`, background: item.color }} />
                  </div>
                </div>
              ))}
              <div className="border-t border-white/10 pt-4 text-center">
                <div className="font-display text-4xl font-black cyber-text">
                  <AnimatedCounter target={450} suffix="+" />
                </div>
                <div className="text-white/50 text-sm">Total Students Reached</div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Testimonials */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <span className="font-mono text-xs tracking-widest text-violet-400 border border-violet-400/30 px-3 py-1 rounded-full bg-violet-400/5 mb-4 inline-block">
              TESTIMONIALS
            </span>
            <h2 className="section-title">What People Are <span className="text-violet-400">Saying</span></h2>
          </div>
          <TestimonialsCarousel />
        </div>

        {/* Photo placeholders */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <Image size={20} className="text-teal-400" />
            <h2 className="font-display text-2xl font-bold">Workshop Gallery</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="glass rounded-xl border border-white/10 aspect-square flex flex-col items-center justify-center text-white/20 hover:border-white/20 transition-all">
                <Image size={28} className="mb-2 opacity-30" />
                <span className="text-xs font-mono">Photo {i + 1}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-white/30 text-xs mt-4 font-mono">Workshop photos coming soon</p>
        </div>

        {/* Success stories */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <Award size={20} className="text-yellow-400" />
            <h2 className="font-display text-2xl font-bold">Success Stories</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                title: "Jefferson High RL Deep Dive",
                desc: "12 high school students became so interested in Reinforcement Learning that their teacher integrated a Python coding lab using Stage 3 materials into the semester curriculum.",
                tag: "High School · Ongoing Impact",
                color: "text-cyan-400",
              },
              {
                title: "Lincoln Middle — Highest Quiz Scores",
                desc: "After the 60-minute Sensor workshop, 94% of 7th graders passed a post-quiz on AI basics with a score of 80% or higher — up from 41% on the pre-quiz.",
                tag: "Middle School · 53-point improvement",
                color: "text-violet-400",
              },
              {
                title: "Community Night at Riverside Library",
                desc: "A Saturday community event drew 80+ adults and families who learned about smart city AI and cybersecurity — the most diverse audience reached by the project.",
                tag: "Community Event · 80+ attendees",
                color: "text-teal-400",
              },
              {
                title: "District-Wide Resource Adoption",
                desc: "San Diego Unified STEM Coordinator Dr. Kim approved the AI Lesson Plans for optional district-wide distribution to 40+ middle school science teachers.",
                tag: "District Adoption · 40+ teachers",
                color: "text-yellow-400",
              },
            ].map(story => (
              <GlassCard key={story.title}>
                <span className={`font-mono text-xs mb-2 block ${story.color}`}>{story.tag}</span>
                <h3 className="font-display text-lg font-bold mb-2">{story.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{story.desc}</p>
              </GlassCard>
            ))}
          </div>
        </div>

        <NewsletterSignup />
      </div>
    </div>
  );
}
