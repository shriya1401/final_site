// utils/simulationEngine.js
// ============================================================
// Traffic Simulation Engine
// Translated from the actual Gold Award Python notebooks:
//   Stage 1: Smart_Signals_Stage1.ipynb  (Fixed Timer)
//   Stage 2: Smart_Signals_Stage2_Induction.ipynb (Sensor / Induction Loop)
//   Stage 3: Smart_Signals_Stage3_AI_RL.ipynb (AI / Q-Learning RL)
//
// Uses the same Poisson arrival model, queue-based service,
// and controller logic as the original simpy Python simulations.
// ============================================================

// ---------- Seeded PRNG (Mulberry32) for reproducibility ----------
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Poisson inter-arrival time via inverse transform: -ln(U)/lambda
function exponential(rand, lambda) {
  return -Math.log(1 - rand()) / lambda;
}

// ---------- Run one simulation ----------
// mode: "fixed" | "sensor" | "ai"
// trafficVolume: 0..1  (scales base rates)
// seed: integer
// returns metrics object
export function runSimulation({ mode, trafficVolume = 0.5, seed = 42 }) {
  const rand = mulberry32(seed);

  // Base arrival rates from Stage 1 defaults (vph), scaled by trafficVolume
  // Stage 1 uses {N:600, E:800, S:500, W:700}
  const baseVPH = { N: 600, E: 800, S: 500, W: 700 };
  const scale = 0.2 + trafficVolume * 1.4; // 0.2x – 1.6x
  const ratesVPS = Object.fromEntries(
    Object.entries(baseVPH).map(([k, v]) => [k, (v * scale) / 3600])
  );

  const SIM_DURATION = 3600; // 1 hour, same as Stage 1 & 2
  const SERVICE_TIME = 1.0;  // 1s per vehicle when green (Stage 1/2)

  // Queues: each approach stores arrival times
  const queues = { N: [], E: [], S: [], W: [] };
  // Pre-generate arrival events for all directions
  const arrivals = { N: [], E: [], S: [], W: [] };
  for (const dir of ["N", "E", "S", "W"]) {
    let t = 0;
    while (t < SIM_DURATION) {
      t += exponential(rand, ratesVPS[dir]);
      if (t < SIM_DURATION) arrivals[dir].push(t);
    }
  }

  const waitTimes = [];
  const queueSamples = []; // { t, total }
  const departures = [];

  // ---- Simulate based on mode ----
  if (mode === "fixed") {
    // Stage 1: Fixed-timer controller (30s NS, 30s EW)
    const GREEN_NS = 30;
    const GREEN_EW = 30;
    const CYCLE = GREEN_NS + GREEN_EW;

    // Process arrivals into queues
    for (const dir of ["N", "E", "S", "W"]) {
      for (const t of arrivals[dir]) queues[dir].push(t);
    }

    // Run cycle-based service
    let t = 0;
    while (t < SIM_DURATION) {
      // NS green phase
      const nsEnd = t + GREEN_NS;
      _servePhase(queues.N, queues.S, t, nsEnd, SERVICE_TIME, waitTimes, departures, queueSamples, queues);
      t = nsEnd;
      // EW green phase
      const ewEnd = t + GREEN_EW;
      _servePhase(queues.E, queues.W, t, ewEnd, SERVICE_TIME, waitTimes, departures, queueSamples, queues);
      t = ewEnd;
    }
  }

  else if (mode === "sensor") {
    // Stage 2: Induction-loop actuated controller
    // MIN_GREEN=10, MAX_GREEN=45, GAP_EXT=3 (from Stage 2 config)
    const MIN_GREEN = 10;
    const MAX_GREEN = 45;
    const GAP_EXT = 3;

    for (const dir of ["N", "E", "S", "W"]) {
      for (const a of arrivals[dir]) queues[dir].push(a);
    }

    let t = 0;
    while (t < SIM_DURATION) {
      // NS phase: extend green if cars present, up to MAX_GREEN
      let phaseStart = t;
      let lastServed = t;
      let phaseEnd = Math.min(t + MIN_GREEN, SIM_DURATION);
      while (true) {
        const served = _serveOneFromPhase(queues.N, queues.S, t, phaseEnd, SERVICE_TIME, waitTimes, departures);
        if (served) { t = phaseEnd; lastServed = t; }
        else { t = phaseEnd; }
        if (t >= phaseStart + MAX_GREEN || t >= SIM_DURATION) break;
        const ewWaiting = queues.E.filter(a => a <= t).length + queues.W.filter(a => a <= t).length;
        if (t >= phaseStart + MIN_GREEN && ewWaiting > 0 && (t - lastServed) >= GAP_EXT) break;
        phaseEnd = Math.min(t + 1, phaseStart + MAX_GREEN, SIM_DURATION);
      }
      _sampleQueues(t, queues, queueSamples);

      if (t >= SIM_DURATION) break;

      // EW phase
      phaseStart = t; lastServed = t;
      phaseEnd = Math.min(t + MIN_GREEN, SIM_DURATION);
      while (true) {
        const served = _serveOneFromPhase(queues.E, queues.W, t, phaseEnd, SERVICE_TIME, waitTimes, departures);
        if (served) { t = phaseEnd; lastServed = t; }
        else { t = phaseEnd; }
        if (t >= phaseStart + MAX_GREEN || t >= SIM_DURATION) break;
        const nsWaiting = queues.N.filter(a => a <= t).length + queues.S.filter(a => a <= t).length;
        if (t >= phaseStart + MIN_GREEN && nsWaiting > 0 && (t - lastServed) >= GAP_EXT) break;
        phaseEnd = Math.min(t + 1, phaseStart + MAX_GREEN, SIM_DURATION);
      }
      _sampleQueues(t, queues, queueSamples);
    }
  }

  else if (mode === "ai") {
    // Stage 3: AI / Q-Learning adaptive controller
    // The RL agent picks the phase that serves the longest queue
    // Matches Stage 3 logic: if ns_queue > ew_queue → green NS, else green EW
    // cars_through = 3 per step, Poisson arrivals per timestep
    const CARS_THROUGH = 3;

    // Stage 3 uses discrete time steps (300 steps in original, scaled to 3600 for consistency)
    const STEPS = 600;
    const nsQ = [];
    const ewQ = [];

    for (let step = 0; step < STEPS; step++) {
      const t_s = (step / STEPS) * SIM_DURATION;
      // Poisson arrivals: use pre-generated arrivals near this timestep
      const dt = SIM_DURATION / STEPS;
      const nsArr = arrivals.N.filter(a => a >= t_s && a < t_s + dt).length +
                    arrivals.S.filter(a => a >= t_s && a < t_s + dt).length;
      const ewArr = arrivals.E.filter(a => a >= t_s && a < t_s + dt).length +
                    arrivals.W.filter(a => a >= t_s && a < t_s + dt).length;

      for (let i = 0; i < nsArr; i++) nsQ.push(t_s);
      for (let i = 0; i < ewArr; i++) ewQ.push(t_s);

      // RL decision: serve the longer queue (greedy Q-learning policy)
      const greenNS = nsQ.length >= ewQ.length;
      const toServe = Math.min(CARS_THROUGH, greenNS ? nsQ.length : ewQ.length);
      for (let i = 0; i < toServe; i++) {
        const arrTime = greenNS ? nsQ.shift() : ewQ.shift();
        const wait = t_s - arrTime;
        waitTimes.push(Math.max(0, wait));
        departures.push({ t: t_s });
      }

      queueSamples.push({ t: t_s, total: nsQ.length + ewQ.length });
    }
  }

  // ---------- Compute final metrics ----------
  const avgWait = waitTimes.length > 0
    ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length
    : 0;

  const vehiclesProcessed = waitTimes.length;

  // Congestion: average of final queue samples
  const lastSamples = queueSamples.slice(-10);
  const avgQueue = lastSamples.length > 0
    ? lastSamples.reduce((a, b) => a + (b.total || 0), 0) / lastSamples.length
    : 0;
  const congestionLevel = Math.min(100, Math.round((avgQueue / 20) * 100));

  // Emissions estimate: higher wait → more idling → more emissions
  // Baseline: ~170g CO2/km equivalent at idle, ~0.5g/s per car
  const totalIdleSeconds = waitTimes.reduce((a, b) => a + b, 0);
  const estimatedEmissionsKg = (totalIdleSeconds * 0.5) / 1000;

  // Build throughput-over-time array for charts (60 one-minute buckets)
  const throughputByMinute = Array.from({ length: 60 }, (_, i) => {
    const tMin = i * 60, tMax = tMin + 60;
    return {
      minute: i + 1,
      vehicles: departures.filter(d => d.t >= tMin && d.t < tMax).length,
    };
  });

  // Build queue-over-time (sample every 5 minutes)
  const queueOverTime = queueSamples
    .filter((_, i) => i % Math.max(1, Math.floor(queueSamples.length / 12)) === 0)
    .slice(0, 12)
    .map((s, i) => ({ minute: Math.round(s.t / 60) || i * 5, queue: Math.round(s.total || 0) }));

  return {
    avgWait: Math.round(avgWait * 10) / 10,
    vehiclesProcessed,
    congestionLevel,
    estimatedEmissionsKg: Math.round(estimatedEmissionsKg * 10) / 10,
    throughputByMinute,
    queueOverTime,
    waitTimes: waitTimes.slice(0, 200), // sample for histogram
  };
}

// ---------- Helpers ----------
function _servePhase(q1, q2, tStart, tEnd, serviceTime, waitTimes, departures, queueSamples, allQueues) {
  let t = tStart;
  while (t + serviceTime <= tEnd) {
    // Try to serve from q1 or q2 (any car that has arrived by now)
    const ready1 = q1.filter(a => a <= t);
    const ready2 = q2.filter(a => a <= t);
    if (ready1.length === 0 && ready2.length === 0) {
      t += 0.5;
      continue;
    }
    if (ready1.length > 0) {
      const arrTime = q1.splice(q1.indexOf(ready1[0]), 1)[0];
      waitTimes.push(Math.max(0, t - arrTime));
      departures.push({ t: t + serviceTime });
      t += serviceTime;
    } else if (ready2.length > 0) {
      const arrTime = q2.splice(q2.indexOf(ready2[0]), 1)[0];
      waitTimes.push(Math.max(0, t - arrTime));
      departures.push({ t: t + serviceTime });
      t += serviceTime;
    }
    // Sample queue
    if (queueSamples.length % 30 === 0) {
      queueSamples.push({
        t,
        total: (allQueues.N?.length || 0) + (allQueues.E?.length || 0) +
               (allQueues.S?.length || 0) + (allQueues.W?.length || 0),
      });
    }
  }
}

function _serveOneFromPhase(q1, q2, t, tEnd, serviceTime, waitTimes, departures) {
  const ready1 = q1.filter(a => a <= t);
  const ready2 = q2.filter(a => a <= t);
  if (ready1.length > 0 && t + serviceTime <= tEnd) {
    const arrTime = q1.splice(q1.indexOf(ready1[0]), 1)[0];
    waitTimes.push(Math.max(0, t - arrTime));
    departures.push({ t: t + serviceTime });
    return true;
  }
  if (ready2.length > 0 && t + serviceTime <= tEnd) {
    const arrTime = q2.splice(q2.indexOf(ready2[0]), 1)[0];
    waitTimes.push(Math.max(0, t - arrTime));
    departures.push({ t: t + serviceTime });
    return true;
  }
  return false;
}

function _sampleQueues(t, queues, samples) {
  if (samples.length % 20 === 0) {
    samples.push({
      t,
      total: queues.N.length + queues.E.length + queues.S.length + queues.W.length,
    });
  }
}
