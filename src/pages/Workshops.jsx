// pages/Workshops.jsx
import { useState } from "react";
import { GraduationCap, Clock, CheckCircle, Users, ChevronDown, ChevronUp, Send, Loader2, AlertCircle } from "lucide-react";
import workshopsData from "../data/workshops.json";
import SectionHeader from "../components/ui/SectionHeader";
import GlassCard from "../components/ui/GlassCard";
import { submitWorkshopRequest } from "../lib/supabase";

const COLOR = {
  teal: { text: "text-teal-400", border: "border-teal-400/30", bg: "bg-teal-400/10" },
  violet: { text: "text-violet-400", border: "border-violet-400/30", bg: "bg-violet-400/10" },
  cyber: { text: "text-cyan-400", border: "border-cyan-400/30", bg: "bg-cyan-400/10" },
};

function WorkshopCard({ workshop }) {
  const [open, setOpen] = useState(false);
  const color = COLOR[workshop.color] || COLOR.cyber;
  return (
    <div className={`glass rounded-2xl border transition-all duration-300 ${open ? `${color.border}` : "border-white/10"}`}>
      <div className="p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className={`font-mono text-xs mb-1 ${color.text}`}>{workshop.level} · Grades {workshop.grades}</div>
            <h3 className="font-display text-xl font-bold">{workshop.title}</h3>
          </div>
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-mono ${color.bg} ${color.text} border ${color.border} flex-shrink-0`}>
            <Clock size={12} />{workshop.duration}
          </div>
        </div>
        <p className="text-white/60 text-sm leading-relaxed mb-4">{workshop.description}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
          {workshop.outcomes.slice(0, 2).map(o => (
            <div key={o} className="flex items-start gap-2 text-xs text-white/50">
              <CheckCircle size={12} className={`${color.text} mt-0.5 flex-shrink-0`} />
              <span>{o}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => setOpen(!open)}
          className={`flex items-center gap-2 text-sm font-display tracking-wide transition-colors ${color.text}`}
        >
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          {open ? "Show less" : "View full agenda & outcomes"}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/10 p-6 space-y-6">
          <div>
            <h4 className="font-display text-sm tracking-widest text-white/50 uppercase mb-3">Learning Outcomes</h4>
            <ul className="space-y-2">
              {workshop.outcomes.map(o => (
                <li key={o} className="flex items-start gap-2 text-sm text-white/70">
                  <CheckCircle size={14} className={`${color.text} mt-0.5 flex-shrink-0`} />
                  {o}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display text-sm tracking-widest text-white/50 uppercase mb-3">Sample Agenda</h4>
            <div className="space-y-2">
              {workshop.agenda.map((item, i) => (
                <div key={i} className="flex gap-4 text-sm">
                  <span className={`font-mono text-xs ${color.text} flex-shrink-0 w-20 pt-0.5`}>{item.time}</span>
                  <span className="text-white/70">{item.activity}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const REQUIRED = ["name", "org", "email", "grade"];

function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = "Name is required.";
  if (!form.org.trim()) errors.org = "Organization is required.";
  if (!form.email.trim()) {
    errors.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = "Please enter a valid email address.";
  }
  if (!form.grade) errors.grade = "Please select a grade level.";
  return errors;
}

function RequestForm() {
  const [form, setForm] = useState({ name: "", org: "", email: "", grade: "", students: "", date: "", message: "" });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [submittedName, setSubmittedName] = useState("");

  const set = (k) => (e) => {
    setForm(f => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors(err => ({ ...err, [k]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setStatus("loading");
    setSubmittedName(form.name);
    try {
      const result = await submitWorkshopRequest({
        name: form.name.trim(),
        organization: form.org.trim(),
        email: form.email.trim(),
        gradeLevel: form.grade,
        numStudents: form.students,
        preferredDate: form.date,
        message: form.message.trim(),
      });
      if (result.ok) {
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  const handleRetry = () => {
    setStatus("idle");
    setErrors({});
  };

  if (status === "success") {
    return (
      <div className="glass p-12 rounded-2xl border border-teal-400/30 text-center">
        <CheckCircle size={48} className="text-teal-400 mx-auto mb-4" />
        <h3 className="font-display text-2xl font-bold mb-2">Request Received!</h3>
        <p className="text-white/60">Thank you, {submittedName}! We'll be in touch within 48 hours to confirm your workshop details.</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="glass p-12 rounded-2xl border border-red-400/30 text-center">
        <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
        <h3 className="font-display text-2xl font-bold mb-2">Something went wrong</h3>
        <p className="text-white/60 mb-6">We couldn't submit your request. Your information has been saved locally — please try again.</p>
        <button onClick={handleRetry} className="btn-cyber">Try Again</button>
      </div>
    );
  }

  const fieldClass = (key) =>
    `input-field ${errors[key] ? "border-red-400/60 focus:border-red-400" : ""}`;

  return (
    <form onSubmit={handleSubmit} noValidate className="glass p-6 md:p-8 rounded-2xl border border-cyan-400/20 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Name */}
        <div>
          <label className="font-mono text-xs text-white/50 mb-1 block">Your Name *</label>
          <input
            value={form.name}
            onChange={set("name")}
            placeholder="Jane Smith"
            className={fieldClass("name")}
            disabled={status === "loading"}
          />
          {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
        </div>

        {/* Organization */}
        <div>
          <label className="font-mono text-xs text-white/50 mb-1 block">Organization / School *</label>
          <input
            value={form.org}
            onChange={set("org")}
            placeholder="Lincoln Middle School"
            className={fieldClass("org")}
            disabled={status === "loading"}
          />
          {errors.org && <p className="text-red-400 text-xs mt-1">{errors.org}</p>}
        </div>

        {/* Email */}
        <div>
          <label className="font-mono text-xs text-white/50 mb-1 block">Email *</label>
          <input
            type="email"
            value={form.email}
            onChange={set("email")}
            placeholder="teacher@school.edu"
            className={fieldClass("email")}
            disabled={status === "loading"}
          />
          {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
        </div>

        {/* Grade Level */}
        <div>
          <label className="font-mono text-xs text-white/50 mb-1 block">Grade Level *</label>
          <select
            value={form.grade}
            onChange={set("grade")}
            className={fieldClass("grade")}
            disabled={status === "loading"}
          >
            <option value="" disabled>Select level</option>
            <option>Elementary (K–5)</option>
            <option>Middle School (6–8)</option>
            <option>High School (9–12)</option>
            <option>Community Event</option>
          </select>
          {errors.grade && <p className="text-red-400 text-xs mt-1">{errors.grade}</p>}
        </div>

        {/* Audience Size */}
        <div>
          <label className="font-mono text-xs text-white/50 mb-1 block">Audience Size</label>
          <input
            type="number"
            min="1"
            value={form.students}
            onChange={set("students")}
            placeholder="25"
            className="input-field"
            disabled={status === "loading"}
          />
        </div>

        {/* Preferred Date */}
        <div>
          <label className="font-mono text-xs text-white/50 mb-1 block">Preferred Date</label>
          <input
            type="date"
            value={form.date}
            onChange={set("date")}
            className="input-field"
            disabled={status === "loading"}
          />
        </div>
      </div>

      {/* Message */}
      <div>
        <label className="font-mono text-xs text-white/50 mb-1 block">Message</label>
        <textarea
          value={form.message}
          onChange={set("message")}
          rows={4}
          placeholder="Any special requirements, topics you'd like emphasized, accessibility needs, etc."
          className="input-field resize-none"
          disabled={status === "loading"}
        />
      </div>

      <button
        type="submit"
        disabled={status === "loading"}
        className="btn-cyber w-full flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {status === "loading" ? (
          <><Loader2 size={16} className="animate-spin" /> Submitting…</>
        ) : (
          <><Send size={16} /> Submit Workshop Request</>
        )}
      </button>

      <p className="text-center text-xs text-white/30">All workshops are free of charge. We typically respond within 48 hours.</p>
    </form>
  );
}

export default function Workshops() {
  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-4xl mx-auto">
        <SectionHeader
          tag="School Programs"
          title="Free"
          highlight="AI Workshops"
          subtitle="Tailored for every grade level — from traffic light games for K–5 to Reinforcement Learning for high schoolers."
        />

        <div className="space-y-6 mb-20">
          {workshopsData.map(w => <WorkshopCard key={w.id} workshop={w} />)}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-20">
          {[
            { icon: GraduationCap, label: "Free for All Schools", desc: "No cost to students, teachers, or schools", color: "text-cyan-400" },
            { icon: Users, label: "Any Class Size", desc: "Works for 10 students or 200 — we adapt", color: "text-violet-400" },
            { icon: CheckCircle, label: "Curriculum-Aligned", desc: "Meets NGSS and CS education standards", color: "text-teal-400" },
          ].map(item => (
            <div key={item.label} className="glass p-6 rounded-2xl border border-white/10 text-center">
              <item.icon size={28} className={`${item.color} mx-auto mb-3`} />
              <div className="font-display text-sm font-bold mb-1">{item.label}</div>
              <div className="text-white/50 text-xs">{item.desc}</div>
            </div>
          ))}
        </div>

        <div id="request-form">
          <div className="text-center mb-8">
            <span className="font-mono text-xs tracking-widest text-cyan-400 border border-cyan-400/30 px-3 py-1 rounded-full bg-cyan-400/5 mb-4 inline-block">
              BOOK A WORKSHOP
            </span>
            <h2 className="section-title">Request a <span className="cyber-text">Free Workshop</span></h2>
          </div>
          <RequestForm />
        </div>
      </div>
    </div>
  );
}
