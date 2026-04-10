(function() {
'use strict';

// Dismiss loading overlay after first paint
function dismissLoader() {
  const el = document.getElementById('loadingOverlay');
  if(el) { el.classList.add('hidden'); setTimeout(()=>el.remove(), 700); }
}

// Pre-compute station index per line
LINES.forEach(line=>{
  line.stIdx={};
  line.stations.forEach((s,i)=>{line.stIdx[s.name]=i;});
  // Filter out stations without coordinates
  line.stations=line.stations.filter(s=>s.lng!==null&&s.lat!==null);
  // Rebuild index after filter
  line.stIdx={};
  line.stations.forEach((s,i)=>{line.stIdx[s.name]=i;});
});

// Track which lines are visible
const lineVisible={};
LINES.forEach((_,i)=>{lineVisible[i]=true;});

// ═══════════════════════════════════════════════════════════
// SIMULATION ENGINE
// ═══════════════════════════════════════════════════════════
let simMode = 'rt'; // 'rt', 'sim'
let isPlaying = true;
let simTimeMs = Date.now();
let speedMultiplier = 1;
let lastEpoch = Date.now();

function resetRealtime() {
  simMode = 'rt';
  isPlaying = true;
  speedMultiplier = 1;
  document.getElementById('spdSelect').value = "1";
  document.getElementById('btnPlay').innerHTML = '⏸ 暂停';
  document.getElementById('modeLbl').innerText = '当前模式: 实时同步流逝';
  updateTrains(true);
}
function togglePlay() {
  if(simMode === 'rt') simMode = 'sim';
  isPlaying = !isPlaying;
  document.getElementById('btnPlay').innerHTML = isPlaying ? '⏸ 暂停' : '▶ 播放';
  document.getElementById('modeLbl').innerText = '当前模式: 脱机模拟';
  updateTrains(true);
}
function scrubTime(val) {
  simMode = 'sim';
  isPlaying = false;
  document.getElementById('btnPlay').innerHTML = '▶ 播放';
  const now = new Date();
  now.setHours(Math.floor(val/3600), Math.floor((val%3600)/60), Math.floor(val%60), 0);
  simTimeMs = now.getTime();
  document.getElementById('modeLbl').innerText = '当前模式: 脱机模拟';
  updateTrains(true);
}

function setSpd(val) {
  if(simMode === 'rt' && val != 1) simMode = 'sim';
  speedMultiplier = parseInt(val);
  document.getElementById('modeLbl').innerText = simMode==='sim' ? '当前模式: 脱机模拟 ('+val+'x)' : '当前模式: 实时同步流逝';
}

function tick() {
  const now = Date.now();
  const delta = now - lastEpoch;
  lastEpoch = now;

  if (simMode === 'rt') {
    simTimeMs = Date.now();
  } else if (isPlaying) {
    simTimeMs += delta * speedMultiplier;
  }
  
  const d = new Date(simTimeMs);
  const secOfDay = d.getHours()*3600 + d.getMinutes()*60 + d.getSeconds();
  
  // Update scrubber only if not actively scrubbing
  if(!document.getElementById('timeSlider').matches(':active')){
     document.getElementById('timeSlider').value = secOfDay;
  }

  const m = d.getMinutes(), s = d.getSeconds();
  
  const newClockHtml = d.getHours().toString().padStart(2,'0') + ':' + 
    m.toString().padStart(2,'0') + 
    '<span class="sec">:' + s.toString().padStart(2,'0') + '</span>';
  const clockEl = document.getElementById('clock');
  if (clockEl.innerHTML !== newClockHtml) {
      clockEl.innerHTML = newClockHtml;
  }
  
  const dstr = d.getFullYear() + '年' + (d.getMonth()+1) + '月' + d.getDate() + '日 ' + ['周日','周一','周二','周三','周四','周五','周六'][d.getDay()];
  const dateDisp = document.getElementById('dateDisp');
  if (dateDisp.textContent !== dstr) {
      dateDisp.textContent = dstr;
  }
  
  updateMapTheme(d);
  updateTrains(false);
  
  // Dismiss loader on first tick
  if(!window._loaderDismissed){ window._loaderDismissed=true; dismissLoader(); }
  
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);


// Train number code mapping
const LINE_CODES={
  '1号线':'01','2号线':'02','3号线':'03','4号线':'04','5号线':'05',
  '6号线':'06','7号线':'07','8号线':'08','9号线':'09','10号线':'10',
  '11号线':'11','12号线':'12','13号线':'13','14号线':'14','15号线':'15',
  '16号线':'16','17号线':'17','18号线':'18','19号线':'19',
  '房山线':'FS','亦庄线':'YZ','燕房线':'YF','昌平线':'CP',
  'S1线':'S1','西郊线':'XJ','亦庄T1线':'YT','首都机场线':'PEK','大兴机场线':'PKX'
};
// Build direction prefix map from LINES data: false→0, true→1
const DIR_PREFIX={};
LINES.forEach(line=>{
  if(!line.directions)return;
  line.directions.forEach(d=>{
    const key=line.name+'|'+d.key;
    DIR_PREFIX[key]=d.reversed?'1':'0';
  });
});
function makeTrainId(lineName,dirKey,trainIdx){
  const code=LINE_CODES[lineName]||('??');
  const prefix=DIR_PREFIX[lineName+'|'+dirKey]||'0';
  return code+prefix+String(trainIdx).padStart(3,'0');
}

function getDateGroup(d){
  const day=d.getDay();
  return(day===0||day===6)?'双休日':'工作日';
}

function getActiveTrains(line,dtime){
  const dg=getDateGroup(dtime);
  const tm=dtime.getHours()*60+dtime.getMinutes();
  const ts=dtime.getSeconds() + dtime.getMilliseconds()/1000; // continuous float seconds for sub-minute smooth interpolation
  const tmNext=tm+1440; // next-day equivalent for late-night comparison
  const out=[];

  function fmtM(m){return String(m/60|0).padStart(2,'0')+':'+String(m%60).padStart(2,'0');}

  for(const dir of line.directions){
    const dk=dir.key;
    const schDir=line.schedule[dk];
    if(!schDir||!schDir[dg])continue;

    const stNames=line.stations.map(s=>s.name);
    let orderedNames=stNames;
    if(dir.reversed)orderedNames=[...stNames].reverse();

    const firstSt=orderedNames[0];
    const depTimes=schDir[dg][firstSt];
    if(!depTimes||!depTimes.length)continue;

    // Determine if we're in late-night mode (trains from yesterday still running)
    const isLateNight=tm<360; // before 06:00
    // Find the latest departure that's "today" (before 06:00 means from yesterday)
    // All late-night departures are those from yesterday — their minute values are > tm
    // but we add 1440 to current time for comparison
    const effectiveTm=isLateNight?tmNext:tm;

    let trainIdx=0;
    for(let di=0;di<depTimes.length;di++){
      const depM=depTimes[di];
      // Optimization: in normal hours, skip trains that haven't departed yet
      if(!isLateNight){
        if(depM>tm+1)break; // times are sorted, no need to check further
        if(depM>tm)continue; // not departed yet
      }else{
        // Late-night: find trains from yesterday that are still en route
        // A train from yesterday departed at depM (< 1440) and is still running if
        // its estimated arrival at last station > tmNext
        if(depM>tm&&depM<effectiveTm){
          // This train departed earlier today (before midnight) — normal
        }else if(depM<tm){
          // This train departed yesterday — check if it could still be running
          // Estimate max travel time: ~120 min for longest lines
          const maxTravel=120;
          if(depM+maxTravel<effectiveTm)continue; // definitely finished
        }else{
          // depM > effectiveTm: train hasn't departed yet (even from yesterday)
          continue;
        }
      }

      let prevSt=firstSt,prevMin=depM,found=false;
      // Track this train's actual segment travel times for loop-closing estimation
      let segTimesArr=[],segTimeSum=0;
      for(let si=1;si<orderedNames.length;si++){
        const curSt=orderedNames[si];
        const curTimes=schDir[dg][curSt];
        if(!curTimes)continue;

        // Binary search for earliest time > prevMin
        let lo=0,hi=curTimes.length-1,arrMin=-1;
        while(lo<=hi){
          const mid=(lo+hi)>>1;
          if(curTimes[mid]>prevMin){arrMin=curTimes[mid];hi=mid-1;}
          else{lo=mid+1;}
        }
        if(arrMin<0)break;

        const segDur=arrMin-prevMin;
        segTimesArr.push(segDur);
        segTimeSum+=segDur;

        if(effectiveTm>=prevMin&&effectiveTm<arrMin){
          // Sub-minute smooth interpolation using seconds
          const durSec=(arrMin-prevMin)*60;
          const elapsedSec=(effectiveTm-prevMin)*60+ts;
          const pr=durSec>0?elapsedSec/durSec:0;
          const fi=line.stIdx[prevSt],ti2=line.stIdx[curSt];
          if(fi!==undefined&&ti2!==undefined){
            out.push({
              id:makeTrainId(line.name,dk,trainIdx),
              fi,ti:ti2,pr,
              dir:dk,
              from:prevSt,to:curSt,
              dep:fmtM(prevMin),arr:fmtM(arrMin),
              lineName:line.name,lineColor:line.color
            });
          }
          found=true;
          break;
        }
        prevSt=curSt;prevMin=arrMin;
      }

      // Loop line: check if train is on the closing segment (last station → first station)
      if(!found&&line.loop&&orderedNames.length>1){
        // Check if this train is a 回库车 (terminates at an intermediate station)
        const epList=line.trainEndpoints&&line.trainEndpoints[dk]&&line.trainEndpoints[dk][dg];
        const terminalStation=epList&&di<epList.length?epList[di]:null;
        if(terminalStation){
          // This train terminates before completing the loop — don't show on closing segment
          trainIdx++;continue;
        }

        if(prevSt!==orderedNames[orderedNames.length-1]){
          // Train terminated early (did not reach end of loop array). Do not close the loop.
          trainIdx++;continue;
        }

        // Estimate loop-closing travel time from this train's actual average segment time
        // Use Math.ceil (not Math.round) to avoid underestimating — the closing segment
        // is typically longer than average because it's a physical curve between terminals.
        // Minimum 3 minutes ensures no "disappearing train" gaps on dense loop lines.
        const avgSegTime=segTimesArr.length>0?Math.max(3,Math.ceil(segTimeSum/segTimesArr.length)):3;
        const nextLoop=prevMin+avgSegTime;

        if(effectiveTm>=prevMin&&effectiveTm<nextLoop){
          const durSec=(nextLoop-prevMin)*60;
          const elapsedSec=(effectiveTm-prevMin)*60+ts;
          const pr=durSec>0?elapsedSec/durSec:0;
          const fi=line.stIdx[prevSt],ti2=line.stIdx[orderedNames[0]];
          if(fi!==undefined&&ti2!==undefined){
            // For loop closing segment, use the simple two-point interpolation
            // (fi and ti are physically adjacent, even if their array indices differ)
            // The path is NOT needed here — just interpolate between prevSt and firstSt
            out.push({
              id:makeTrainId(line.name,dk,trainIdx),
              fi,ti:ti2,pr,
              dir:dk,
              from:prevSt,to:orderedNames[0],
              dep:fmtM(prevMin),arr:fmtM(nextLoop),
              lineName:line.name,lineColor:line.color
            });
            found=true;
          }
        }
      }

      // Train has arrived at terminal — don't display (it's off the line)
      trainIdx++;
    }
  }
  return out;
}

function interpAlongPath(pts, pr){
  // Interpolate along an array of [lat,lng] points with progress ratio pr (0..1)
  // Returns {lat, lng, bearing} where bearing is the local curve direction
  if(!pts||pts.length<2) return null;
  // Compute cumulative distances
  let totalDist=0;
  const dists=[0];
  for(let i=1;i<pts.length;i++){
    const dx=pts[i][1]-pts[i-1][1], dy=pts[i][0]-pts[i-1][0];
    totalDist+=Math.sqrt(dx*dx+dy*dy);
    dists.push(totalDist);
  }
  if(totalDist===0) return {lat:pts[0][0],lng:pts[0][1],bearing:0};
  const target=Math.max(0,Math.min(1,pr))*totalDist;
  for(let i=1;i<dists.length;i++){
    if(target<=dists[i]){
      const segLen=dists[i]-dists[i-1];
      const t=segLen>0?(target-dists[i-1])/segLen:0;
      const lat=pts[i-1][0]+(pts[i][0]-pts[i-1][0])*t;
      const lng=pts[i-1][1]+(pts[i][1]-pts[i-1][1])*t;
      const b=getBearing({lat:pts[i-1][0],lng:pts[i-1][1]},{lat:pts[i][0],lng:pts[i][1]});
      return {lat,lng,bearing:b};
    }
  }
  const n=pts.length;
  const b=getBearing({lat:pts[n-2][0],lng:pts[n-2][1]},{lat:pts[n-1][0],lng:pts[n-1][1]});
  return {lat:pts[n-1][0],lng:pts[n-1][1],bearing:b};
}

function interp(train,line){
  const f=line.stations[train.fi],t=line.stations[train.ti];
  if(!f||!t)return null;
  // Helper: look up curved segment, handling both directions
  function getSegPts(segMap, a, b){
    if(!segMap) return null;
    const fwd=segMap[a+'_'+b];
    if(fwd&&fwd.length>=2) return fwd;
    const rev=segMap[b+'_'+a];
    if(rev&&rev.length>=2) return [...rev].reverse();
    return null;
  }
  // If train has a path (loop return segment), interpolate along all intermediate stations
  if(train.path&&train.path.length>1){
    const allPts=[];
    const li=LINES.indexOf(line);
    const segMap=curvedSegments[li];
    for(let i=1;i<train.path.length;i++){
      const seg=getSegPts(segMap, train.path[i-1], train.path[i]);
      if(seg){
        if(allPts.length>0) allPts.push(...seg.slice(1));
        else allPts.push(...seg);
      } else {
        const a=line.stations[train.path[i-1]],b=line.stations[train.path[i]];
        if(!a||!b)continue;
        if(allPts.length>0) allPts.push([b.lat,b.lng]);
        else { allPts.push([a.lat,a.lng]); allPts.push([b.lat,b.lng]); }
      }
    }
    if(allPts.length>=2) return interpAlongPath(allPts, train.pr);
    const last=line.stations[train.path[train.path.length-1]];
    return{lng:last.lng,lat:last.lat};
  }
  // Use curved segment if available (handles both forward & reversed directions)
  const li=LINES.indexOf(line);
  const segMap=curvedSegments[li];
  const seg=getSegPts(segMap, train.fi, train.ti);
  if(seg) return interpAlongPath(seg, train.pr);
  // Fallback: straight line
  const b=getBearing(f,t);
  return{lng:f.lng+(t.lng-f.lng)*train.pr,lat:f.lat+(t.lat-f.lat)*train.pr,bearing:b};
}

function getBearing(from,to){
  const dLng=(to.lng-from.lng)*Math.PI/180;
  const lat1=from.lat*Math.PI/180,lat2=to.lat*Math.PI/180;
  const y=Math.sin(dLng)*Math.cos(lat2);
  const x=Math.cos(lat1)*Math.sin(lat2)-Math.sin(lat1)*Math.cos(lat2)*Math.cos(dLng);
  return(Math.atan2(y,x)*180/Math.PI+360)%360;
}

function makeTrainIcon(color,bearing){
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">'
    +'<polygon points="8,1 15,14 1,14" fill="'+color+'" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>'
    +'</svg>';
  const b64='data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(svg)));
  return L.divIcon({
    html:'<img src="'+b64+'" style="width:16px;height:16px;transform:rotate('+bearing+'deg)">',
    iconSize:[16,16],
    iconAnchor:[8,8],
    className:'train-marker'
  });
}

// ═══════════════════════════════════════════════════════════
// MAP
// ═══════════════════════════════════════════════════════════
const map=L.map('map',{center:[39.92,116.40],zoom:11,zoomControl:false,attributionControl:false});
// Gaode (Amap) tiles - GCJ-02 coordinate system, fast in China
// style=7: 矢量地图(标准地图)
const tileDay=L.tileLayer('https://wprd0{s}.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&size=1&scl=1&style=7',{
  subdomains:'1234',maxZoom:18
});

let isNightMode=null;
function updateMapTheme(dtime){
  const h=dtime.getHours();
  const night=h>=22||h<7;
  if(night===isNightMode)return;
  isNightMode=night;
  const tp=document.querySelector('.leaflet-tile-pane');
  if(night){
    tp.style.filter='invert(100%) hue-rotate(180deg) grayscale(80%) brightness(80%) contrast(120%)';
  }else{
    tp.style.filter='brightness(0.85) saturate(0.7)';
  }
}
// Initialize: will be called on first render via tick()
tileDay.addTo(map);
L.control.zoom({position:'bottomright'}).addTo(map);

// Count station appearances for transfer detection
const stationLines={};
LINES.forEach((line,li)=>{
  line.stations.forEach(s=>{
    const k=s.name+'_'+s.lng.toFixed(4);
    if(!stationLines[k])stationLines[k]={name:s.name,lng:s.lng,lat:s.lat,lines:[]};
    stationLines[k].lines.push(li);
  });
});

// Draw lines and stations
const drawnStations=new Set();
const linePolylines=[];
const stationMarkers={};
const stationLineSet={}; // key -> Set of line indices
let activePopup=null;

// Highlight mode
let highlightedLine=-1;

// Per-line curved segment lookup: curvedSegments[li] = Map of "fi_ti" -> [[lat,lng], ...]
const curvedSegments={};

LINES.forEach((line,li)=>{
  const coords=line.stations.filter(s=>s.lng!==null).map(s=>[s.lat,s.lng]);
  if(coords.length<2)return;

  // Close loop by appending first station's coordinate to the end
  if(line.loop){coords.push(coords[0]);}

  let renderCoords = coords;
  try {
    if (coords.length > 2) {
      const lineString = turf.lineString(coords.map(c=>[c[1], c[0]]));
      const curved = turf.bezierSpline(lineString, {resolution: 10000, sharpness: 0.5});
      renderCoords = curved.geometry.coordinates.map(c=>[c[1], c[0]]);
    }
  } catch(e) {}
  const mainOpts={color:line.color,weight:5,opacity:1.0,lineJoin:'round'};
  const main=L.polyline(renderCoords,mainOpts).addTo(map);
  linePolylines.push({main,li});

  // Build per-segment curved coordinate lookup for train interpolation
  // For each pair of adjacent stations, find the sub-curve of renderCoords between them
  const segMap={};
  const validStations=line.stations.filter(s=>s.lng!==null);
  const stationCoords=validStations.map(s=>[s.lat,s.lng]);
  if(line.loop) stationCoords.push(stationCoords[0]);
  // Find nearest point index on renderCoords for each station
  function nearestIdx(pt, arr){
    let best=0,bestD=Infinity;
    for(let i=0;i<arr.length;i++){
      const dx=arr[i][0]-pt[0],dy=arr[i][1]-pt[1],d=dx*dx+dy*dy;
      if(d<bestD){bestD=d;best=i;}
    }
    return best;
  }
  const stIdxOnCurve=stationCoords.map(sc=>nearestIdx(sc,renderCoords));
  // Ensure monotonically increasing indices (fallback for very close stations)
  for(let i=1;i<stIdxOnCurve.length;i++){
    if(stIdxOnCurve[i]<=stIdxOnCurve[i-1]) stIdxOnCurve[i]=Math.min(stIdxOnCurve[i-1]+1, renderCoords.length-1);
  }
  for(let i=0;i<stationCoords.length-1;i++){
    const si=line.stIdx[validStations[i%validStations.length].name];
    const ei=line.stIdx[validStations[(i+1)%validStations.length].name];
    if(si===undefined||ei===undefined)continue;
    const startI=stIdxOnCurve[i], endI=stIdxOnCurve[i+1];
    const seg=renderCoords.slice(startI, endI+1);
    if(seg.length>=2) segMap[si+'_'+ei]=seg;
  }
  curvedSegments[li]=segMap;

  // Stations
  line.stations.forEach((st,idx)=>{
    const k=st.name+'_'+st.lng.toFixed(4);
    if(!stationLineSet[k])stationLineSet[k]=new Set();
    stationLineSet[k].add(li);
    if(drawnStations.has(k))return;
    drawnStations.add(k);

    const info=stationLines[k];
    const isTransfer=info&&info.lines.length>1;

    let iconHtml,iconSize;
    if(isTransfer){
      // Transfer icon: circle with two semicircle arrows, fills 15×15
      iconSize=15;
      iconHtml='<svg class="st-transfer-icon" viewBox="0 0 30 30">'
        +'<circle cx="15" cy="15" r="13" fill="#fff" stroke="#333" stroke-width="2.2"/>'
        +'<path d="M9,11.5 A8,8 0 0,1 21,11.5" fill="none" stroke="#333" stroke-width="1.8" stroke-linecap="round"/>'
        +'<path d="M21,18.5 A8,8 0 0,1 9,18.5" fill="none" stroke="#333" stroke-width="1.8" stroke-linecap="round"/>'
        +'<polygon points="21,9 23.2,13.2 18.8,13.2" fill="#333"/>'
        +'<polygon points="9,21 6.8,16.8 11.2,16.8" fill="#333"/>'
        +'</svg>';
    }else{
      iconSize=15;
      iconHtml='<div class="st-dot" style="--lc:'+line.color+'"></div>';
    }
    const icon=L.divIcon({
      className:'station-marker',
      html:iconHtml,
      iconSize:[iconSize,iconSize],iconAnchor:[iconSize/2,iconSize/2]
    });
    const marker=L.marker([st.lat,st.lng],{icon,interactive:true,zIndexOffset:isTransfer?500:100}).addTo(map);
    stationMarkers[k]=marker;

    // Tooltip with station name + all lines
    let tipHtml='<b>'+st.name+'</b>';
    if(info&&info.lines.length>1){
      tipHtml+='<div class="stn-lines">';
      info.lines.forEach(lidx=>{
        tipHtml+='<span class="stn-dot" style="background:'+LINES[lidx].color+'"></span>';
      });
      tipHtml+='</div>';
    }
    marker.bindTooltip(tipHtml,{className:'st-tip',direction:'top',offset:[0,-8]});

    // Click → persistent popup
    marker.on('click',function(){
      closeActivePopup();
      const lines=info?info.lines:[li];
      const dg = getDateGroup(new Date(simTimeMs));
      function fmtM(m){
        if (m==null) return '--:--';
        let h = m/60|0, min = m%60, s="";
        if(h>=24){ h-=24; s=" <span style='font-size:9px;color:#888'>(次日)</span>"; }
        return String(h).padStart(2,'0')+':'+String(min).padStart(2,'0')+s;
      }
      
      let html='<div class="popup-card" style="position:relative">';
      html+='<span class="popup-close" onclick="closeActivePopup()">&times;</span>';
      html+='<div class="popup-title" style="margin-bottom:8px">'+st.name+'</div>';
      
      // Timetables and Lines
      lines.forEach(lidx=>{
        const ln=LINES[lidx];
        html+='<div style="margin-bottom:6px;padding:6px;background:rgba(255,255,255,0.03);border-radius:6px;border:1px solid rgba(255,255,255,0.05)">';
        html+='<div style="font-weight:600;color:'+ln.color+';font-size:12px;margin-bottom:4px;display:flex;align-items:center;gap:4px;">'
          +'<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:'+ln.color+'"></span>'
          +ln.name+'</div>';
        
        let hasDir = false;
        if (ln.directions && ln.schedule) {
          ln.directions.forEach(dir => {
            const sch = ln.schedule[dir.key];
            if (sch && sch[dg] && sch[dg][st.name]) {
              const times = sch[dg][st.name];
              if (times.length > 0) {
                hasDir = true;
                const first = fmtM(times[0]);
                const last = fmtM(times[times.length - 1]);
                let dest = dir.label;
                if (!ln.loop) {
                  dest = dir.reversed ? ln.stations[0].name : ln.stations[ln.stations.length - 1].name;
                  dest += '方向';
                }
                html+='<div style="display:flex;justify-content:space-between;font-size:11px;color:#ccc;margin-top:3px;">';
                html+='<span style="color:#aaa">首末班车 (开往 '+dest+')</span>';
                html+='<span>'+first+' - '+last+'</span>';
                html+='</div>';
              }
            }
          });
        }
        if(!hasDir){
          html+='<div style="font-size:11px;color:#777">暂无首末班车数据</div>';
        }
        html+='</div>';
      });
      
      // Address: show coordinates
      html+='<div class="popup-addr" style="margin-top:8px">📍 '+st.lat.toFixed(6)+'°N, '+st.lng.toFixed(6)+'°E</div>';
      html+='</div>';
      activePopup=L.popup({closeButton:false,className:'popup-card',maxWidth:320,minWidth:250,offset:[0,-8]})
        .setLatLng([st.lat,st.lng]).setContent(html).openOn(map);
    });
  });

  // Station icon size scales with map zoom: 8px at zoom 11 → 15px at zoom 14
  function updateStationScale(){
    const z=map.getZoom();
    const scale=Math.max(0.35,0.155*(z-6.8));
    document.documentElement.style.setProperty('--station-scale',scale.toFixed(2));
  }
  map.on('zoom',updateStationScale);
  updateStationScale();
});

// ═══════════════════════════════════════════════════════════
// PERMANENT STATION LABELS AT HIGH ZOOM
// ═══════════════════════════════════════════════════════════
const permLabels=[];
function updatePermLabels(){
  const z=map.getZoom();
  const showLabels=z>=14;
  if(showLabels && permLabels.length===0){
    // Create permanent labels for all stations
    Object.keys(stationMarkers).forEach(k=>{
      const info=stationLines[k];
      if(!info)return;
      const lbl=L.tooltip({
        permanent:true,direction:'right',offset:[8,0],
        className:'st-perm-label',interactive:false
      }).setContent(info.name).setLatLng([info.lat,info.lng]);
      lbl.addTo(map);
      permLabels.push(lbl);
    });
  } else if(!showLabels && permLabels.length>0){
    permLabels.forEach(l=>map.removeLayer(l));
    permLabels.length=0;
  }
}
map.on('zoomend',updatePermLabels);
updatePermLabels();

function closeActivePopup(){
  if(activePopup){map.closePopup(activePopup);activePopup=null;}
}
// Expose to global for inline onclick handlers (legacy) — but prefer event delegation
window.closeActivePopup = closeActivePopup;

function highlightLine(li){
  // Toggle: if already highlighted, un-highlight
  if(highlightedLine===li){unhighlightAll();return;}
  highlightedLine=li;
  // Dim all polylines except selected
  linePolylines.forEach(({main,li:idx})=>{
    if(idx===li){main.setStyle({opacity:0.9});}
    else{main.setStyle({opacity:0.08});}
  });
  // Update legend chips
  document.querySelectorAll('.line-chip').forEach((chip,i)=>{
    if(i===li){chip.classList.add('highlighted');chip.style.opacity='';}
    else{chip.classList.remove('highlighted');chip.style.opacity='0.3';}
  });
  // Dim station markers not on selected line
  Object.keys(stationMarkers).forEach(k=>{
    const m=stationMarkers[k];
    const lines=stationLineSet[k];
    if(lines&&lines.has(li)){
      m.getElement().classList.remove('station-dimmed');
    }else{
      m.getElement().classList.add('station-dimmed');
    }
  });
}

function unhighlightAll(){
  highlightedLine=-1;
  linePolylines.forEach(({main})=>{main.setStyle({opacity:0.9});});
  document.querySelectorAll('.line-chip').forEach(chip=>{chip.classList.remove('highlighted');chip.style.opacity='';});
  // Restore all station markers
  Object.keys(stationMarkers).forEach(k=>{
    stationMarkers[k].getElement().classList.remove('station-dimmed');
  });
}

// Click map to dismiss popup & unhighlight
map.on('click',function(e){
  // Only if clicking on map background (not on a marker)
  if(!e.originalEvent._clickedMarker){closeActivePopup();unhighlightAll();}
});

// ═══════════════════════════════════════════════════════════
// TRAIN LAYER
// ═══════════════════════════════════════════════════════════
let trainMarkers={};

function updateTrains(forced=false){
  const allTrains=[];
  const lineDirCounts={}; // li -> {dirKey: count, _total: count}
  const dtime=new Date(simTimeMs);

  LINES.forEach((line,li)=>{
    if (!lineVisible[li]) return; 
    const trains=getActiveTrains(line,dtime);
    lineDirCounts[li]={'_total':trains.length};
    trains.forEach(t=>{
      if(!lineDirCounts[li][t.dir])lineDirCounts[li][t.dir]=0;
      lineDirCounts[li][t.dir]++;
    });
    trains.forEach(t=>allTrains.push({train:t,line,li}));
  });

  const curKeys=new Set(allTrains.map(t=>t.train.id));

  // Remove old
  for(const k of Object.keys(trainMarkers)){
    if(!curKeys.has(k)){
      if(activePopup && activePopup._trainId === k){
        closeActivePopup();
      }
      map.removeLayer(trainMarkers[k]);
      delete trainMarkers[k];
    }
  }

  // Add/update
  allTrains.forEach(({train:t,line,li})=>{
    const pos=interp(t,line);
    if(!pos)return;

    const bearing=pos.bearing||0;
    const isDimmed=highlightedLine>=0&&li!==highlightedLine;

    if(trainMarkers[t.id]){
      const m=trainMarkers[t.id];
      m._t=t;
      m.setLatLng([pos.lat,pos.lng]);
      if(m._lastBearing !== bearing){
        m._lastBearing = bearing;
        const el = m.getElement();
        if(el && el.querySelector('svg')){
          el.querySelector('svg').style.transform = `rotate(${bearing}deg)`;
        } else {
          m.setIcon(makeTrainIcon(line.color,bearing));
        }
      }
      m.setOpacity(isDimmed?0.15:1);
      if(activePopup && activePopup._trainId === t.id){
        activePopup.setLatLng([pos.lat,pos.lng]);
        const html='<div class="popup-card" style="position:relative">'
          +'<span class="popup-close" onclick="closeActivePopup()">&times;</span>'
          +'<div class="train-no">车辆编号：'+t.id+'</div>'
          +'<div class="popup-title">'+t.lineName+'</div>'
          +'<div class="popup-row"><b>方向：</b>'+t.dir+'</div>'
          +'<div class="popup-row"><b>区间：</b>'+t.from+' ➜ '+t.to+'</div>'
          +'<div class="popup-row"><b>发车：</b>'+t.dep+'</div>'
          +'<div class="popup-row"><b>到站：</b>'+t.arr+'</div>'
          +'<div class="popup-line-tag" style="background:'+line.color+'22;color:'+line.color+';border:1px solid '+line.color+'44;margin-top:6px">'+line.name+'</div>'
          +'</div>';
        if (m._lastHtml !== html) {
          activePopup.setContent(html);
          m._lastHtml = html;
        }
      }
    }else{
      const m=L.marker([pos.lat,pos.lng],{icon:makeTrainIcon(line.color,bearing)}).addTo(map);
      m._t=t;
      m._lastBearing = bearing;
      // Click → persistent popup
      m.on('click',function(e){
        L.DomEvent.stopPropagation(e);
        L.DomEvent.preventDefault(e);
        e.originalEvent._clickedMarker=true;
        closeActivePopup();
        const tr=m._t;
        const html='<div class="popup-card" style="position:relative">'
          +'<span class="popup-close" onclick="closeActivePopup()">&times;</span>'
          +'<div class="train-no">车辆编号：'+tr.id+'</div>'
          +'<div class="popup-title">'+tr.lineName+'</div>'
          +'<div class="popup-row"><b>方向：</b>'+tr.dir+'</div>'
          +'<div class="popup-row"><b>区间：</b>'+tr.from+' ➜ '+tr.to+'</div>'
          +'<div class="popup-row"><b>发车：</b>'+tr.dep+'</div>'
          +'<div class="popup-row"><b>到站：</b>'+tr.arr+'</div>'
          +'<div class="popup-line-tag" style="background:'+line.color+'22;color:'+line.color+';border:1px solid '+line.color+'44;margin-top:6px">'+line.name+'</div>'
          +'</div>';
        activePopup=L.popup({closeButton:false,className:'popup-card',maxWidth:300,offset:[0,-10]})
          .setLatLng(m.getLatLng()).setContent(html).openOn(map);
        activePopup._trainId = tr.id;
      });
      m.setOpacity(isDimmed?0.15:1);
      trainMarkers[t.id]=m;
    }
  });

  // Update stats
  const total=allTrains.length;
  const totalCountEl = document.getElementById('totalCount');
  if (totalCountEl.textContent != total) totalCountEl.textContent = total;
  
  // Update mobile toggle count
  const toggleCount = document.getElementById('toggleTrainCount');
  if (toggleCount && toggleCount.textContent != total) toggleCount.textContent = total;
  
  const lineCount = LINES.filter((_,i)=>lineVisible[i]).length;
  const lineCountEl = document.getElementById('lineCount');
  if (lineCountEl.textContent != lineCount) lineCountEl.textContent = lineCount;

  // Update line list
  let html='';
  LINES.forEach((line,li)=>{
    if (!lineVisible[li]) return; // Skip invisible lines directly
    const dc=lineDirCounts[li];
    const total=dc?dc._total:0;
    const off=lineVisible[li]?'':'off';
    // Build direction breakdown: "→ XX站 5 | ← XX站 3"
    let dirHtml='';
    if(dc&&line.directions){
      const parts=[];
      line.directions.forEach(d=>{
        const cnt=dc[d.key]||0;
        if(line.loop){
          // Loop lines: keep 内环/外环
          parts.push('<b>'+cnt+'</b> '+d.key);
        }else{
          // Non-loop: show terminal station name
          let stNames=line.stations.map(s=>s.name);
          let terminal=d.reversed?stNames[0]:stNames[stNames.length-1];
          parts.push('<b>'+cnt+'</b> →'+terminal);
        }
      });
      dirHtml=parts.join(' &middot; ');
    }
    html+='<div class="line-chip '+off+'" data-li="'+li+'">'
      +'<span class="cdot" style="background:'+line.color+'"></span>'
      +'<span class="cname">'+line.name+'</span>'
      +'<span class="cdir">'+dirHtml+'</span>'
      +'</div>';
  });
  
  if (window._lastLineFilterHtml !== html) {
    document.getElementById('lineFilter').innerHTML=html;
    window._lastLineFilterHtml = html;
  }
}

// Event Delegation for Line Filter
document.getElementById('lineFilter').addEventListener('click', (e) => {
  const chip = e.target.closest('.line-chip');
  if (!chip) return;
  const li = parseInt(chip.getAttribute('data-li'));
  highlightLine(li);
});

document.getElementById('lineFilter').addEventListener('dblclick', (e) => {
  const chip = e.target.closest('.line-chip');
  if (!chip) return;
  const li = parseInt(chip.getAttribute('data-li'));
  e.stopPropagation();
  toggleLine(li);
});

// UI Event Listeners
document.getElementById('timeSlider').addEventListener('input', (e) => scrubTime(e.target.value));
document.getElementById('timeSlider').addEventListener('change', (e) => scrubTime(e.target.value));
document.getElementById('btnPlay').addEventListener('click', togglePlay);
document.getElementById('btnRT').addEventListener('click', resetRealtime);
document.getElementById('spdSelect').addEventListener('change', (e) => setSpd(e.target.value));

function toggleLine(li){
  lineVisible[li]=!lineVisible[li];
  const pl=linePolylines[li];
  if(pl){
    if(lineVisible[li]){
      map.addLayer(pl.main);
    }else{
      map.removeLayer(pl.main);
    }
  }
}

// Fit bounds (or restore from URL)
function applyUrlState(){
  const params=new URLSearchParams(window.location.search);
  const lat=parseFloat(params.get('lat')),lng=parseFloat(params.get('lng')),z=parseInt(params.get('z'));
  const t=parseInt(params.get('t'));
  if(!isNaN(lat)&&!isNaN(lng)&&!isNaN(z)){
    map.setView([lat,lng],z);
  }else{
    let allCoords=[];
    LINES.forEach(line=>line.stations.forEach(s=>{if(s.lng!==null)allCoords.push([s.lat,s.lng]);}));
    if(allCoords.length)map.fitBounds(L.latLngBounds(allCoords).pad(0.05));
  }
  if(!isNaN(t)&&t>=0&&t<=86400){
    scrubTime(t);
  }
}
applyUrlState();

// Update URL on map move (debounced)
let urlTimer=null;
function syncUrlState(){
  clearTimeout(urlTimer);
  urlTimer=setTimeout(()=>{
    const c=map.getCenter(),z=map.getZoom();
    const d=new Date(simTimeMs);
    const secOfDay=d.getHours()*3600+d.getMinutes()*60+d.getSeconds();
    const url=new URL(window.location);
    url.searchParams.set('lat',c.lat.toFixed(4));
    url.searchParams.set('lng',c.lng.toFixed(4));
    url.searchParams.set('z',z);
    if(simMode==='sim') url.searchParams.set('t',secOfDay);
    else url.searchParams.delete('t');
    history.replaceState(null,'',url);
  },500);
}
map.on('moveend',syncUrlState);
map.on('zoomend',syncUrlState);

// ═══════════════════════════════════════════════════════════
// SEARCH
// ═══════════════════════════════════════════════════════════
const searchInput=document.getElementById('searchInput');
const searchResults=document.getElementById('searchResults');

// Build search index with pinyin support
const searchIndex=[];
function toPinyin(str, firstLetter=false){
  if(typeof pinyinPro==='undefined')return '';
  try{
    return pinyinPro.pinyin(str, { toneType: 'none', pattern: firstLetter ? 'first' : 'pinyin' }).replace(/\s+/g, '').toLowerCase();
  }catch(e){return '';}
}
Object.keys(stationLines).forEach(k=>{
  const info=stationLines[k];
  if(!info)return;
  searchIndex.push({
    name:info.name,lat:info.lat,lng:info.lng,
    lines:info.lines.map(li=>LINES[li]),
    key:k,
    pinyin:toPinyin(info.name),
    pyAbbr:toPinyin(info.name, true)
  });
});

searchInput.addEventListener('input',function(){
  const q=this.value.trim().toLowerCase();
  if(!q){searchResults.classList.remove('active');searchResults.innerHTML='';return;}
  const matches=searchIndex.filter(s=>{
    return s.name.toLowerCase().includes(q)
      || s.pinyin.includes(q)
      || s.pyAbbr.includes(q);
  }).slice(0,10);
  if(!matches.length){searchResults.classList.remove('active');searchResults.innerHTML='';return;}
  let html='';
  matches.forEach(m=>{
    const lineNames=m.lines.map(l=>'<span class="si-line" style="color:'+l.color+'">'+l.name+'</span>').join(' ');
    html+='<div class="search-item" data-lat="'+m.lat+'" data-lng="'+m.lng+'" data-key="'+m.key+'">'
      +'<span class="si-dot" style="background:'+m.lines[0].color+'"></span>'
      +'<span class="si-name">'+m.name+'</span>'
      +lineNames
      +'</div>';
  });
  searchResults.innerHTML=html;
  searchResults.classList.add('active');
});

searchResults.addEventListener('click',function(e){
  const item=e.target.closest('.search-item');
  if(!item)return;
  const lat=parseFloat(item.dataset.lat),lng=parseFloat(item.dataset.lng);
  map.flyTo([lat,lng],15,{duration:0.8});
  
  // Trigger station popup
  const key = item.dataset.key;
  if(stationMarkers[key]){
    stationMarkers[key].fire('click');
  }

  searchInput.value='';
  searchResults.classList.remove('active');
  searchResults.innerHTML='';
  // Close mobile panel
  document.getElementById('panel').classList.remove('open');
});

// Close search on click outside
document.addEventListener('click',function(e){
  if(!e.target.closest('.search-box')){
    searchResults.classList.remove('active');
  }
});

// ═══════════════════════════════════════════════════════════
// MOBILE DRAWER
// ═══════════════════════════════════════════════════════════
document.getElementById('panelToggle').addEventListener('click',function(){
  document.getElementById('panel').classList.add('open');
});
document.getElementById('panelClose').addEventListener('click',function(){
  document.getElementById('panel').classList.remove('open');
});
// Close drawer on map tap (mobile)
map.on('click',function(){
  document.getElementById('panel').classList.remove('open');
});

})();