// pages/Simulation.jsx
// Interactive 4-way intersection simulation with three AI modes
// Based on actual Stage 1, 2, 3 Python notebook algorithms

import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, RotateCcw, Zap, Clock, Car, Wind, Activity, Info } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { runSimulation } from "../utils/simulationEngine";
import SectionHeader from "../components/ui/SectionHeader";
import GlassCard from "../components/ui/GlassCard";

// ─────────────────────────────────────────────────────────────────────────────
// Mode config — unchanged
// ─────────────────────────────────────────────────────────────────────────────
const MODES = [
  {
    id: "fixed",
    label: "Mode A",
    name: "Fixed Timer",
    tagline: "Traditional 30s/30s NS-EW cycle",
    color: "#ef4444",
    colorClass: "text-red-400",
    borderClass: "border-red-400/40",
    bgClass: "bg-red-500/10",
    description: "Fixed-timer signals switch on a rigid schedule (30s NS, 30s EW) regardless of actual traffic. Based on Stage 1 of the Gold Award Python simulation using Poisson vehicle arrivals and queue-based service.",
    notebookRef: "Smart_Signals_Stage1.ipynb",
  },
  {
    id: "sensor",
    label: "Mode B",
    name: "Sensor-Based",
    tagline: "Induction-loop actuated controller",
    color: "#f59e0b",
    colorClass: "text-yellow-400",
    borderClass: "border-yellow-400/40",
    bgClass: "bg-yellow-500/10",
    description: "Induction-loop sensors detect waiting vehicles and extend the green phase (min 10s, max 45s, gap 3s). When no cars are detected for 3s AND cross-traffic is waiting, the signal switches. Based on Stage 2 notebook logic.",
    notebookRef: "Smart_Signals_Stage2_Induction.ipynb",
  },
  {
    id: "ai",
    label: "Mode C",
    name: "AI Adaptive",
    tagline: "Reinforcement Learning Q-Learning controller",
    color: "#00d4ff",
    colorClass: "text-cyan-400",
    borderClass: "border-cyan-400/40",
    bgClass: "bg-cyan-500/10",
    description: "A Reinforcement Learning agent monitors NS and EW queue lengths and dynamically serves the longest queue — maximizing throughput and minimizing wait times. Adapted from the Stage 3 Q-Learning notebook.",
    notebookRef: "Smart_Signals_Stage3_AI_RL.ipynb",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// REALISTIC 4-PHASE TRAFFIC LIGHT STATE MACHINE
// ─────────────────────────────────────────────────────────────────────────────
//
// Phase index:
//   0  NS_GREEN   – N/S green,  E/W red
//   1  NS_YELLOW  – N/S yellow, E/W red        (always 4 s)
//   2  ALL_RED_A  – all red safety pause        (always 1.5 s)
//   3  EW_GREEN   – E/W green,  N/S red
//   4  EW_YELLOW  – E/W yellow, N/S red        (always 4 s)
//   5  ALL_RED_B  – all red safety pause        (always 1.5 s)
//
// The canvas runs at ~60 fps. We advance the state machine on every frame
// ONLY when `running === true`, so pausing genuinely freezes the clock.
//
// Green durations per mode (seconds, converted to frames below):
//   fixed:  30 s NS green, 30 s EW green
//   sensor: 10–45 s (extends while same-direction cars are queued)
//   ai:     6–35 s  (greedy: serve whichever queue is longer)

const FPS           = 60;        // canvas target frame rate
const YELLOW_S      = 4;         // yellow phase, seconds
const ALL_RED_S     = 1.5;       // all-red clearance, seconds
const YELLOW_F      = Math.round(YELLOW_S  * FPS);
const ALL_RED_F     = Math.round(ALL_RED_S * FPS);

// Green phase bounds (frames)
const FIXED_GREEN_F  = 30 * FPS;
const SENSOR_MIN_F   = 10 * FPS;
const SENSOR_MAX_F   = 45 * FPS;
const AI_MIN_F       =  6 * FPS;
const AI_MAX_F       = 35 * FPS;

// Phase indices
const PH = { NS_GREEN: 0, NS_YELLOW: 1, ALL_RED_A: 2, EW_GREEN: 3, EW_YELLOW: 4, ALL_RED_B: 5 };
const PHASE_COUNT = 6;

// Human-readable labels shown in the HUD
const PHASE_LABEL = [
  "NS Green",
  "NS Yellow",
  "All Red",
  "EW Green",
  "EW Yellow",
  "All Red",
];

// Background tint behind the HUD label per phase
const PHASE_TINT = [
  "rgba(34,197,94,0.15)",    // NS green
  "rgba(251,191,36,0.15)",   // NS yellow
  "rgba(239,68,68,0.10)",    // all-red
  "rgba(34,197,94,0.15)",    // EW green
  "rgba(251,191,36,0.15)",   // EW yellow
  "rgba(239,68,68,0.10)",    // all-red
];

// ─── What each pole should show for a given phase ────────────────────────────
// poleLight(phase, isNSPole) → { red, yellow, green }  (booleans, true = lit)
function poleLight(phase, isNSPole) {
  switch (phase) {
    case PH.NS_GREEN:
      return isNSPole
        ? { red: false, yellow: false, green: true  }
        : { red: true,  yellow: false, green: false };
    case PH.NS_YELLOW:
      return isNSPole
        ? { red: false, yellow: true,  green: false }
        : { red: true,  yellow: false, green: false };
    case PH.ALL_RED_A:
      return { red: true, yellow: false, green: false };
    case PH.EW_GREEN:
      return isNSPole
        ? { red: true,  yellow: false, green: false }
        : { red: false, yellow: false, green: true  };
    case PH.EW_YELLOW:
      return isNSPole
        ? { red: true,  yellow: false, green: false }
        : { red: false, yellow: true,  green: false };
    case PH.ALL_RED_B:
      return { red: true, yellow: false, green: false };
    default:
      return { red: true, yellow: false, green: false };
  }
}

// ─── Cars may move only during the full-green phases ─────────────────────────
function canNSMove(phase) { return phase === PH.NS_GREEN; }
function canEWMove(phase) { return phase === PH.EW_GREEN; }

// ─── Duration of the current phase (in frames) ───────────────────────────────
// nsQ / ewQ = number of waiting cars in each direction (used by sensor & ai)
function phaseDuration(phase, mode, nsQ, ewQ) {
  if (phase === PH.NS_YELLOW || phase === PH.EW_YELLOW) return YELLOW_F;
  if (phase === PH.ALL_RED_A || phase === PH.ALL_RED_B)  return ALL_RED_F;

  // Green phase
  if (mode === "fixed") return FIXED_GREEN_F;

  const isNSGreen = phase === PH.NS_GREEN;
  const servingQ  = isNSGreen ? nsQ : ewQ;

  if (mode === "sensor") {
    // Extend proportionally to queue depth; clamp within [min, max]
    return Math.min(SENSOR_MAX_F, Math.max(SENSOR_MIN_F, SENSOR_MIN_F + servingQ * 12));
  }
  if (mode === "ai") {
    // Greedy: longer green for longer queue, short green for shorter queue
    return Math.min(AI_MAX_F, Math.max(AI_MIN_F, AI_MIN_F + servingQ * 8));
  }
  return FIXED_GREEN_F;
}

// ─────────────────────────────────────────────────────────────────────────────
// IntersectionCanvas — ONLY this component was changed
// ─────────────────────────────────────────────────────────────────────────────
function IntersectionCanvas({ mode, running, trafficVolume }) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);

  // All mutable sim state lives in a ref so the RAF closure always sees current
  const S = useRef({
    cars:        [],
    tick:        0,
    phase:       PH.NS_GREEN,
    phaseTimer:  0,   // frames elapsed in current phase
    nsQueueLen:  0,   // count of NS cars currently waiting (for sensor/ai)
    ewQueueLen:  0,
  });

  const modeConfig = MODES.find(m => m.id === mode);
  const accentColor = modeConfig?.color || "#ef4444";

  // Reset state whenever mode, running, or volume change
  useEffect(() => {
    const st = S.current;
    st.cars       = [];
    st.tick       = 0;
    st.phase      = PH.NS_GREEN;
    st.phaseTimer = 0;
    st.nsQueueLen = 0;
    st.ewQueueLen = 0;
  }, [mode, trafficVolume]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    // Size canvas to its CSS layout size
    const W = canvas.width  = canvas.offsetWidth  || 480;
    const H = canvas.height = canvas.offsetHeight || 300;
    const CX = W / 2, CY = H / 2;
    const ROAD = 36, LANE = ROAD / 2;

    // ── Helpers ──────────────────────────────────────────────────────────────
    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y,     x + w, y + r,     r);
      ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
      ctx.lineTo(x + r, y + h); ctx.arcTo(x,     y + h, x,     y + h - r, r);
      ctx.lineTo(x, y + r); ctx.arcTo(x,     y,     x + r, y,         r);
      ctx.closePath();
    }

    function spawnCar() {
      const dirs = ["N", "S", "E", "W"];
      const dir  = dirs[Math.floor(Math.random() * 4)];
      const sp   = 1.1 + trafficVolume * 1.2;
      const off  = LANE / 2;
      let x, y, vx, vy;
      switch (dir) {
        case "N": x = CX + off; y = H + 10; vx = 0;  vy = -sp; break;
        case "S": x = CX - off; y = -10;    vx = 0;  vy =  sp; break;
        case "E": x = -10;      y = CY + off; vx = sp; vy = 0; break;
        case "W": x = W + 10;   y = CY - off; vx = -sp; vy = 0; break;
      }
      return { x, y, vx, vy, dir, waiting: false, color: `hsl(${Math.random() * 360},70%,60%)` };
    }

    const SPAWN_RATE = Math.max(5, Math.round(30 / (0.3 + trafficVolume)));

    // ── Draw a single traffic light pole ─────────────────────────────────────
    // (x, y) = top-left of the housing box
    // lit = { red, yellow, green }
    function drawPole(x, y, lit) {
      const W_BOX = 14, H_BOX = 36, R_BULB = 4.5;
      const CX_BOX = x + W_BOX / 2;

      // Housing
      ctx.fillStyle   = "#0a1628";
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.lineWidth   = 0.8;
      roundRect(x, y, W_BOX, H_BOX, 3);
      ctx.fill(); ctx.stroke();

      // Red bulb (top)
      ctx.beginPath(); ctx.arc(CX_BOX, y + 8, R_BULB, 0, Math.PI * 2);
      if (lit.red) {
        ctx.fillStyle = "#ef4444";
        ctx.shadowColor = "#ef4444"; ctx.shadowBlur = 10;
      } else {
        ctx.fillStyle = "rgba(60,8,8,0.6)"; ctx.shadowBlur = 0;
      }
      ctx.fill(); ctx.shadowBlur = 0;

      // Yellow bulb (middle)
      ctx.beginPath(); ctx.arc(CX_BOX, y + 18, R_BULB, 0, Math.PI * 2);
      if (lit.yellow) {
        ctx.fillStyle = "#fbbf24";
        ctx.shadowColor = "#fbbf24"; ctx.shadowBlur = 10;
      } else {
        ctx.fillStyle = "rgba(60,50,0,0.6)"; ctx.shadowBlur = 0;
      }
      ctx.fill(); ctx.shadowBlur = 0;

      // Green bulb (bottom)
      ctx.beginPath(); ctx.arc(CX_BOX, y + 28, R_BULB, 0, Math.PI * 2);
      if (lit.green) {
        ctx.fillStyle = "#22c55e";
        ctx.shadowColor = "#22c55e"; ctx.shadowBlur = 12;
      } else {
        ctx.fillStyle = "rgba(4,30,12,0.6)"; ctx.shadowBlur = 0;
      }
      ctx.fill(); ctx.shadowBlur = 0;
    }

    // ── Main render loop ──────────────────────────────────────────────────────
    function draw() {
      ctx.clearRect(0, 0, W, H);

      // Background
      ctx.fillStyle = "#050d1a";
      ctx.fillRect(0, 0, W, H);

      // Grid
      ctx.strokeStyle = "rgba(0,212,255,0.04)";
      ctx.lineWidth = 1;
      for (let gx = 0; gx < W; gx += 40) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
      for (let gy = 0; gy < H; gy += 40) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }

      // Roads
      ctx.fillStyle = "#1a2a3a";
      ctx.fillRect(0, CY - ROAD, W, ROAD * 2);
      ctx.fillRect(CX - ROAD, 0, ROAD * 2, H);

      // Lane centre dashes
      ctx.setLineDash([18, 12]);
      ctx.strokeStyle = "rgba(255,255,255,0.10)";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, CY); ctx.lineTo(W, CY); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(CX, 0); ctx.lineTo(CX, H); ctx.stroke();
      ctx.setLineDash([]);

      // Intersection box
      ctx.fillStyle = "#243040";
      ctx.fillRect(CX - ROAD, CY - ROAD, ROAD * 2, ROAD * 2);

      // Stop lines – thin white bars just outside the box on each approach
      ctx.fillStyle = "rgba(255,255,255,0.30)";
      ctx.fillRect(CX - ROAD,     CY - ROAD - 3, LANE, 3);  // N approach (right lane)
      ctx.fillRect(CX,            CY + ROAD,     LANE, 3);  // S approach (right lane)
      ctx.fillRect(CX - ROAD - 3, CY,            3, LANE);  // E approach (right lane)
      ctx.fillRect(CX + ROAD,     CY - ROAD,     3, LANE);  // W approach (right lane)

      // ── Advance state machine (only when running) ─────────────────────────
      const st = S.current;
      if (running) {
        // Recount waiting queues from actual car positions
        st.nsQueueLen = st.cars.filter(c => (c.dir === "N" || c.dir === "S") && c.waiting).length;
        st.ewQueueLen = st.cars.filter(c => (c.dir === "E" || c.dir === "W") && c.waiting).length;

        st.phaseTimer++;
        const dur = phaseDuration(st.phase, mode, st.nsQueueLen, st.ewQueueLen);
        if (st.phaseTimer >= dur) {
          st.phase      = (st.phase + 1) % PHASE_COUNT;
          st.phaseTimer = 0;
        }
      }

      // ── Draw 4 traffic light poles ─────────────────────────────────────────
      // Poles are placed at each corner of the intersection box.
      // NW + NE poles face NS traffic; SW + SE poles face EW traffic.
      const poles = [
        { px: CX - ROAD - 16, py: CY - ROAD - 40, isNS: true  },  // NW → faces N approach
        { px: CX + ROAD +  2, py: CY - ROAD - 40, isNS: true  },  // NE → faces N approach
        { px: CX - ROAD - 16, py: CY + ROAD +  4, isNS: false },  // SW → faces E approach
        { px: CX + ROAD +  2, py: CY + ROAD +  4, isNS: false },  // SE → faces E approach
      ];
      poles.forEach(({ px, py, isNS }) => {
        drawPole(px, py, poleLight(st.phase, isNS));
      });

      // ── Spawn cars ─────────────────────────────────────────────────────────
      if (running && st.tick % SPAWN_RATE === 0 && st.cars.length < 36) {
        st.cars.push(spawnCar());
      }
      st.tick++;

      // ── Move and draw cars ─────────────────────────────────────────────────
      const nsOk = canNSMove(st.phase);
      const ewOk = canEWMove(st.phase);

      st.cars = st.cars.filter(c => c.x > -40 && c.x < W + 40 && c.y > -40 && c.y < H + 40);

      st.cars.forEach(car => {
        const movingNS = car.dir === "N" || car.dir === "S";
        const canMove  = movingNS ? nsOk : ewOk;
        const SL = 8; // stop-line gap in px

        let stopped = false;
        if (running && !canMove) {
          // Bring car to a stop just before the stop line
          if (car.dir === "N" && car.y > CY + ROAD + SL && car.y < CY + ROAD + 64) stopped = true;
          if (car.dir === "S" && car.y < CY - ROAD - SL && car.y > CY - ROAD - 64) stopped = true;
          if (car.dir === "E" && car.x < CX - ROAD - SL && car.x > CX - ROAD - 64) stopped = true;
          if (car.dir === "W" && car.x > CX + ROAD + SL && car.x < CX + ROAD + 64) stopped = true;
        }

        car.waiting = stopped;
        if (running && !stopped) {
          car.x += car.vx;
          car.y += car.vy;
        }

        // Draw car body
        ctx.save();
        ctx.translate(car.x, car.y);
        if (movingNS) ctx.rotate(car.vy > 0 ? 0 : Math.PI);
        else          ctx.rotate(car.vx > 0 ? Math.PI / 2 : -Math.PI / 2);

        ctx.fillStyle = car.color;
        ctx.beginPath(); ctx.roundRect(-5, -9, 10, 18, 2); ctx.fill();

        ctx.fillStyle = "rgba(0,212,255,0.6)";
        ctx.fillRect(-3, -6, 6, 5);

        ctx.fillStyle = stopped ? "#fbbf24" : "#ffffff";
        ctx.fillRect(-4, 7, 3, 2);
        ctx.fillRect(1,  7, 3, 2);
        ctx.restore();
      });

      // ── HUD overlay ────────────────────────────────────────────────────────
      // Phase label pill (top-left)
      const label     = PHASE_LABEL[st.phase];
      const tintColor = PHASE_TINT[st.phase];
      const labelW    = 130, labelH = 44;

      // Background pill
      ctx.fillStyle = "rgba(5,13,26,0.75)";
      roundRect(8, 8, labelW, labelH, 6);
      ctx.fill();
      ctx.fillStyle = tintColor;
      roundRect(8, 8, labelW, labelH, 6);
      ctx.fill();

      // Mode name (small, top)
      ctx.font      = "bold 9px 'JetBrains Mono', monospace";
      ctx.fillStyle = accentColor;
      ctx.fillText(`${modeConfig?.label}: ${modeConfig?.name}`, 14, 23);

      // Phase name (larger, bottom)
      ctx.font      = "bold 11px 'JetBrains Mono', monospace";
      ctx.fillStyle = "rgba(255,255,255,0.90)";
      ctx.fillText(label, 14, 42);

      // Phase progress bar  (right of the pill)
      const dur     = phaseDuration(st.phase, mode, st.nsQueueLen, st.ewQueueLen);
      const pct     = running ? Math.min(st.phaseTimer / dur, 1) : 0;
      const barX    = labelW + 14, barY = 16, barW = W - barX - 14, barH = 8;

      ctx.fillStyle = "rgba(255,255,255,0.08)";
      roundRect(barX, barY, barW, barH, 4); ctx.fill();

      // Colour the bar to match the phase
      let barColor;
      if (st.phase === PH.NS_GREEN  || st.phase === PH.EW_GREEN)  barColor = "#22c55e";
      else if (st.phase === PH.NS_YELLOW || st.phase === PH.EW_YELLOW) barColor = "#fbbf24";
      else barColor = "#ef4444";

      ctx.fillStyle = barColor;
      roundRect(barX, barY, Math.max(barW * pct, 4), barH, 4); ctx.fill();

      // Remaining seconds text  (right-aligned above bar)
      const remS = running ? Math.ceil((dur - st.phaseTimer) / FPS) : "—";
      ctx.font      = "8px 'JetBrains Mono', monospace";
      ctx.fillStyle = "rgba(255,255,255,0.40)";
      ctx.textAlign = "right";
      ctx.fillText(`${remS}s`, W - 14, barY - 2);
      ctx.textAlign = "left";

      // Volume bar (below the progress bar)
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.fillRect(barX, barY + 14, barW, 4);
      ctx.fillStyle = accentColor;
      ctx.fillRect(barX, barY + 14, barW * trafficVolume, 4);
      ctx.font      = "7px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.30)";
      ctx.fillText(`VOL ${Math.round(trafficVolume * 100)}%`, barX, barY + 26);

      animRef.current = requestAnimationFrame(draw);
    }

    cancelAnimationFrame(animRef.current);
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [mode, running, trafficVolume]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-64 md:h-80 rounded-xl border border-white/10"
      style={{ display: "block" }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MetricCard — unchanged
// ─────────────────────────────────────────────────────────────────────────────
function MetricCard({ icon: Icon, label, value, unit, color }) {
  return (
    <div className={`glass p-4 rounded-xl border ${color === "cyber" ? "border-cyan-400/20" : color === "violet" ? "border-violet-400/20" : color === "teal" ? "border-teal-400/20" : "border-red-400/20"} text-center`}>
      <Icon size={20} className={`mx-auto mb-2 ${color === "cyber" ? "text-cyan-400" : color === "violet" ? "text-violet-400" : color === "teal" ? "text-teal-400" : "text-red-400"}`} />
      <div className="font-display text-xl font-bold">{value}</div>
      <div className="text-xs text-white/50">{unit}</div>
      <div className="text-xs text-white/40 mt-1">{label}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page — unchanged except "How It Works" bullet for fixed mode now
// mentions the yellow + all-red phases
// ─────────────────────────────────────────────────────────────────────────────
export default function Simulation() {
  const [mode, setMode] = useState("fixed");
  const [running, setRunning] = useState(false);
  const [trafficVolume, setTrafficVolume] = useState(0.5);
  const [results, setResults] = useState(null);
  const [allResults, setAllResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const currentMode = MODES.find(m => m.id === mode);

  const handleRun = useCallback(() => {
    setLoading(true);
    setRunning(true);
    setTimeout(() => {
      const res = runSimulation({ mode, trafficVolume });
      setResults(res);
      setLoading(false);
    }, 400);
  }, [mode, trafficVolume]);

  const handleCompare = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      const fixed  = runSimulation({ mode: "fixed",  trafficVolume });
      const sensor = runSimulation({ mode: "sensor", trafficVolume });
      const ai     = runSimulation({ mode: "ai",     trafficVolume });
      setAllResults({ fixed, sensor, ai });
      setLoading(false);
    }, 600);
  }, [trafficVolume]);

  const handleReset = () => { setRunning(false); setResults(null); };

  const compareData = allResults ? [
    { name: "Avg Wait (s)",  "Fixed Timer": allResults.fixed.avgWait,           "Sensor": allResults.sensor.avgWait,           "AI Adaptive": allResults.ai.avgWait },
    { name: "Throughput",    "Fixed Timer": allResults.fixed.vehiclesProcessed,  "Sensor": allResults.sensor.vehiclesProcessed,  "AI Adaptive": allResults.ai.vehiclesProcessed },
    { name: "Congestion %",  "Fixed Timer": allResults.fixed.congestionLevel,    "Sensor": allResults.sensor.congestionLevel,    "AI Adaptive": allResults.ai.congestionLevel },
  ] : [];

  return (
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-7xl mx-auto">
        <SectionHeader
          tag="Interactive Simulation"
          title="Smart Traffic"
          highlight="Signal Simulator"
          subtitle="Compare three real traffic control algorithms — from the actual Gold Award Python notebooks — in your browser."
        />

        {/* Mode selector */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8 justify-center">
          {MODES.map(m => (
            <button
              key={m.id}
              onClick={() => { setMode(m.id); setResults(null); setRunning(false); }}
              className={`px-6 py-3 rounded-xl border font-display text-sm tracking-wide transition-all duration-300 ${
                mode === m.id
                  ? `${m.bgClass} ${m.borderClass} text-white`
                  : "bg-white/5 border-white/10 text-white/60 hover:border-white/30"
              }`}
            >
              <span className="font-mono text-xs opacity-60 mr-2">{m.label}</span>
              {m.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: canvas + controls */}
          <div className="lg:col-span-2 space-y-4">
            <GlassCard hover={false}>
              <IntersectionCanvas mode={mode} running={running} trafficVolume={trafficVolume} />

              {/* Controls */}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  onClick={running ? () => setRunning(false) : handleRun}
                  className="btn-cyber flex items-center gap-2"
                  disabled={loading}
                >
                  {running ? <Pause size={16} /> : <Play size={16} />}
                  {loading ? "Running..." : running ? "Pause" : "Run Simulation"}
                </button>
                <button onClick={handleReset} className="btn-outline flex items-center gap-2">
                  <RotateCcw size={16} /> Reset
                </button>
                <button onClick={handleCompare} className="btn-violet flex items-center gap-2" disabled={loading}>
                  <Activity size={16} /> Compare All
                </button>
              </div>

              {/* Traffic volume slider */}
              <div className="mt-4">
                <div className="flex justify-between text-xs font-mono text-white/50 mb-2">
                  <span>Traffic Volume</span>
                  <span>{Math.round(trafficVolume * 100)}% — ~{Math.round(600 * (0.2 + trafficVolume * 1.4))} vph N approach</span>
                </div>
                <input
                  type="range" min="0" max="1" step="0.05"
                  value={trafficVolume}
                  onChange={e => { setTrafficVolume(Number(e.target.value)); setResults(null); }}
                  className="w-full accent-cyan-400"
                />
                <div className="flex justify-between text-xs text-white/30 mt-1">
                  <span>Light</span><span>Moderate</span><span>Heavy</span>
                </div>
              </div>
            </GlassCard>

            {/* Metrics */}
            {results && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MetricCard icon={Clock}    label="Avg Wait Time"      value={results.avgWait}                      unit="seconds"    color="red"    />
                <MetricCard icon={Car}      label="Vehicles Processed" value={results.vehiclesProcessed}            unit="vehicles"   color="cyber"  />
                <MetricCard icon={Activity} label="Congestion Level"   value={`${results.congestionLevel}%`}        unit="queue-based" color="violet" />
                <MetricCard icon={Wind}     label="Est. Emissions"     value={`${results.estimatedEmissionsKg}kg`}  unit="CO₂ equiv." color="teal"   />
              </div>
            )}

            {/* Throughput chart */}
            {results && (
              <GlassCard hover={false}>
                <h3 className="font-display text-sm tracking-wide text-white/70 mb-4">
                  Vehicle Throughput Over Time (1-hr simulation)
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={results.throughputByMinute}>
                    <XAxis dataKey="minute" tick={{ fill: "#ffffff44", fontSize: 10 }} label={{ value: "Minute", position: "insideBottom", fill: "#ffffff44", fontSize: 10 }} />
                    <YAxis tick={{ fill: "#ffffff44", fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: "#0a1628", border: "1px solid rgba(0,212,255,0.2)", borderRadius: 8 }} />
                    <Line type="monotone" dataKey="vehicles" stroke={currentMode?.color} strokeWidth={2} dot={false} name="Vehicles/min" />
                  </LineChart>
                </ResponsiveContainer>
              </GlassCard>
            )}
          </div>

          {/* Right: mode info + comparison */}
          <div className="space-y-4">
            <GlassCard color={mode === "fixed" ? "" : mode === "sensor" ? "" : "cyber"} hover={false}>
              <div className="flex items-center gap-2 mb-3">
                <Zap size={16} style={{ color: currentMode?.color }} />
                <span className="font-display text-sm tracking-wide" style={{ color: currentMode?.color }}>
                  {currentMode?.name}
                </span>
              </div>
              <p className="text-white/60 text-sm leading-relaxed mb-3">{currentMode?.description}</p>
              <div className="flex items-center gap-2 text-xs text-white/30 font-mono border border-white/10 rounded px-2 py-1">
                <Info size={12} />
                {currentMode?.notebookRef}
              </div>
            </GlassCard>

            {/* Signal cycle legend */}
            <GlassCard hover={false}>
              <h4 className="font-display text-xs tracking-widest text-white/50 uppercase mb-3">Signal Cycle</h4>
              <div className="space-y-2">
                {[
                  { dot: "#22c55e", label: "NS Green",  detail: mode === "fixed" ? "30 s" : mode === "sensor" ? "10–45 s" : "6–35 s" },
                  { dot: "#fbbf24", label: "NS Yellow", detail: "4 s" },
                  { dot: "#ef4444", label: "All Red",   detail: "1.5 s" },
                  { dot: "#22c55e", label: "EW Green",  detail: mode === "fixed" ? "30 s" : mode === "sensor" ? "10–45 s" : "6–35 s" },
                  { dot: "#fbbf24", label: "EW Yellow", detail: "4 s" },
                  { dot: "#ef4444", label: "All Red",   detail: "1.5 s" },
                ].map(({ dot, label, detail }) => (
                  <div key={label + detail} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: dot, boxShadow: `0 0 6px ${dot}88` }} />
                    <span className="text-white/70 flex-1">{label}</span>
                    <span className="font-mono text-xs text-white/35">{detail}</span>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* How it works */}
            <GlassCard hover={false}>
              <h4 className="font-display text-xs tracking-widest text-white/50 uppercase mb-3">How It Works</h4>
              {mode === "fixed" && (
                <ul className="space-y-2 text-sm text-white/60">
                  <li className="flex gap-2"><span className="text-red-400 mt-0.5">→</span>Poisson vehicle arrivals at each approach</li>
                  <li className="flex gap-2"><span className="text-red-400 mt-0.5">→</span>NS green 30s → yellow 4s → all-red 1.5s</li>
                  <li className="flex gap-2"><span className="text-red-400 mt-0.5">→</span>EW green 30s → yellow 4s → all-red 1.5s → repeat</li>
                  <li className="flex gap-2"><span className="text-red-400 mt-0.5">→</span>Rigid schedule regardless of actual demand</li>
                </ul>
              )}
              {mode === "sensor" && (
                <ul className="space-y-2 text-sm text-white/60">
                  <li className="flex gap-2"><span className="text-yellow-400 mt-0.5">→</span>Induction loops count vehicles in each queue</li>
                  <li className="flex gap-2"><span className="text-yellow-400 mt-0.5">→</span>Green extends while queue grows (10–45 s cap)</li>
                  <li className="flex gap-2"><span className="text-yellow-400 mt-0.5">→</span>4 s yellow + 1.5 s all-red before every switch</li>
                  <li className="flex gap-2"><span className="text-yellow-400 mt-0.5">→</span>Much more responsive to real demand patterns</li>
                </ul>
              )}
              {mode === "ai" && (
                <ul className="space-y-2 text-sm text-white/60">
                  <li className="flex gap-2"><span className="text-cyan-400 mt-0.5">→</span>RL agent observes NS vs EW queue length</li>
                  <li className="flex gap-2"><span className="text-cyan-400 mt-0.5">→</span>Greedy Q-policy: longer green for longer queue</li>
                  <li className="flex gap-2"><span className="text-cyan-400 mt-0.5">→</span>4 s yellow + 1.5 s all-red safety gap always respected</li>
                  <li className="flex gap-2"><span className="text-cyan-400 mt-0.5">→</span>Adapts dynamically to any traffic pattern</li>
                </ul>
              )}
            </GlassCard>

            {/* Comparison results */}
            {allResults && (
              <GlassCard hover={false}>
                <h4 className="font-display text-xs tracking-widest text-white/50 uppercase mb-4">
                  All Modes Compared
                </h4>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={compareData} layout="vertical">
                    <XAxis type="number" tick={{ fill: "#ffffff44", fontSize: 9 }} />
                    <YAxis type="category" dataKey="name" tick={{ fill: "#ffffff66", fontSize: 9 }} width={72} />
                    <Tooltip contentStyle={{ background: "#0a1628", border: "1px solid rgba(0,212,255,0.2)", borderRadius: 8, fontSize: 11 }} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="Fixed Timer" fill="#ef4444" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="Sensor"      fill="#f59e0b" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="AI Adaptive" fill="#00d4ff" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-3 text-xs text-white/40 text-center font-mono">
                  Traffic Volume: {Math.round(trafficVolume * 100)}%
                </div>
              </GlassCard>
            )}

            {/* Educational note */}
            <div className="glass p-4 rounded-xl border border-teal/20 text-sm text-white/60">
              <div className="flex items-center gap-2 mb-2">
                <Info size={14} className="text-teal" />
                <span className="font-display text-xs text-teal tracking-wide">REAL IMPACT</span>
              </div>
              Pittsburgh's SURTRAC AI traffic system reduced travel time by <span className="text-teal font-semibold">25%</span> and emissions by <span className="text-teal font-semibold">21%</span> across 50 intersections.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
