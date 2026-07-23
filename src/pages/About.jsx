// pages/About.jsx
import { Award, Target, Calendar, Leaf, Star, ChevronRight } from "lucide-react";
import SectionHeader from "../components/ui/SectionHeader";
import GlassCard from "../components/ui/GlassCard";

const TIMELINE = [
  { date: "Spring 2025", title: "Project Conceived", desc: "Identified AI literacy gap in K–12 education as the Gold Award community issue to address.", color: "#00d4ff" },
  { date: "Summer 2025", title: "Python Simulations Built", desc: "Developed Stage 1 (Fixed Timer) and Stage 2 (Induction Loop) Jupyter notebooks with full Poisson arrival models.", color: "#7c3aed" },
  { date: "Aug 2025", title: "First School Workshops", desc: "Piloted the curriculum at two San Diego middle schools, reaching 80 students in the first month.", color: "#14b8a6" },
  { date: "Fall 2025", title: "Stage 3 AI/RL Added", desc: "Completed the Reinforcement Learning Q-learning simulation (Stage 3) and expanded to high schools.", color: "#f59e0b" },
  { date: "Winter 2025", title: "Resource Library Launched", desc: "Published 8 free downloadable resources for teachers, aligned with NGSS and CS education standards.", color: "#00d4ff" },
  { date: "Spring 2026", title: "Community Events Begin", desc: "Expanded beyond schools to public libraries and community centers, reaching adult learners.", color: "#7c3aed" },
  { date: "May 2026", title: "Website Launched", desc: "This interactive website launched with browser-based simulations, making the project accessible nationally.", color: "#14b8a6" },
];

export default function About() {
  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-4xl mx-auto">
        <SectionHeader
          tag="My Story"
          title="About This"
          highlight="Gold Award Project"
          subtitle="The mission, the founder, and the vision for AI education that outlasts the award."
        />

        {/* Gold Award explanation */}
        <GlassCard color="violet" hover={false} className="mb-8">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-violet-400/10 border border-violet-400/30 flex items-center justify-center flex-shrink-0">
              <Award size={28} className="text-violet-400" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold mb-3">The Girl Scout Gold Award</h2>
              <p className="text-white/70 leading-relaxed mb-3">
                The Gold Award is the highest achievement in Girl Scouting, recognized nationally as equivalent to the Eagle Scout rank in Boy Scouts. Fewer than 6% of eligible Girl Scouts earn it.
              </p>
              <p className="text-white/70 leading-relaxed mb-3">
                To earn the Gold Award, a Girl Scout must: identify a real problem in her community, design a sustainable solution, lead the entire project, and demonstrate lasting, measurable impact.
              </p>
              <p className="text-white/70 leading-relaxed">
                This project, which teaches AI literacy through interactive traffic simulations and cybersecurity education, represents over 80 hours of work and impacts hundreds of students across San Diego County.
              </p>
            </div>
          </div>
        </GlassCard>

        {/* About the founder */}
        <GlassCard color="cyber" hover={false} className="mb-8">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-2xl bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center flex-shrink-0 text-3xl">
              👩‍💻
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold mb-1">Shriya Paladugu</h2>
              <p className="font-mono text-xs text-cyan-400 mb-1">
                Founder, AI on the Streets
              </p>
              <p className="font-mono text-xs text-white/50 mb-3">
                Girl Scout · STEM Student · Community Educator
              </p>
              <p className="text-white/70 leading-relaxed mb-3">
                As a high school student passionate about computer science and community impact, I noticed that most students in my area had little exposure to artificial intelligence, even as AI was reshaping cities, healthcare, and careers.
              </p>
              <p className="text-white/70 leading-relaxed mb-3">
                I built the three-stage traffic simulation from scratch in Python (starting with simple queue models and growing to Reinforcement Learning), then designed an entire curriculum to make these concepts accessible to students from kindergarten through 12th grade.
              </p>
              <p className="text-white/70 leading-relaxed">
                My goal: every student who attends a workshop leaves understanding that AI isn't magic; it's math, data, and decisions. They can be the ones building it.
              </p>
            </div>
          </div>
        </GlassCard>

        {/* Mission */}
        <div className="glass p-8 rounded-2xl border border-teal-400/20 mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Target size={20} className="text-teal-400" />
            <h3 className="font-display text-xl font-bold">Mission Statement</h3>
          </div>
          <blockquote className="text-white/80 text-lg leading-relaxed italic border-l-2 border-teal-400 pl-4">
            "To close the AI literacy gap in K–12 education by bringing hands-on, research-grounded simulations and workshops directly to students across San Diego County, making the future of technology visible, understandable, and achievable for every young person."
          </blockquote>
        </div>

        {/* Timeline */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-8">
            <Calendar size={20} className="text-cyan-400" />
            <h2 className="font-display text-2xl font-bold">Project Timeline</h2>
          </div>
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-cyan-400/50 via-violet-400/30 to-transparent" />
            <div className="space-y-6">
              {TIMELINE.map((item, i) => (
                <div key={i} className="flex gap-6 pl-12 relative">
                  {/* Dot */}
                  <div
                    className="absolute left-2 top-1.5 w-4 h-4 rounded-full border-2 flex-shrink-0"
                    style={{ borderColor: item.color, background: item.color + "33" }}
                  />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-1">
                      <span
                        className="font-mono text-xs px-2 py-0.5 rounded"
                        style={{ color: item.color, background: item.color + "22" }}
                      >
                        {item.date}
                      </span>
                      <span className="font-display text-sm font-bold">{item.title}</span>
                    </div>
                    <p className="text-white/50 text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sustainability plan */}
        <div className="glass p-8 rounded-2xl border border-violet-400/20 mb-12">
          <div className="flex items-center gap-3 mb-6">
            <Leaf size={20} className="text-teal-400" />
            <h3 className="font-display text-2xl font-bold">Future Sustainability Plan</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: "Open-Source Notebooks", desc: "All three Python simulation notebooks will be published on GitHub for free use by educators worldwide.", color: "text-cyan-400" },
              { title: "Teacher Training", desc: "Training a cohort of teachers to deliver workshops independently, removing reliance on a single presenter.", color: "text-violet-400" },
              { title: "School Integration", desc: "Working with SDUSD to integrate the AI Traffic unit into existing 7th-grade computer science curriculum.", color: "text-teal-400" },
              { title: "Community Handoff", desc: "Partnering with local STEM nonprofits to continue workshops after the Gold Award period concludes.", color: "text-yellow-400" },
            ].map(item => (
              <div key={item.title} className="glass p-4 rounded-xl border border-white/10">
                <ChevronRight size={14} className={`${item.color} mb-1`} />
                <h4 className={`font-display text-sm font-bold mb-1 ${item.color}`}>{item.title}</h4>
                <p className="text-white/60 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Acknowledgments */}
        <div className="text-center glass p-8 rounded-2xl border border-white/10">
          <Star size={28} className="text-yellow-400 mx-auto mb-3" />
          <h3 className="font-display text-xl font-bold mb-3">Acknowledgments</h3>
          <p className="text-white/60 leading-relaxed max-w-2xl mx-auto">
            Thank you to all the teachers, principals, and community partners who opened their doors, to my Girl Scout troop and mentors for their encouragement, and to every student who asked a great question during a workshop. You're the reason this project exists.
          </p>
          <p className="font-mono text-xs text-cyan-400 mt-5">
            Created and led by Shriya Paladugu
          </p>
        </div>
      </div>
    </div>
  );
}