function mulberry32(seed){return function(){seed|=0;seed=(seed+0x6D2B79F5)|0;let t=Math.imul(seed^(seed>>>15),1|seed);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};}
function expRandom(rand,lambda){return-Math.log(1-rand())/lambda;}
function generateArrivals(rand,ratesVPS,SIM_DURATION){const arrivals={N:[],E:[],S:[],W:[]};for(const dir of["N","E","S","W"]){let t=0;while(t<SIM_DURATION){t+=expRandom(rand,ratesVPS[dir]);if(t<SIM_DURATION)arrivals[dir].push(t);}}return arrivals;}

export function runSimulation({mode,trafficVolume=0.5,seed=42}){
  const rand=mulberry32(seed);
  const SIM_DURATION=3600;
  const SERVICE_TIME=1.0;
  const baseVPH={N:600,E:800,S:500,W:700};
  const scale=0.3+trafficVolume*1.2;
  const ratesVPS=Object.fromEntries(Object.entries(baseVPH).map(([k,v])=>[k,(v*scale)/3600]));
  const arrivals=generateArrivals(rand,ratesVPS,SIM_DURATION);
  const queues={N:[...arrivals.N],E:[...arrivals.E],S:[...arrivals.S],W:[...arrivals.W]};
  const waitTimes=[];
  const departures=[];
  const queueSamples=[];

  if(mode==="fixed"){
    const GREEN_NS=30,GREEN_EW=30;
    let t=0;
    while(t<SIM_DURATION){
      t=servePhase(["N","S"],queues,t,t+GREEN_NS,SERVICE_TIME,waitTimes,departures);
      sampleQueues(t,queues,queueSamples);
      if(t>=SIM_DURATION)break;
      t=servePhase(["E","W"],queues,t,t+GREEN_EW,SERVICE_TIME,waitTimes,departures);
      sampleQueues(t,queues,queueSamples);
    }
  } else if(mode==="sensor"){
    const MIN_GREEN=10,MAX_GREEN=45,GAP_EXT=3;
    let t=0;
    while(t<SIM_DURATION){
      ({t}=serveActuated(["N","S"],["E","W"],queues,t,MIN_GREEN,MAX_GREEN,GAP_EXT,SERVICE_TIME,waitTimes,departures));
      sampleQueues(t,queues,queueSamples);
      if(t>=SIM_DURATION)break;
      ({t}=serveActuated(["E","W"],["N","S"],queues,t,MIN_GREEN,MAX_GREEN,GAP_EXT,SERVICE_TIME,waitTimes,departures));
      sampleQueues(t,queues,queueSamples);
    }
  } else if(mode==="ai"){
    const CARS_THROUGH=3,STEP_DT=6;
    const nsQ=[],ewQ=[];
    let ni=0,si=0,ei=0,wi=0;
    const nArr=[...arrivals.N].sort((a,b)=>a-b);
    const sArr=[...arrivals.S].sort((a,b)=>a-b);
    const eArr=[...arrivals.E].sort((a,b)=>a-b);
    const wArr=[...arrivals.W].sort((a,b)=>a-b);
    for(let t=0;t<SIM_DURATION;t+=STEP_DT){
      const tNext=t+STEP_DT;
      while(ni<nArr.length&&nArr[ni]<tNext)nsQ.push(nArr[ni++]);
      while(si<sArr.length&&sArr[si]<tNext)nsQ.push(sArr[si++]);
      while(ei<eArr.length&&eArr[ei]<tNext)ewQ.push(eArr[ei++]);
      while(wi<wArr.length&&wArr[wi]<tNext)ewQ.push(wArr[wi++]);
      const greenNS=nsQ.length>=ewQ.length;
      const activeQ=greenNS?nsQ:ewQ;
      const served=Math.min(CARS_THROUGH,activeQ.length);
      for(let i=0;i<served;i++){const arrTime=activeQ.shift();waitTimes.push(Math.max(0,t-arrTime));departures.push({t});}
      queueSamples.push({t,total:nsQ.length+ewQ.length});
    }
  }

  const avgWait=waitTimes.length>0?waitTimes.reduce((a,b)=>a+b,0)/waitTimes.length:0;
  const lastSamples=queueSamples.slice(-10);
  const avgQueue=lastSamples.length>0?lastSamples.reduce((s,b)=>s+(b.total||0),0)/lastSamples.length:0;
  const congestionLevel=Math.min(100,Math.round((avgQueue/20)*100));
  const totalIdleSeconds=waitTimes.reduce((a,b)=>a+b,0);
  const estimatedEmissionsKg=Math.round((totalIdleSeconds*0.5)/1000*10)/10;
  const throughputByMinute=Array.from({length:60},(_,i)=>{const tMin=i*60,tMax=tMin+60;return{minute:i+1,vehicles:departures.filter(d=>d.t>=tMin&&d.t<tMax).length};});
  const step=Math.max(1,Math.floor(queueSamples.length/12));
  const queueOverTime=queueSamples.filter((_,i)=>i%step===0).slice(0,12).map((s,i)=>({minute:Math.round((s.t||i*5*60)/60),queue:Math.round(s.total||0)}));
  return{avgWait:Math.round(avgWait*10)/10,vehiclesProcessed:waitTimes.length,congestionLevel,estimatedEmissionsKg,throughputByMinute,queueOverTime,waitTimes:waitTimes.slice(0,300)};
}

function servePhase(dirs,queues,tStart,tEnd,serviceTime,waitTimes,departures){
  let t=tStart;
  while(t+serviceTime<=tEnd){
    let served=false;
    for(const dir of dirs){const q=queues[dir];const idx=q.findIndex(a=>a<=t);if(idx!==-1){const arrTime=q.splice(idx,1)[0];waitTimes.push(Math.max(0,t-arrTime));departures.push({t:t+serviceTime});t+=serviceTime;served=true;break;}}
    if(!served){let nextArrival=tEnd;for(const dir of dirs){const next=queues[dir].find(a=>a>t);if(next!==undefined&&next<nextArrival)nextArrival=next;}t=Math.min(nextArrival,tEnd);}
  }
  return Math.max(t,tEnd);
}

function serveActuated(greenDirs,oppDirs,queues,tStart,minGreen,maxGreen,gapExt,serviceTime,waitTimes,departures){
  let t=tStart;
  const phaseMax=tStart+maxGreen;
  let lastServedAt=tStart;
  t=servePhase(greenDirs,queues,t,Math.min(tStart+minGreen,phaseMax),serviceTime,waitTimes,departures);
  while(t<phaseMax){
    const hasGreen=greenDirs.some(d=>queues[d].some(a=>a<=t));
    const hasOpp=oppDirs.some(d=>queues[d].some(a=>a<=t));
    const idleTime=t-lastServedAt;
    if(!hasGreen){if(hasOpp&&idleTime>=gapExt)break;if(!hasOpp){t+=gapExt;continue;}}
    const prevLen=waitTimes.length;
    t=servePhase(greenDirs,queues,t,Math.min(t+5,phaseMax),serviceTime,waitTimes,departures);
    if(waitTimes.length>prevLen)lastServedAt=t;
  }
  return{t:Math.max(t,tStart+minGreen)};
}

function sampleQueues(t,queues,samples){
  if(samples.length%15===0)samples.push({t,total:queues.N.length+queues.E.length+queues.S.length+queues.W.length});
}