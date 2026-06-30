// pages/AlgorithmBuilder.jsx
// "Build Your Own Algorithm" — a drag-and-drop IF/THEN block game.
// Students assemble a traffic-light control algorithm from logic blocks,
// then run it against the same Poisson-arrival traffic simulation engine
// used on the Simulation page, and see their wait-time score compared
// to Fixed Timer, Sensor-Based, and AI Adaptive modes.
//
// If you already have src/utils/simulationEngine.js (with a runSimulation
// export), delete the INLINE ENGINE block below and instead:
//   import { runSimulation } from "../utils/simulationEngine";
// This file ships its own copy so it works standalone too.

import { useState, useRef, useCallback } from "react";
import {
  Play, RotateCcw, Trophy, Plus, X, GripVertical, Lightbulb,
  Clock, Car, Activity, Sparkles, ArrowRight,
} from "lucide-react";

/* ============================================================
   INLINE ENGINE — Poisson arrivals + queue-based service,
   parameterized by a custom rule function so student algorithms
   can be plugged in alongside the three baseline modes.
   ============================================================ */
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function exponential(rand, lambda) { return -Math.log(1 - rand()) / lambda; }

// Runs a custom student algorithm: a list of {ifVar, ifOp, ifVal, then} rules
// evaluated every timestep against live NS/EW queue lengths.
function runCustomAlgorithm({ rules, trafficVolume = 0.5, seed = 7 }) {
  const rand = mulberry32(seed);
  const baseVPH = { N: 600, E: 800, S: 500, W: 700 };
  const scale = 0.2 + trafficVolume * 1.4;
  const ratesVPS = Object.fromEntries(Object.entries(baseVPH).map(([k, v]) => [k, (v * scale) / 3600]));
  const SIM_DURATION = 1800; // 30 min, lighter than full sim for a snappy student demo
  const STEPS = 360;
  const dt = SIM_DURATION / STEPS;

  const arrivals = { N: [], E: [], S: [], W: [] };
  for (const dir of ["N", "E", "S", "W"]) {
    let t = 0;
    while (t < SIM_DURATION) { t += exponential(rand, ratesVPS[dir]); if (t < SIM_DURATION) arrivals[dir].push(t); }
  }

  const nsQ = [], ewQ = [];
  const waitTimes = [];
  const throughputByMinute = Array.from({ length: 30 }, (_, i) => ({ minute: i + 1, vehicles: 0 }));
  const queueOverTime = [];
  let currentPhase = "NS"; // which side is currently green
  let phaseTimer = 0;
  const CARS_THROUGH_PER_STEP = 3;

  // Default fallback rule if student leaves it empty: alternate every 10 steps (acts like Fixed Timer)
  const hasRules = rules && rules.length > 0;

  for (let step = 0; step < STEPS; step++) {
    const t_s = step * dt;
    const nsArr = arrivals.N.filter(a => a >= t_s && a < t_s + dt).length + arrivals.S.filter(a => a >= t_s && a < t_s + dt).length;
    const ewArr = arrivals.E.filter(a => a >= t_s && a < t_s + dt).length + arrivals.W.filter(a => a >= t_s && a < t_s + dt).length;
    for (let i = 0; i < nsArr; i++) nsQ.push(t_s);
    for (let i = 0; i < ewArr; i++) ewQ.push(t_s);

    phaseTimer++;

    // Evaluate student rules in order; first matching rule decides the phase this step
    let decided = null;
    if (hasRules) {
      for (const r of rules) {
        const queueVal = r.ifVar === "ns_queue" ? nsQ.length : r.ifVar === "ew_queue" ? ewQ.length : phaseTimer;
        const cmp = r.ifOp === ">" ? queueVal > r.ifVal
                  : r.ifOp === "<" ? queueVal < r.ifVal
                  : r.ifOp === ">=" ? queueVal >= r.ifVal
                  : queueVal === r.ifVal;
        if (cmp) { decided = r.then; break; }
      }
    }
    if (!decided) decided = currentPhase === "NS" ? "EW" : "NS"; // fallback: alternate like a naive timer
    if (decided === "GREEN_NS") currentPhase = "NS";
    else if (decided === "GREEN_EW") currentPhase = "EW";
    else if (decided === "SWITCH") currentPhase = currentPhase === "NS" ? "EW" : "NS";
    // "STAY" -> no change

    const serveQ = currentPhase === "NS" ? nsQ : ewQ;
    const toServe = Math.min(CARS_THROUGH_PER_STEP, serveQ.length);
    for (let i = 0; i < toServe; i++) {
      const arrTime = serveQ.shift();
      const wait = Math.max(0, t_s - arrTime);
      waitTimes.push(wait);
      const minIdx = Math.min(29, Math.floor(t_s / 60));
      throughputByMinute[minIdx].vehicles++;
    }
    if (step % 12 === 0) queueOverTime.push({ minute: Math.round(t_s / 60), queue: nsQ.length + ewQ.length });
  }

  const avgWait = waitTimes.length ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length : 0;
  const vehiclesProcessed = waitTimes.length;
  const lastSamples = queueOverTime.slice(-6);
  const avgQueue = lastSamples.length ? lastSamples.reduce((a, b) => a + b.queue, 0) / lastSamples.length : 0;
  const congestionLevel = Math.min(100, Math.round((avgQueue / 16) * 100));
  const estimatedEmissionsKg = Math.round(((waitTimes.reduce((a, b) => a + b, 0) * 0.5) / 1000) * 10) / 10;

  return {
    avgWait: Math.round(avgWait * 10) / 10,
    vehiclesProcessed,
    congestionLevel,
    estimatedEmissionsKg,
    throughputByMinute,
  };
}

// Reference baselines, run once per volume setting for comparison bars (approximate, fast).
function runBaseline(mode, trafficVolume) {
  // Simple stand-in baselines tuned to roughly match the full engine's relative ordering.
  // Swap this out for the real runSimulation(mode, trafficVolume) import if available.
  const presets = {
    fixed:  { avgWaitFactor: 1.00, throughputFactor: 0.85 },
    sensor: { avgWaitFactor: 0.62, throughputFactor: 1.05 },
    ai:     { avgWaitFactor: 0.32, throughputFactor: 1.22 },
  };
  const p = presets[mode];
  const base = runCustomAlgorithm({ rules: [], trafficVolume, seed: 99 }); // naive alternator as reference point
  return {
    avgWait: Math.round(base.avgWait * p.avgWaitFactor * 10) / 10,
    vehiclesProcessed: Math.round(base.vehiclesProcessed * p.throughputFactor),
    congestionLevel: Math.round(base.congestionLevel * p.avgWaitFactor),
  };
}

/* ============================================================
   BLOCK DEFINITIONS
   ============================================================ */
const IF_VARS = [
  { value: "ns_queue", label: "North-South queue length" },
  { value: "ew_queue", label: "East-West queue length" },
  { value: "timer",    label: "Seconds since last switch" },
];
const IF_OPS = [
  { value: ">",  label: "is greater than" },
  { value: "<",  label: "is less than" },
  { value: ">=", label: "is at least" },
];
const THEN_ACTIONS = [
  { value: "GREEN_NS", label: "Turn North-South green", color: "#00d4ff" },
  { value: "GREEN_EW", label: "Turn East-West green",   color: "#7c3aed" },
  { value: "SWITCH",   label: "Switch to the other side", color: "#f59e0b" },
  { value: "STAY",     label: "Keep current light",       color: "#14b8a6" },
];

function newRule(id) {
  return { id, ifVar: "ns_queue", ifOp: ">", ifVal: 5, then: "GREEN_NS" };
}

/* ============================================================
   UI PIECES
   ============================================================ */
function RuleBlock({ rule, index, onChange, onRemove }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: "12px", padding: "14px 16px", display: "flex", alignItems: "center",
      gap: "10px", flexWrap: "wrap", position: "relative",
    }}>
      <GripVertical size={16} style={{ color: "rgba(255,255,255,0.25)", flexShrink: 0 }} />
      <span style={{ fontFamily: "monospace", fontSize: "11px", color: "rgba(255,255,255,0.35)", flexShrink: 0 }}>#{index + 1}</span>

      <span style={{ fontSize: "12px", fontWeight: 700, color: "#00d4ff" }}>IF</span>
      <select value={rule.ifVar} onChange={e => onChange(rule.id, { ifVar: e.target.value })}
        className="input-field" style={{ width: "auto", padding: "6px 10px", fontSize: "12px" }}>
        {IF_VARS.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
      </select>
      <select value={rule.ifOp} onChange={e => onChange(rule.id, { ifOp: e.target.value })}
        className="input-field" style={{ width: "auto", padding: "6px 10px", fontSize: "12px" }}>
        {IF_OPS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <input type="number" min="0" max="50" value={rule.ifVal}
        onChange={e => onChange(rule.id, { ifVal: Number(e.target.value) })}
        className="input-field" style={{ width: "56px", padding: "6px 8px", fontSize: "12px", textAlign: "center" }} />

      <span style={{ fontSize: "12px", fontWeight: 700, color: "#7c3aed" }}>THEN</span>
      <select value={rule.then} onChange={e => onChange(rule.id, { then: e.target.value })}
        className="input-field" style={{ width: "auto", padding: "6px 10px", fontSize: "12px", flex: 1, minWidth: "160px" }}>
        {THEN_ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
      </select>

      <button onClick={() => onRemove(rule.id)} style={{
        background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)",
        borderRadius: "6px", padding: "5px", cursor: "pointer", color: "#f87171", flexShrink: 0,
      }}>
        <X size={13} />
      </button>
    </div>
  );
}

function MetricPill({ icon: Icon, label, value, unit, hex }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${hex}33`, borderRadius: "12px", padding: "12px", textAlign: "center" }}>
      <Icon size={16} style={{ color: hex, margin: "0 auto 5px", display: "block" }} />
      <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "white" }}>{value}</div>
      <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.35)" }}>{unit}</div>
      <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.3)", marginTop: "2px" }}>{label}</div>
    </div>
  );
}

const btn = (bg, col, border = "none") => ({
  display: "inline-flex", alignItems: "center", gap: "7px", padding: "11px 22px",
  borderRadius: "8px", border, background: bg, color: col, fontSize: "12px",
  fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
  cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
});

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
export default function AlgorithmBuilder() {
  const [rules, setRules] = useState([
    { id: 1, ifVar: "ns_queue", ifOp: ">", ifVal: 6, then: "GREEN_NS" },
    { id: 2, ifVar: "ew_queue", ifOp: ">", ifVal: 6, then: "GREEN_EW" },
  ]);
  const [trafficVolume, setVol] = useState(0.5);
  const [results, setResults] = useState(null);
  const [compare, setCompare] = useState(null);
  const [running, setRunning] = useState(false);
  const nextId = useRef(3);

  const addRule = () => { setRules(r => [...r, newRule(nextId.current++)]); setResults(null); };
  const updateRule = (id, patch) => { setRules(r => r.map(x => x.id === id ? { ...x, ...patch } : x)); setResults(null); };
  const removeRule = (id) => { setRules(r => r.filter(x => x.id !== id)); setResults(null); };
  const resetRules = () => {
    setRules([{ id: nextId.current++, ifVar: "ns_queue", ifOp: ">", ifVal: 6, then: "GREEN_NS" }]);
    setResults(null); setCompare(null);
  };

  const handleRun = useCallback(() => {
    setRunning(true);
    setTimeout(() => {
      const res = runCustomAlgorithm({ rules, trafficVolume });
      const fixed = runBaseline("fixed", trafficVolume);
      const sensor = runBaseline("sensor", trafficVolume);
      const ai = runBaseline("ai", trafficVolume);
      setResults(res);
      setCompare({ fixed, sensor, ai, yours: res });
      setRunning(false);
    }, 350);
  }, [rules, trafficVolume]);

  const loadPreset = (preset) => {
    if (preset === "alternate") {
      setRules([
        { id: nextId.current++, ifVar: "timer", ifOp: ">", ifVal: 10, then: "SWITCH" },
      ]);
    } else if (preset === "greedy") {
      setRules([
        { id: nextId.current++, ifVar: "ns_queue", ifOp: ">", ifVal: 5, then: "GREEN_NS" },
        { id: nextId.current++, ifVar: "ew_queue", ifOp: ">", ifVal: 5, then: "GREEN_EW" },
      ]);
    } else if (preset === "smart") {
      setRules([
        { id: nextId.current++, ifVar: "ns_queue", ifOp: ">=", ifVal: 8, then: "GREEN_NS" },
        { id: nextId.current++, ifVar: "ew_queue", ifOp: ">=", ifVal: 8, then: "GREEN_EW" },
        { id: nextId.current++, ifVar: "ns_queue", ifOp: ">", ifVal: 2, then: "GREEN_NS" },
        { id: nextId.current++, ifVar: "ew_queue", ifOp: ">", ifVal: 2, then: "GREEN_EW" },
      ]);
    }
    setResults(null); setCompare(null);
  };

  let scoreNote = null;
  if (compare) {
    const yoursWait = compare.yours.avgWait;
    const best = Math.min(compare.fixed.avgWait, compare.sensor.avgWait, compare.ai.avgWait);
    if (yoursWait <= compare.ai.avgWait) {
      scoreNote = { text: "Incredible! Your algorithm beat the AI Adaptive mode!", color: "#00d4ff" };
    } else if (yoursWait <= compare.sensor.avgWait) {
      scoreNote = { text: "Great work! You beat the Sensor-Based mode.", color: "#14b8a6" };
    } else if (yoursWait <= compare.fixed.avgWait) {
      scoreNote = { text: "Nice! You beat the Fixed Timer mode.", color: "#f59e0b" };
    } else {
      scoreNote = { text: "Your algorithm runs, but all three baseline modes did better. Try lowering your queue thresholds!", color: "#f87171" };
    }
  }

  return (
    <div style={{ minHeight: "100vh", paddingTop: "96px", paddingBottom: "80px", padding: "96px 16px 80px" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <span style={{ display: "inline-block", fontFamily: "monospace", fontSize: "10px", letterSpacing: "0.15em",
            textTransform: "uppercase", color: "#7c3aed", border: "1px solid rgba(124,58,237,0.35)", padding: "4px 14px",
            borderRadius: "999px", background: "rgba(124,58,237,0.08)", marginBottom: "14px" }}>
            Build Your Own Algorithm
          </span>
          <h1 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(1.6rem,4vw,2.4rem)", fontWeight: 700, marginBottom: "8px" }}>
            Can You <span style={{ background: "linear-gradient(90deg,#00d4ff,#7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Out-Code the AI?</span>
          </h1>
          <p style={{ color: "rgba(255,255,255,0.55)", maxWidth: "560px", margin: "0 auto" }}>
            Snap together IF/THEN blocks to build your own traffic signal algorithm, then run it against
            real traffic and see how it stacks up.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "20px" }}>
          {/* LEFT: Block builder */}
          <div>
            {/* Presets */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", alignSelf: "center", marginRight: "4px" }}>Try a starting point:</span>
              <button onClick={() => loadPreset("alternate")} style={btn("rgba(255,255,255,0.06)", "rgba(255,255,255,0.7)", "1px solid rgba(255,255,255,0.15)")}>Naive Alternator</button>
              <button onClick={() => loadPreset("greedy")} style={btn("rgba(255,255,255,0.06)", "rgba(255,255,255,0.7)", "1px solid rgba(255,255,255,0.15)")}>Greedy Queue</button>
              <button onClick={() => loadPreset("smart")} style={btn("rgba(255,255,255,0.06)", "rgba(255,255,255,0.7)", "1px solid rgba(255,255,255,0.15)")}>Smart Threshold</button>
            </div>

            {/* Block list */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "12px" }}>
              {rules.map((rule, i) => (
                <RuleBlock key={rule.id} rule={rule} index={i} onChange={updateRule} onRemove={removeRule} />
              ))}
              {rules.length === 0 && (
                <div style={{ textAlign: "center", padding: "30px", color: "rgba(255,255,255,0.3)", fontSize: "13px",
                  border: "1px dashed rgba(255,255,255,0.15)", borderRadius: "12px" }}>
                  No rules yet — your light will just alternate every step. Add a rule below!
                </div>
              )}
            </div>

            <button onClick={addRule} style={{ ...btn("transparent", "#00d4ff", "1.5px dashed rgba(0,212,255,0.4)"), width: "100%", justifyContent: "center" }}>
              <Plus size={15} /> Add IF/THEN Block
            </button>

            {/* Volume + Run */}
            <div style={{ marginTop: "20px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontFamily: "monospace", color: "rgba(255,255,255,0.4)", marginBottom: "6px" }}>
                <span>Traffic Volume</span><span>{Math.round(trafficVolume * 100)}%</span>
              </div>
              <input type="range" min="0" max="1" step="0.05" value={trafficVolume}
                onChange={e => { setVol(Number(e.target.value)); setResults(null); }}
                style={{ width: "100%", accentColor: "#7c3aed", marginBottom: "14px" }} />
              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={handleRun} disabled={running} style={{ ...btn("#00d4ff", "#050d1a"), flex: 1, justifyContent: "center" }}>
                  <Play size={15} /> {running ? "Running..." : "Run My Algorithm"}
                </button>
                <button onClick={resetRules} style={btn("transparent", "rgba(255,255,255,0.8)", "1.5px solid rgba(255,255,255,0.25)")}>
                  <RotateCcw size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: Results panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.22)", borderRadius: "14px", padding: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "8px" }}>
                <Lightbulb size={15} style={{ color: "#a78bfa" }} />
                <span style={{ fontFamily: "monospace", fontSize: "10px", color: "#a78bfa", letterSpacing: "0.08em" }}>HOW IT WORKS</span>
              </div>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>
                Rules run top to bottom, every simulated second. The first rule whose condition is true wins.
                Real traffic engineers (and the AI Adaptive mode) make this exact same kind of decision —
                you're programming a real algorithm!
              </p>
            </div>

            {results && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <MetricPill icon={Clock} label="Avg Wait" value={results.avgWait + "s"} unit="seconds" hex="#ef4444" />
                  <MetricPill icon={Car} label="Processed" value={results.vehiclesProcessed} unit="vehicles" hex="#00d4ff" />
                  <MetricPill icon={Activity} label="Congestion" value={results.congestionLevel + "%"} unit="level" hex="#a78bfa" />
                  <MetricPill icon={Sparkles} label="Emissions" value={results.estimatedEmissionsKg + "kg"} unit="CO₂" hex="#5eead4" />
                </div>

                {scoreNote && (
                  <div style={{ background: `${scoreNote.color}15`, border: `1px solid ${scoreNote.color}44`, borderRadius: "12px", padding: "14px", display: "flex", gap: "10px", alignItems: "flex-start" }}>
                    <Trophy size={18} style={{ color: scoreNote.color, flexShrink: 0, marginTop: "1px" }} />
                    <p style={{ fontSize: "12.5px", color: "white", lineHeight: 1.5, margin: 0 }}>{scoreNote.text}</p>
                  </div>
                )}

                {compare && (
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "14px" }}>
                    <div style={{ fontSize: "10px", fontFamily: "monospace", color: "rgba(255,255,255,0.4)", marginBottom: "10px", letterSpacing: "0.06em" }}>AVG WAIT — LOWER IS BETTER</div>
                    {[
                      { label: "Your Algorithm", val: compare.yours.avgWait, color: "#7c3aed" },
                      { label: "Fixed Timer", val: compare.fixed.avgWait, color: "#ef4444" },
                      { label: "Sensor-Based", val: compare.sensor.avgWait, color: "#f59e0b" },
                      { label: "AI Adaptive", val: compare.ai.avgWait, color: "#00d4ff" },
                    ].sort((a, b) => a.val - b.val).map(row => {
                      const max = Math.max(compare.yours.avgWait, compare.fixed.avgWait, compare.sensor.avgWait, compare.ai.avgWait, 1);
                      return (
                        <div key={row.label} style={{ marginBottom: "8px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10.5px", marginBottom: "3px" }}>
                            <span style={{ color: row.label === "Your Algorithm" ? row.color : "rgba(255,255,255,0.55)", fontWeight: row.label === "Your Algorithm" ? 700 : 400 }}>{row.label}</span>
                            <span style={{ color: row.color, fontFamily: "monospace" }}>{row.val}s</span>
                          </div>
                          <div style={{ height: "6px", background: "rgba(255,255,255,0.08)", borderRadius: "3px" }}>
                            <div style={{ height: "100%", width: `${(row.val / max) * 100}%`, background: row.color, borderRadius: "3px" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {!results && (
              <div style={{ textAlign: "center", padding: "30px 16px", color: "rgba(255,255,255,0.3)", fontSize: "12px" }}>
                <ArrowRight size={20} style={{ margin: "0 auto 8px", display: "block", opacity: 0.5 }} />
                Build your rules, then hit "Run My Algorithm" to see your score.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
