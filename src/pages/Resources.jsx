// pages/Resources.jsx
import { useState } from "react";
import { Search, Download, ExternalLink, FileText, Brain, Shield, Briefcase, Layers, Scale, Presentation } from "lucide-react";import resourcesData from "../data/resources.json";
import SectionHeader from "../components/ui/SectionHeader";

const ICON_MAP = { FileText, Brain, Shield, Briefcase, Layers, Scale, Presentation };
const CATEGORIES = ["All", "Workshop Slides", "Activity Sheets", "AI Lesson Plans", "Cybersecurity Handouts", "STEM Career Resources"];
const COLOR = {
  "Workshop Slides":        { text: "text-cyan-400",   border: "border-cyan-400/30",   bg: "bg-cyan-400/10"   },
  "Activity Sheets":        { text: "text-teal-400",   border: "border-teal-400/30",   bg: "bg-teal-400/10"   },
  "AI Lesson Plans":        { text: "text-violet-400", border: "border-violet-400/30", bg: "bg-violet-400/10" },
  "Cybersecurity Handouts": { text: "text-red-400",    border: "border-red-400/30",    bg: "bg-red-400/10"    },
  "STEM Career Resources":  { text: "text-yellow-400", border: "border-yellow-400/30", bg: "bg-yellow-400/10" },
};

function ResourceCard({ resource }) {
  const Icon = ICON_MAP[resource.icon] || FileText;
  const color = COLOR[resource.category] || COLOR["Workshop Slides"];
  return (
    <div className="glass rounded-2xl border border-white/10 hover:border-white/20 p-6
                    transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(0,0,0,0.3)]
                    flex flex-col">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color.bg} border ${color.border}`}>
          <Icon size={20} className={color.text} />
        </div>
        <div className="flex-1 min-w-0">
          <span className={`text-xs font-mono ${color.text} block mb-1`}>{resource.category}</span>
          <h3 className="font-display text-sm font-bold leading-tight">{resource.title}</h3>
        </div>
      </div>

      <p className="text-white/60 text-sm leading-relaxed flex-1 mb-4">{resource.description}</p>

      {/* Audience tags */}
      <div className="flex flex-wrap gap-1 mb-4">
        {resource.audience.map(a => (
          <span key={a} className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/40 font-mono">
            {a}
          </span>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-white/10 pt-4">
        <div className="flex items-center gap-3 text-xs text-white/30 font-mono">
          <span>{resource.format}</span>
          <span>·</span>
          <span>{resource.size}</span>
        </div>
{resource.url ? (
  <a
    href={resource.url}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center gap-1.5 text-xs font-display tracking-wide px-3 py-1.5
               rounded-lg bg-white/5 border border-white/10 text-white/60
               hover:border-cyan-400/40 hover:text-cyan-400 transition-all duration-200"
  >
    <ExternalLink size={12} />
    {resource.buttonText || "Open"}
  </a>
) : resource.file ? (
  <a
    href={resource.file}
    download
    className="flex items-center gap-1.5 text-xs font-display tracking-wide px-3 py-1.5
               rounded-lg bg-white/5 border border-white/10 text-white/60
               hover:border-cyan-400/40 hover:text-cyan-400 transition-all duration-200"
  >
    <Download size={12} />
    {resource.buttonText || "Download"}
  </a>
) : (
  <button
    onClick={() => alert("Download coming soon — resources are being finalized!")}
    className="flex items-center gap-1.5 text-xs font-display tracking-wide px-3 py-1.5
               rounded-lg bg-white/5 border border-white/10 text-white/60
               hover:border-cyan-400/40 hover:text-cyan-400 transition-all duration-200"
  >
    <Download size={12} />
    Coming Soon
  </button>
)}
      </div>
    </div>
  );
}

export default function Resources() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const filtered = resourcesData.filter(r => {
    const matchCat = category === "All" || r.category === category;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      r.title.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.tags.some(t => t.toLowerCase().includes(q));
    return matchCat && matchSearch;
  });

  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          tag="Free Downloads"
          title="Educational"
          highlight="Resources"
          subtitle="Lesson plans, activity sheets, slides, and career guides — all free for teachers and students."
        />

        {/* Search + filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search resources..."
              className="input-field pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-4 py-2 rounded-lg text-xs font-display tracking-wide transition-all duration-200 ${
                  category === cat
                    ? "bg-cyan-400/20 border border-cyan-400/40 text-cyan-400"
                    : "bg-white/5 border border-white/10 text-white/50 hover:border-white/30"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        <p className="text-white/30 font-mono text-xs mb-6">
          {filtered.length} resource{filtered.length !== 1 ? "s" : ""} found
        </p>

        {/* Grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(r => <ResourceCard key={r.id} resource={r} />)}
          </div>
        ) : (
          <div className="text-center py-20 text-white/30">
            <Search size={40} className="mx-auto mb-4 opacity-30" />
            <p>No resources match your search. Try different keywords.</p>
          </div>
        )}

        {/* Request custom resource */}
        <div className="mt-16 glass p-8 rounded-2xl border border-violet-400/20 text-center">
          <h3 className="font-display text-xl font-bold mb-2">Need Something Specific?</h3>
          <p className="text-white/60 mb-6">Request a custom lesson plan or activity sheet tailored to your curriculum.</p>
          <a href="mailto:aionthestreets@example.com" className="btn-violet inline-flex items-center gap-2">
            Request a Custom Resource
          </a>
        </div>
      </div>
    </div>
  );
}
