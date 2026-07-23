// pages/Certificate.jsx
// Lets students generate a downloadable certificate after completing
// a quiz track, and tracks badge progress across all 3 learning areas.
// Badge state persists in localStorage so it survives a page refresh.

import { useState, useEffect } from "react";
import { Download, Brain, ShieldCheck, TrafficCone, Check, HelpCircle } from "lucide-react";

const TRACKS = {
  ai:    { title: "AI Explorer",        sub: "has completed the Learn AI knowledge check",                 color: "#534AB7", light: "#EEEDFE" },
  cyber: { title: "Cyber Defender",     sub: "has completed the Cybersecurity knowledge check",             color: "#A32D2D", light: "#FCEBEB" },
  sim:   { title: "Traffic Engineer",   sub: "has completed the AI Traffic Simulation challenge",           color: "#0F6E56", light: "#E1F5EE" },
  all:   { title: "Gold Award Graduate",sub: "has completed all three AI on the Streets learning tracks",   color: "#854F0B", light: "#FAEEDA" },
};

const BADGES = [
  { key: "ai",    label: "AI Explorer",      Icon: Brain,        color: "#534AB7", light: "#EEEDFE" },
  { key: "cyber", label: "Cyber Defender",   Icon: ShieldCheck,  color: "#A32D2D", light: "#FCEBEB" },
  { key: "sim",   label: "Traffic Engineer", Icon: TrafficCone,  color: "#0F6E56", light: "#E1F5EE" },
];

function esc(str) {
  return (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildCertSvg(name, trackKey) {
  const track = TRACKS[trackKey];
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const displayName = name.trim() || "Your Name Here";
  return `
    <svg viewBox="0 0 600 420" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="600" height="420" fill="white"/>
      <rect x="14" y="14" width="572" height="392" fill="none" stroke="${track.color}" stroke-width="2"/>
      <rect x="22" y="22" width="556" height="376" fill="none" stroke="${track.color}" stroke-width="0.75"/>
      <circle cx="300" cy="78" r="26" fill="${track.light}" stroke="${track.color}" stroke-width="1.5"/>
      <path d="M 300 64 L 308 76 L 300 88 L 292 76 Z" fill="${track.color}"/>
      <text x="300" y="130" text-anchor="middle" font-size="13" letter-spacing="3" fill="${track.color}" font-weight="600" font-family="Arial">CERTIFICATE OF ACHIEVEMENT</text>
      <text x="300" y="160" text-anchor="middle" font-size="11" fill="#5F5E5A" font-family="Arial">AI on the Streets: Girl Scout Gold Award Project</text>
      <line x1="220" y1="180" x2="380" y2="180" stroke="${track.color}" stroke-width="0.75"/>
      <text x="300" y="225" text-anchor="middle" font-size="26" font-weight="600" fill="#2C2C2A" font-family="Arial">${esc(displayName)}</text>
      <text x="300" y="255" text-anchor="middle" font-size="13" fill="#444441" font-family="Arial">${esc(track.sub)}</text>
      <rect x="220" y="278" width="160" height="28" rx="14" fill="${track.light}"/>
      <text x="300" y="296" text-anchor="middle" font-size="12" font-weight="600" fill="${track.color}" font-family="Arial">${esc(track.title)}</text>
      <line x1="120" y1="360" x2="240" y2="360" stroke="#888780" stroke-width="0.75"/>
      <text x="180" y="378" text-anchor="middle" font-size="10" fill="#5F5E5A" font-family="Arial">Date</text>
      <text x="180" y="350" text-anchor="middle" font-size="10" fill="#2C2C2A" font-family="Arial">${date}</text>
      <line x1="360" y1="360" x2="480" y2="360" stroke="#888780" stroke-width="0.75"/>
      <text x="420" y="378" text-anchor="middle" font-size="10" fill="#5F5E5A" font-family="Arial">Program Lead</text>
      <text x="420" y="350" text-anchor="middle" font-size="11" font-family="cursive" fill="#2C2C2A">AI on the Streets</text>
    </svg>`;
}

export default function Certificate() {
  const [tab, setTab] = useState("cert");
  const [name, setName] = useState("");
  const [trackKey, setTrackKey] = useState("ai");
  const [badges, setBadges] = useState({ ai: false, cyber: false, sim: false });

  // Load badge progress from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("aiOnTheStreets_badges");
      if (saved) setBadges(JSON.parse(saved));
    } catch (e) { /* ignore corrupt storage */ }
  }, []);

  const toggleBadge = (key) => {
    const next = { ...badges, [key]: !badges[key] };
    setBadges(next);
    try { localStorage.setItem("aiOnTheStreets_badges", JSON.stringify(next)); } catch (e) {}
  };

  const completedCount = Object.values(badges).filter(Boolean).length;

  const handleDownload = () => {
    const svgString = buildCertSvg(name, trackKey);
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(name.trim() || "certificate").replace(/\s+/g, "-")}-certificate.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const track = TRACKS[trackKey];

  return (
    <div style={{ minHeight: "100vh", paddingTop: "96px", paddingBottom: "80px", padding: "96px 16px 80px" }}>
      <div style={{ maxWidth: "720px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "2rem", fontWeight: 700, marginBottom: "8px" }}>
            Certificates &amp; <span style={{ color: "#00d4ff" }}>Badges</span>
          </h1>
          <p style={{ color: "rgba(255,255,255,0.55)" }}>Show off what you've learned</p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid rgba(255,255,255,0.1)", marginBottom: "24px" }}>
          {[["cert", "Certificate"], ["badge", "Badge Tracker"]].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                padding: "10px 4px", background: "none", border: "none", cursor: "pointer",
                fontSize: "14px", fontWeight: 600, color: tab === key ? "#00d4ff" : "rgba(255,255,255,0.4)",
                borderBottom: tab === key ? "2px solid #00d4ff" : "2px solid transparent", marginRight: "16px",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "cert" && (
          <div>
            <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
              <input
                type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Student's full name" className="input-field" style={{ flex: 1, minWidth: "180px" }}
              />
<select
  value={trackKey}
  onChange={(e) => setTrackKey(e.target.value)}
  className="input-field"
  style={{ minWidth: "220px" }}
>
  <option value="ai">AI Explorer: Learn AI quiz</option>
  <option value="cyber">Cyber Defender: Cybersecurity quiz</option>
  <option value="sim">Traffic Engineer: Simulation challenge</option>
  <option value="all">Gold Award Graduate: All three learning tracks</option>
</select>
            </div>

            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "16px", padding: "24px", display: "flex", justifyContent: "center" }}>
              <div style={{ width: "100%", maxWidth: "560px" }} dangerouslySetInnerHTML={{ __html: buildCertSvg(name, trackKey) }} />
            </div>

            <button
              onClick={handleDownload}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%", marginTop: "16px",
                padding: "13px", background: "#00d4ff", color: "#050d1a", border: "none", borderRadius: "10px",
                fontSize: "13px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer" }}
            >
              <Download size={16} /> Download Certificate
            </button>
          </div>
        )}

        {tab === "badge" && (
          <div>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.55)", marginBottom: "16px" }}>
              Check off what you've completed to track progress toward all three badges. Your progress is saved on this device.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "20px" }}>
              {BADGES.map(({ key, label, Icon, color, light }) => {
                const done = badges[key];
                return (
                  <button
                    key={key}
                    onClick={() => toggleBadge(key)}
                    style={{
                      textAlign: "left", padding: "16px", display: "flex", flexDirection: "column", gap: "8px",
                      border: `1px solid ${done ? color : "rgba(255,255,255,0.12)"}`,
                      background: done ? light + "22" : "rgba(255,255,255,0.04)",
                      borderRadius: "12px", cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <Icon size={24} style={{ color: done ? color : "rgba(255,255,255,0.35)" }} />
                      {done && <Check size={16} style={{ color }} />}
                    </div>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: done ? color : "white" }}>{label}</div>
                    <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>{done ? "Completed" : "Tap when done"}</div>
                  </button>
                );
              })}
            </div>
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "12px", padding: "16px", display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ fontSize: "24px", fontWeight: 700, color: "white" }}>{completedCount} / 3</div>
              <div style={{ flex: 1, height: "8px", background: "rgba(255,255,255,0.08)", borderRadius: "4px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(completedCount / 3) * 100}%`, background: "#00d4ff", transition: "width 0.3s" }} />
              </div>
            </div>
            {completedCount === 3 && (
              <p style={{ marginTop: "12px", fontSize: "13px", color: "#14b8a6", textAlign: "center" }}>
                All three badges complete! Switch to the Certificate tab and select "Gold Award Graduate" to download your final certificate.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
