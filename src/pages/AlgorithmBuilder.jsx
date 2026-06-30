// pages/AlgorithmBuilder.jsx
// "Build Your Own Algorithm", students assemble a real traffic-signal
// switching policy and run it against the EXACT same simulation engine
// (TrafficIntersectionEnv) used in Smart_Signals_FINAL_Qlearning_Better_Validated.ipynb.
//
// ── WHY THIS STRUCTURE ──────────────────────────────────────────────────
// Every real controller in the notebook (Fixed Timer, Induction Loop,
// Q-Learning RL) makes its switch decision through the SAME safety-gated
// threshold structure:
//
//   1. Can't switch during yellow/all-red (lost time)
//   2. Can't switch before minimum green has elapsed
//   3. MUST switch if maximum green is reached and the other side has cars
//   4. MUST switch if your side is empty and the other side has cars
//   5. SHOULD switch if the other side's queue beats yours by `threshold`
//   6. SHOULD switch if anyone on the other side has waited `starvation`s
//
// The Q-Learning agent doesn't invent new rules, it LEARNS the best
// value for `threshold` (the imbalance trigger) through trial and error.
// So "build your own algorithm" means: let students set these same six
// real parameters and see how their choices perform, exactly mirroring
// what the RL agent is actually optimizing in the notebook.
// ──────────────────────────────────────────────────────────────────────

import { useState, useCallback } from "react";
import {
  Play, RotateCcw, Trophy, Lightbulb, Clock, Car, Activity,
  Wind, ArrowRight, Settings2, AlertTriangle, CheckCircle2,
} from "lucide-react";

/* ============================================================
   REAL ENGINE, ported 1:1 from TrafficIntersectionEnv in the
   validated notebook. Same Poisson arrivals, same one-vehicle-
   per-green-direction-per-second service, same 4s lost time on
   switch, same wait-time definition.
   ============================================================ */

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Poisson sample via Knuth's algorithm, matches np.random.poisson behavior
function poisson(rand, lambda) {
  if (lambda <= 0) return 0;
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= rand(); } while (p > L);
  return k - 1;
}

const DIRECTIONS = ["N", "E", "S", "W"];
const SIM_DURATION = 3600;     // 1 simulated hour, same as notebook
const YELLOW_ALL_RED = 4;      // lost-time seconds on every switch
const BASE_RATES_HR = { N: 600, E: 800, S: 500, W: 700 }; // vehicles/hour, same as notebook

// trafficVolume (0–1 slider) scales the notebook's base demand up/down
// 0.5 = notebook's exact validated demand
function scaledRates(trafficVolume) {
  const scale = 0.3 + trafficVolume * 1.4; // 0.5 → 1.0x (matches notebook baseline)
  return Object.fromEntries(
    Object.entries(BASE_RATES_HR).map(([d, vph]) => [d, (vph * scale) / 3600])
  );
}

/**
 * Runs one full 3600-second simulation against a "decide" function.
 * decide(envState) -> boolean (true = switch phase now)
 * This is an exact behavioral port of TrafficIntersectionEnv.step()
 * and run_controller() from the notebook.
 */
function runController(decideFn, { trafficVolume = 0.5, seed = 0 } = {}) {
  const rand = mulberry32(seed);
  const rates = scaledRates(trafficVolume);

  let phase = 0;               // 0 = NS green, 1 = EW green
  let timeInPhase = 0;
  let lostTimeRemaining = 0;
  let switches = 0;
  let generatedArrivals = 0;

  const queues = { N: [], E: [], S: [], W: [] };
  const waitTimes = [];
  const departures = [];       // { t, dir }
  const queueSamples = [];

  const greenDirs = () => (phase === 0 ? ["N", "S"] : ["E", "W"]);
  const crossDirs = () => (phase === 0 ? ["E", "W"] : ["N", "S"]);

  const phaseQueue = () => greenDirs().reduce((s, d) => s + queues[d].length, 0);
  const crossQueue = () => crossDirs().reduce((s, d) => s + queues[d].length, 0);
  const crossMaxWait = (t) => {
    let maxWait = 0;
    for (const d of crossDirs()) {
      if (queues[d].length) maxWait = Math.max(maxWait, t - queues[d][0]);
    }
    return maxWait;
  };

  for (let t = 0; t < SIM_DURATION; t++) {
    // ── Ask the decision function whether to switch this second ─────────
    const envState = {
      t, phase, timeInPhase, lostTimeRemaining,
      phaseQueue: phaseQueue(),
      crossQueue: crossQueue(),
      crossMaxWait: crossMaxWait(t),
    };
    const wantsSwitch = lostTimeRemaining > 0 ? false : decideFn(envState);

    if (wantsSwitch) {
      phase = 1 - phase;
      timeInPhase = 0;
      lostTimeRemaining = YELLOW_ALL_RED;
      switches++;
    }

    // ── Generate Poisson arrivals for this second ────────────────────────
    for (const d of DIRECTIONS) {
      const n = poisson(rand, rates[d]);
      for (let i = 0; i < n; i++) { queues[d].push(t); generatedArrivals++; }
    }

    // ── Serve vehicles (one per green direction, unless in lost time) ───
    if (lostTimeRemaining > 0) {
      lostTimeRemaining--;
    } else {
      for (const d of greenDirs()) {
        if (queues[d].length) {
          const arrivalTime = queues[d].shift();
          waitTimes.push(t - arrivalTime);
          departures.push({ t, dir: d });
        }
      }
    }

    queueSamples.push(DIRECTIONS.reduce((s, d) => s + queues[d].length, 0));
    t_increment: {
      timeInPhase++;
    }
  }

  const totalQueue = DIRECTIONS.reduce((s, d) => s + queues[d].length, 0);
  const avgWait = waitTimes.length ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length : 0;
  const sortedWaits = [...waitTimes].sort((a, b) => a - b);
  const p95Wait = sortedWaits.length ? sortedWaits[Math.floor(sortedWaits.length * 0.95)] : 0;
  const maxWait = sortedWaits.length ? sortedWaits[sortedWaits.length - 1] : 0;
  const avgTotalQueue = queueSamples.reduce((a, b) => a + b, 0) / queueSamples.length;
  const maxTotalQueue = Math.max(...queueSamples, 0);
  const throughput = Math.round((departures.length * 3600) / SIM_DURATION);

  // Throughput-by-minute, for the chart
  const throughputByMinute = Array.from({ length: 60 }, (_, i) => ({
    minute: i + 1,
    vehicles: departures.filter(d => d.t >= i * 60 && d.t < (i + 1) * 60).length,
  }));

  return {
    avgWait: Math.round(avgWait * 10) / 10,
    medianWait: sortedWaits.length ? sortedWaits[Math.floor(sortedWaits.length / 2)] : 0,
    p95Wait: Math.round(p95Wait),
    maxWait: Math.round(maxWait),
    avgTotalQueue: Math.round(avgTotalQueue * 10) / 10,
    maxTotalQueue,
    vehiclesProcessed: departures.length,
    throughput,
    switches,
    generatedArrivals,
    unservedVehicles: totalQueue,
    congestionLevel: Math.min(100, Math.round((avgTotalQueue / 12) * 100)),
    estimatedEmissionsKg: Math.round(((waitTimes.reduce((a, b) => a + b, 0) * 0.5) / 1000) * 10) / 10,
    throughputByMinute,
  };
}

/* ============================================================
   BASELINE CONTROLLERS, exact ports of the notebook's three
   real controllers, used for the comparison bars.
   ============================================================ */

function fixedTimerDecide(greenTime) {
  return (env) => env.timeInPhase >= greenTime;
}

function inductionLoopDecide({ minGreen, maxGreen, imbalanceThreshold, starvationWait }) {
  return (env) => {
    if (env.timeInPhase < minGreen) return false;
    if (env.timeInPhase >= maxGreen && env.crossQueue > 0) return true;
    if (env.phaseQueue === 0 && env.crossQueue > 0) return true;
    if (env.crossQueue >= env.phaseQueue + imbalanceThreshold) return true;
    if (env.crossMaxWait >= starvationWait) return true;
    return false;
  };
}

// This is literally what the Q-Learning agent learned to deploy,
// same structure as InductionLoop, but with its own learned threshold (8).
// (Notebook's "Learned deployment threshold: 8" from training output.)
function qLearningDecide({ minGreen = 8, maxGreen = 45, threshold = 8, starvationWait = 24 } = {}) {
  return (env) => {
    if (env.timeInPhase < minGreen) return false;
    if (env.timeInPhase >= maxGreen && env.crossQueue > 0) return true;
    if (env.phaseQueue === 0 && env.crossQueue > 0) return true;
    if (env.crossQueue >= env.phaseQueue + threshold) return true;
    if (env.crossMaxWait >= starvationWait) return true;
    return false;
  };
}

/* ============================================================
   STUDENT ALGORITHM, built from the SAME six real parameters
   every notebook controller uses. This is the honest version of
   "build your own algorithm": you're tuning the exact knobs a
   real traffic engineer (and the RL agent) tunes, not inventing
   a different kind of rule entirely.
   ============================================================ */

function studentDecide(params) {
  const { minGreen, maxGreen, imbalanceThreshold, starvationWait, switchWhenEmpty } = params;
  return (env) => {
    if (env.timeInPhase < minGreen) return false;
    if (env.timeInPhase >= maxGreen && env.crossQueue > 0) return true;
    if (switchWhenEmpty && env.phaseQueue === 0 && env.crossQueue > 0) return true;
    if (env.crossQueue >= env.phaseQueue + imbalanceThreshold) return true;
    if (env.crossMaxWait >= starvationWait) return true;
    return false;
  };
}

const DEFAULT_PARAMS = {
  minGreen: 10,
  maxGreen: 45,
  imbalanceThreshold: 6,
  starvationWait: 25,
  switchWhenEmpty: true,
};

const PRESETS = {
  rigid: {
    label: "Rigid Timer",
    desc: "No adaptivity, just switch every 30s no matter what.",
    params: { minGreen: 30, maxGreen: 30, imbalanceThreshold: 999, starvationWait: 999, switchWhenEmpty: false },
  },
  twitchy: {
    label: "Twitchy Switcher",
    desc: "Switches the instant the other side has even 1 more car. Lots of wasted yellow time.",
    params: { minGreen: 4, maxGreen: 20, imbalanceThreshold: 1, starvationWait: 8, switchWhenEmpty: true },
  },
  balanced: {
    label: "Balanced (notebook's Induction Loop)",
    desc: "The exact parameters the notebook's real Sensor-Based controller uses.",
    params: { minGreen: 10, maxGreen: 45, imbalanceThreshold: 4, starvationWait: 25, switchWhenEmpty: true },
  },
  learned: {
    label: "Learned Threshold (Q-Learning's answer)",
    desc: "The exact threshold (8) the Q-Learning agent converged on after 500 training episodes.",
    params: { minGreen: 8, maxGreen: 45, imbalanceThreshold: 8, starvationWait: 24, switchWhenEmpty: true },
  },
};

/* ============================================================
   UI PIECES
   ============================================================ */

function ParamSlider({ label, value, min, max, step = 1, unit, onChange, color, help }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "4px" }}>
        <label style={{ fontSize: "12.5px", color: "#1a1a2e", fontWeight: 600 }}>{label}</label>
        <span style={{ fontFamily: "monospace", fontSize: "12px", color, fontWeight: 700 }}>{value}{unit}</span>
      </div>
      {help && <p style={{ fontSize: "10.5px", color: "#64748b", marginBottom: "6px", lineHeight: 1.4 }}>{help}</p>}
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: color }}
      />
    </div>
  );
}

function ToggleRow({ label, help, value, onChange, color }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "16px" }}>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: "38px", height: "22px", borderRadius: "11px", border: "none", cursor: "pointer",
          background: value ? color : "#cbd5e1", position: "relative", flexShrink: 0, marginTop: "1px",
          transition: "background 0.2s",
        }}
      >
        <div style={{
          width: "16px", height: "16px", borderRadius: "50%", background: "white",
          position: "absolute", top: "3px", left: value ? "19px" : "3px", transition: "left 0.2s",
        }} />
      </button>
      <div>
        <div style={{ fontSize: "12.5px", color: "#1a1a2e", fontWeight: 600 }}>{label}</div>
        {help && <div style={{ fontSize: "10.5px", color: "#64748b", lineHeight: 1.4 }}>{help}</div>}
      </div>
    </div>
  );
}

function MetricPill({ icon: Icon, label, value, unit, hex }) {
  return (
    <div style={{ background: "#f8fafc", border: `1px solid ${hex}33`, borderRadius: "12px", padding: "12px", textAlign: "center" }}>
      <Icon size={16} style={{ color: hex, margin: "0 auto 5px", display: "block" }} />
      <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "#1a1a2e" }}>{value}</div>
      <div style={{ fontSize: "9px", color: "#94a3b8" }}>{unit}</div>
      <div style={{ fontSize: "9px", color: "#94a3b8", marginTop: "2px" }}>{label}</div>
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
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [trafficVolume, setVol] = useState(0.5);
  const [results, setResults] = useState(null);
  const [compare, setCompare] = useState(null);
  const [running, setRunning] = useState(false);
  const [activePreset, setActivePreset] = useState(null);

  const setParam = (key) => (val) => {
    setParams(p => ({ ...p, [key]: val }));
    setResults(null); setCompare(null); setActivePreset(null);
  };

  const loadPreset = (key) => {
    setParams(PRESETS[key].params);
    setActivePreset(key);
    setResults(null); setCompare(null);
  };

  const resetParams = () => {
    setParams(DEFAULT_PARAMS);
    setActivePreset(null);
    setResults(null); setCompare(null);
  };

  const handleRun = useCallback(() => {
    setRunning(true);
    setTimeout(() => {
      const seed = 42; // same seed the notebook uses, for apples-to-apples comparison

      const yours  = runController(studentDecide(params), { trafficVolume, seed });
      const fixed  = runController(fixedTimerDecide(30), { trafficVolume, seed });
      const sensor = runController(inductionLoopDecide({ minGreen: 10, maxGreen: 45, imbalanceThreshold: 4, starvationWait: 25 }), { trafficVolume, seed });
      const ai     = runController(qLearningDecide({ minGreen: 8, maxGreen: 45, threshold: 8, starvationWait: 24 }), { trafficVolume, seed });

      setResults(yours);
      setCompare({ yours, fixed, sensor, ai });
      setRunning(false);
    }, 50);
  }, [params, trafficVolume]);

  let scoreNote = null;
  if (compare) {
    const yoursWait = compare.yours.avgWait;
    if (yoursWait <= compare.ai.avgWait) {
      scoreNote = { text: "Outstanding! Your algorithm matched or beat the Q-Learning RL controller, the same one that took 500 training episodes to learn its threshold.", color: "#00d4ff", icon: Trophy };
    } else if (yoursWait <= compare.sensor.avgWait) {
      scoreNote = { text: "Great tuning! You beat the notebook's real Sensor-Based (Induction Loop) controller.", color: "#14b8a6", icon: CheckCircle2 };
    } else if (yoursWait <= compare.fixed.avgWait) {
      scoreNote = { text: "Nice work, you beat the rigid Fixed Timer baseline. Try lowering your imbalance threshold to react faster.", color: "#f59e0b", icon: CheckCircle2 };
    } else {
      scoreNote = { text: "Your algorithm runs, but all three real baselines did better. Try: lower minGreen, lower imbalanceThreshold, or turn on 'switch when empty'.", color: "#f87171", icon: AlertTriangle };
    }
  }

  const compareRows = compare ? [
    { label: "Your Algorithm", val: compare.yours.avgWait, color: "#7c3aed" },
    { label: "Fixed Timer (notebook)", val: compare.fixed.avgWait, color: "#ef4444" },
    { label: "Sensor-Based (notebook)", val: compare.sensor.avgWait, color: "#f59e0b" },
    { label: "AI Adaptive (notebook)", val: compare.ai.avgWait, color: "#00d4ff" },
  ].sort((a, b) => a.val - b.val) : [];

  return (
    <div style={{ minHeight: "100vh", padding: "96px 16px 80px" }}>
      <div style={{ maxWidth: "1140px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <span style={{
            display: "inline-block", fontFamily: "monospace", fontSize: "10px", letterSpacing: "0.15em",
            textTransform: "uppercase", color: "#7c3aed", border: "1px solid rgba(124,58,237,0.35)", padding: "4px 14px",
            borderRadius: "999px", background: "rgba(124,58,237,0.08)", marginBottom: "14px",
          }}>
            Build Your Own Algorithm
          </span>
          <h1 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(1.6rem,4vw,2.4rem)", fontWeight: 700, marginBottom: "8px", color: "#1a1a2e" }}>
            Can You{" "}
            <span style={{ background: "linear-gradient(90deg,#00d4ff,#7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              Out-Tune the RL Agent?
            </span>
          </h1>
          <p style={{ color: "#475569", maxWidth: "620px", margin: "0 auto", fontSize: "13.5px", lineHeight: 1.6 }}>
            You're setting the exact same six parameters every controller in our research notebook uses,
            the same parameters the Q-Learning agent spent 500 training episodes searching through.
            Tune them, run a real 1-hour simulation, and see if you can beat the AI.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "20px" }}>
          {/* LEFT: Parameter controls */}
          <div>
            {/* Presets */}
            <div style={{ marginBottom: "18px" }}>
              <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "8px", fontFamily: "monospace" }}>
                TRY A REAL-WORLD STARTING POINT
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {Object.entries(PRESETS).map(([key, p]) => (
                  <button key={key} onClick={() => loadPreset(key)}
                    style={{
                      textAlign: "left", padding: "10px 12px", borderRadius: "10px",
                      border: activePreset === key ? "1.5px solid #7c3aed" : "1px solid #e2e8f0",
                      background: activePreset === key ? "rgba(124,58,237,0.1)" : "#f8fafc",
                      cursor: "pointer", fontFamily: "inherit",
                    }}>
                    <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#1a1a2e", marginBottom: "2px" }}>{p.label}</div>
                    <div style={{ fontSize: "10px", color: "#64748b", lineHeight: 1.4 }}>{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Parameter sliders, exactly the real controller's knobs */}
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "16px" }}>
                <Settings2 size={15} style={{ color: "#7c3aed" }} />
                <span style={{ fontFamily: "monospace", fontSize: "11px", color: "#6d28d9", letterSpacing: "0.06em" }}>
                  YOUR SWITCHING POLICY
                </span>
              </div>

              <ParamSlider
                label="Minimum Green Time"
                help="The light can't switch before this many seconds, prevents flickering."
                value={params.minGreen} min={3} max={30} unit="s" color="#00d4ff"
                onChange={setParam("minGreen")}
              />
              <ParamSlider
                label="Maximum Green Time"
                help="Force a switch after this many seconds if the other side has any cars waiting."
                value={params.maxGreen} min={params.minGreen} max={60} unit="s" color="#7c3aed"
                onChange={setParam("maxGreen")}
              />
              <ParamSlider
                label="Imbalance Threshold"
                help="Switch once the other side's queue beats yours by this many cars. Lower = more reactive, but more wasted yellow time."
                value={params.imbalanceThreshold} min={0} max={20} unit=" cars" color="#f59e0b"
                onChange={setParam("imbalanceThreshold")}
              />
              <ParamSlider
                label="Starvation Wait Limit"
                help="Force a switch if anyone on the other side has been waiting this long, prevents anyone getting stuck forever."
                value={params.starvationWait} min={5} max={60} unit="s" color="#f87171"
                onChange={setParam("starvationWait")}
              />
              <ToggleRow
                label="Switch when my side is empty"
                help="If your green side has zero cars and the other side has any, switch immediately, don't waste green time on nobody."
                value={params.switchWhenEmpty} color="#14b8a6"
                onChange={setParam("switchWhenEmpty")}
              />
            </div>

            {/* Volume + Run */}
            <div style={{ marginTop: "16px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontFamily: "monospace", color: "#64748b", marginBottom: "6px" }}>
                <span>Traffic Volume</span><span>{Math.round(trafficVolume * 100)}% {trafficVolume === 0.5 ? "(notebook's exact demand)" : ""}</span>
              </div>
              <input type="range" min="0" max="1" step="0.05" value={trafficVolume}
                onChange={e => { setVol(Number(e.target.value)); setResults(null); setCompare(null); }}
                style={{ width: "100%", accentColor: "#7c3aed", marginBottom: "14px" }} />
              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={handleRun} disabled={running} style={{ ...btn("#00d4ff", "#050d1a"), flex: 1, justifyContent: "center" }}>
                  <Play size={15} /> {running ? "Simulating 1 hour…" : "Run 1-Hour Simulation"}
                </button>
                <button onClick={resetParams} style={btn("transparent", "#1a1a2e", "1.5px solid #cbd5e1")}>
                  <RotateCcw size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: Results panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.22)", borderRadius: "14px", padding: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "8px" }}>
                <Lightbulb size={15} style={{ color: "#6d28d9" }} />
                <span style={{ fontFamily: "monospace", fontSize: "10px", color: "#6d28d9", letterSpacing: "0.08em" }}>WHY THESE 5 KNOBS?</span>
              </div>
              <p style={{ fontSize: "11.5px", color: "#475569", lineHeight: 1.6, margin: 0 }}>
                Every controller in our research, Fixed Timer, Sensor-Based, and the Q-Learning AI,
                makes its switch decision using these exact same five rules. The only thing that changes
                between them is the <em>values</em>. The Q-Learning agent ran 500 training episodes just to
                find the best <strong>Imbalance Threshold</strong>, you're doing the same search by hand.
              </p>
            </div>

            {results && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <MetricPill icon={Clock} label="Avg Wait" value={results.avgWait + "s"} unit="seconds" hex="#ef4444" />
                  <MetricPill icon={Car} label="Processed" value={results.vehiclesProcessed.toLocaleString()} unit="vehicles" hex="#00d4ff" />
                  <MetricPill icon={Activity} label="Congestion" value={results.congestionLevel + "%"} unit="queue-based" hex="#6d28d9" />
                  <MetricPill icon={Wind} label="Emissions" value={results.estimatedEmissionsKg + "kg"} unit="CO₂ equiv." hex="#5eead4" />
                </div>

                {scoreNote && (
                  <div style={{ background: `${scoreNote.color}15`, border: `1px solid ${scoreNote.color}44`, borderRadius: "12px", padding: "14px", display: "flex", gap: "10px", alignItems: "flex-start" }}>
                    <scoreNote.icon size={18} style={{ color: scoreNote.color, flexShrink: 0, marginTop: "1px" }} />
                    <p style={{ fontSize: "12px", color: "#1a1a2e", lineHeight: 1.5, margin: 0 }}>{scoreNote.text}</p>
                  </div>
                )}

                {compare && (
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "14px" }}>
                    <div style={{ fontSize: "10px", fontFamily: "monospace", color: "#64748b", marginBottom: "10px", letterSpacing: "0.06em" }}>
                      AVG WAIT vs REAL NOTEBOOK CONTROLLERS (LOWER IS BETTER)
                    </div>
                    {compareRows.map(row => {
                      const max = Math.max(...compareRows.map(r => r.val), 1);
                      return (
                        <div key={row.label} style={{ marginBottom: "8px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10.5px", marginBottom: "3px" }}>
                            <span style={{ color: row.label === "Your Algorithm" ? row.color : "#475569", fontWeight: row.label === "Your Algorithm" ? 700 : 400 }}>
                              {row.label}
                            </span>
                            <span style={{ color: row.color, fontFamily: "monospace" }}>{row.val}s</span>
                          </div>
                          <div style={{ height: "6px", background: "#e2e8f0", borderRadius: "3px" }}>
                            <div style={{ height: "100%", width: `${(row.val / max) * 100}%`, background: row.color, borderRadius: "3px", transition: "width 0.4s" }} />
                          </div>
                        </div>
                      );
                    })}
                    <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px solid #e2e8f0", fontSize: "9.5px", color: "#94a3b8", fontFamily: "monospace" }}>
                      Same Poisson arrival model, same seed, same 3600s simulation as the validated notebook.
                    </div>
                  </div>
                )}
              </>
            )}

            {!results && (
              <div style={{ textAlign: "center", padding: "30px 16px", color: "#94a3b8", fontSize: "12px" }}>
                <ArrowRight size={20} style={{ margin: "0 auto 8px", display: "block", opacity: 0.5 }} />
                Adjust the sliders, then hit "Run 1-Hour Simulation" to see your real wait-time score.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}