(function() {
'use strict';

// ═══════════════════════════════════════════════════════════
// SIMULATION ENGINE — sim-engine.js
// ═══════════════════════════════════════════════════════════
// Provides: train schedule lookup, position interpolation,
// time control (play/pause/scrub), and the main tick loop.
// Shared state lives on window.BS.

const BS = window.BS = window.BS || {};

// ── Simulation state ──
BS.simMode = 'rt';
BS.isPlaying = true;
BS.simTimeMs = Date.now();
BS.speedMultiplier = 1;
BS.lastEpoch = Date.now();
BS.weekendFallbackLines = new Set();

// ── LINES pre-processing (depends only on LINES global) ──
LINES.forEach(function(line) {
  line.stIdx = {};
  line.stations.forEach(function(s, i) { line.stIdx[s.name] = i; });
  line.stations = line.stations.filter(function(s) { return s.lng !== null && s.lat !== null; });
  line.stIdx = {};
  line.stations.forEach(function(s, i) { line.stIdx[s.name] = i; });
});

// ── Time control ──
function resetRealtime() {
  BS.simMode = 'rt';
  BS.isPlaying = true;
  BS.speedMultiplier = 1;
  document.getElementById('spdSelect').value = "1";
  document.getElementById('btnPlay').innerHTML = '⏸ 暂停';
  document.getElementById('modeLbl').innerText = '当前模式: 实时同步流逝';
  BS.updateTrains(true);
}

function togglePlay() {
  if (BS.simMode === 'rt') BS.simMode = 'sim';
  BS.isPlaying = !BS.isPlaying;
  document.getElementById('btnPlay').innerHTML = BS.isPlaying ? '⏸ 暂停' : '▶ 播放';
  document.getElementById('modeLbl').innerText = '当前模式: 脱机模拟';
  BS.updateTrains(true);
}

function scrubTime(val) {
  BS.simMode = 'sim';
  BS.isPlaying = false;
  document.getElementById('btnPlay').innerHTML = '▶ 播放';
  var d = new Date();
  d.setHours(Math.floor(val / 3600), Math.floor((val % 3600) / 60), Math.floor(val % 60), 0);
  BS.simTimeMs = d.getTime();
  document.getElementById('modeLbl').innerText = '当前模式: 脱机模拟';
  BS.updateTrains(true);
}

function setSpd(val) {
  if (BS.simMode === 'rt' && val != 1) BS.simMode = 'sim';
  BS.speedMultiplier = parseInt(val);
  document.getElementById('modeLbl').innerText = BS.simMode === 'sim' ?
    '当前模式: 脱机模拟 (' + val + 'x)' :
    '当前模式: 实时同步流逝';
}

// ── Train ID ──
function makeTrainId(line, dirKey, trainIdx) {
  var code = line.code || '??';
  var prefix = line._dirPrefix && line._dirPrefix[dirKey] || '0';
  return code + prefix + String(trainIdx).padStart(3, '0');
}

function getDateGroup(d) {
  var day = d.getDay();
  return (day === 0 || day === 6) ? '双休日' : '工作日';
}

// ── Core: get active trains from schedule ──
function getActiveTrains(line, dtime) {
  var dg = getDateGroup(dtime);
  var tm = dtime.getHours() * 60 + dtime.getMinutes();
  var ts = dtime.getSeconds() + dtime.getMilliseconds() / 1000;
  var tmNext = tm + 1440;
  var out = [];

  function fmtM(m) {
    var h = (m / 60) | 0, min = m % 60, s = "";
    if (h >= 24) { h %= 24; s = " <span style='font-size:9px;color:#888'>(次日)</span>"; }
    return String(h).padStart(2, '0') + ':' + String(min).padStart(2, '0') + s;
  }

  for (var di = 0; di < line.directions.length; di++) {
    var dir = line.directions[di];
    var dk = dir.key;
    var schDir = line.schedule[dk];
    if (!schDir) continue;
    var daySchedule = schDir[dg];
    if (!daySchedule) {
      if (dg === '双休日' && schDir['工作日']) {
        daySchedule = schDir['工作日'];
        BS.weekendFallbackLines.add(line.name);
      } else {
        continue;
      }
    }

    var stNames = line.stations.map(function(s) { return s.name; });
    var orderedNames = stNames;
    if (dir.reversed) orderedNames = stNames.slice().reverse();

    var firstSt = orderedNames[0];
    var depTimes = daySchedule[firstSt];
    if (!depTimes || !depTimes.length) continue;

    var isLateNight = tm < 360;
    var effectiveTm = isLateNight ? tmNext : tm;

    var trainIdx = 0;
    for (var tdi = 0; tdi < depTimes.length; tdi++) {
      var depM = depTimes[tdi];
      if (!isLateNight) {
        if (depM > tm + 1) break;
        if (depM > tm) continue;
      } else {
        if (depM > tm && depM < effectiveTm) {
          // departed earlier today
        } else if (depM < tm) {
          var maxTravel = 120;
          if (depM + maxTravel < effectiveTm) continue;
        } else {
          continue;
        }
      }

      var prevSt = firstSt, prevMin = depM, found = false;
      var segTimesArr = [], segTimeSum = 0;
      for (var si = 1; si < orderedNames.length; si++) {
        var curSt = orderedNames[si];
        var curTimes = daySchedule[curSt];
        if (!curTimes) continue;

        var lo = 0, hi = curTimes.length - 1, arrMin = -1;
        while (lo <= hi) {
          var mid = (lo + hi) >> 1;
          if (curTimes[mid] > prevMin) { arrMin = curTimes[mid]; hi = mid - 1; }
          else { lo = mid + 1; }
        }
        if (arrMin < 0) break;

        var segDur = arrMin - prevMin;
        segTimesArr.push(segDur);
        segTimeSum += segDur;

        if (effectiveTm >= prevMin && effectiveTm < arrMin) {
          var durSec = (arrMin - prevMin) * 60;
          var elapsedSec = (effectiveTm - prevMin) * 60 + ts;
          var pr = durSec > 0 ? elapsedSec / durSec : 0;
          var fi = line.stIdx[prevSt], ti2 = line.stIdx[curSt];
          if (fi !== undefined && ti2 !== undefined) {
            out.push({
              id: makeTrainId(line, dk, trainIdx),
              fi: fi, ti: ti2, pr: pr,
              dir: dk,
              from: prevSt, to: curSt,
              dep: fmtM(prevMin), arr: fmtM(arrMin),
              lineName: line.name, lineColor: line.color
            });
          }
          found = true;
          break;
        }
        prevSt = curSt; prevMin = arrMin;
      }

      // Loop line: closing segment
      if (!found && line.loop && orderedNames.length > 1) {
        var epMap = line.trainEndpoints && line.trainEndpoints[dk];
        var epList = epMap && epMap[dg];
        if (!epList && dg === '双休日' && epMap && epMap['工作日']) {
          epList = epMap['工作日'];
        }
        var terminalStation = epList && tdi < epList.length ? epList[tdi] : null;
        if (terminalStation) { trainIdx++; continue; }

        if (prevSt !== orderedNames[orderedNames.length - 1]) {
          trainIdx++; continue;
        }

        var avgSegTime = segTimesArr.length > 0 ? Math.max(3, Math.ceil(segTimeSum / segTimesArr.length)) : 3;
        var nextLoop = prevMin + avgSegTime;

        if (effectiveTm >= prevMin && effectiveTm < nextLoop) {
          var cdurSec = (nextLoop - prevMin) * 60;
          var celapsedSec = (effectiveTm - prevMin) * 60 + ts;
          var cpr = cdurSec > 0 ? celapsedSec / cdurSec : 0;
          var cfi = line.stIdx[prevSt], cti = line.stIdx[orderedNames[0]];
          if (cfi !== undefined && cti !== undefined) {
            out.push({
              id: makeTrainId(line, dk, trainIdx),
              fi: cfi, ti: cti, pr: cpr,
              dir: dk,
              from: prevSt, to: orderedNames[0],
              dep: fmtM(prevMin), arr: fmtM(nextLoop),
              lineName: line.name, lineColor: line.color
            });
          }
        }
      }

      trainIdx++;
    }
  }
  return out;
}

// ── Position interpolation ──
function interpAlongPath(pts, pr) {
  if (!pts || pts.length < 2) return null;
  var totalDist = 0;
  var dists = [0];
  for (var i = 1; i < pts.length; i++) {
    var dx = pts[i][1] - pts[i - 1][1], dy = pts[i][0] - pts[i - 1][0];
    totalDist += Math.sqrt(dx * dx + dy * dy);
    dists.push(totalDist);
  }
  if (totalDist === 0) return { lat: pts[0][0], lng: pts[0][1], bearing: 0 };
  var target = Math.max(0, Math.min(1, pr)) * totalDist;
  for (var j = 1; j < dists.length; j++) {
    if (target <= dists[j]) {
      var segLen = dists[j] - dists[j - 1];
      var t = segLen > 0 ? (target - dists[j - 1]) / segLen : 0;
      var lat = pts[j - 1][0] + (pts[j][0] - pts[j - 1][0]) * t;
      var lng = pts[j - 1][1] + (pts[j][1] - pts[j - 1][1]) * t;
      var b = getBearing({ lat: pts[j - 1][0], lng: pts[j - 1][1] }, { lat: pts[j][0], lng: pts[j][1] });
      return { lat: lat, lng: lng, bearing: b };
    }
  }
  var n = pts.length;
  var lb = getBearing({ lat: pts[n - 2][0], lng: pts[n - 2][1] }, { lat: pts[n - 1][0], lng: pts[n - 1][1] });
  return { lat: pts[n - 1][0], lng: pts[n - 1][1], bearing: lb };
}

function interp(train, line) {
  var f = line.stations[train.fi], t = line.stations[train.ti];
  if (!f || !t) return null;

  function getSegPts(segMap, a, b) {
    if (!segMap) return null;
    var fwd = segMap[a + '_' + b];
    if (fwd && fwd.length >= 2) return fwd;
    var rev = segMap[b + '_' + a];
    if (rev && rev.length >= 2) return rev.slice().reverse();
    return null;
  }

  if (train.path && train.path.length > 1) {
    var allPts = [];
    var li = LINES.indexOf(line);
    var segMap = BS.curvedSegments ? BS.curvedSegments[li] : null;
    for (var i = 1; i < train.path.length; i++) {
      var seg = getSegPts(segMap, train.path[i - 1], train.path[i]);
      if (seg) {
        if (allPts.length > 0) allPts.push.apply(allPts, seg.slice(1));
        else allPts.push.apply(allPts, seg);
      } else {
        var a = line.stations[train.path[i - 1]], b = line.stations[train.path[i]];
        if (!a || !b) continue;
        if (allPts.length > 0) allPts.push([b.lat, b.lng]);
        else { allPts.push([a.lat, a.lng]); allPts.push([b.lat, b.lng]); }
      }
    }
    if (allPts.length >= 2) return interpAlongPath(allPts, train.pr);
    var last = line.stations[train.path[train.path.length - 1]];
    return { lng: last.lng, lat: last.lat };
  }

  var sli = LINES.indexOf(line);
  var sm = BS.curvedSegments ? BS.curvedSegments[sli] : null;
  var s = getSegPts(sm, train.fi, train.ti);
  if (s) return interpAlongPath(s, train.pr);
  var b = getBearing(f, t);
  return { lng: f.lng + (t.lng - f.lng) * train.pr, lat: f.lat + (t.lat - f.lat) * train.pr, bearing: b };
}

function getBearing(from, to) {
  var dLng = (to.lng - from.lng) * Math.PI / 180;
  var lat1 = from.lat * Math.PI / 180, lat2 = to.lat * Math.PI / 180;
  var y = Math.sin(dLng) * Math.cos(lat2);
  var x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function makeTrainIcon(color, bearing) {
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">'
    + '<polygon points="8,1 15,14 1,14" fill="' + color + '" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>'
    + '</svg>';
  var b64 = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
  return L.divIcon({
    html: '<img src="' + b64 + '" style="width:16px;height:16px;transform:rotate(' + bearing + 'deg)">',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    className: 'train-marker'
  });
}

// ── Loader & main loop ──
function dismissLoader() {
  var el = document.getElementById('loadingOverlay');
  if (el) { el.classList.add('hidden'); setTimeout(function() { el.remove(); }, 700); }
}

function tick() {
  var now = Date.now();
  var delta = now - BS.lastEpoch;
  BS.lastEpoch = now;

  if (BS.simMode === 'rt') {
    BS.simTimeMs = Date.now();
  } else if (BS.isPlaying) {
    BS.simTimeMs += delta * BS.speedMultiplier;
  }

  var d = new Date(BS.simTimeMs);
  var secOfDay = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();

  if (!document.getElementById('timeSlider').matches(':active')) {
    document.getElementById('timeSlider').value = secOfDay;
  }

  var m = d.getMinutes(), s = d.getSeconds();
  var newClockHtml = d.getHours().toString().padStart(2, '0') + ':' +
    m.toString().padStart(2, '0') +
    '<span class="sec">:' + s.toString().padStart(2, '0') + '</span>';
  var clockEl = document.getElementById('clock');
  if (clockEl.innerHTML !== newClockHtml) {
    clockEl.innerHTML = newClockHtml;
  }

  var dstr = d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日 ' +
    ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
  var dateDisp = document.getElementById('dateDisp');
  if (dateDisp.textContent !== dstr) {
    dateDisp.textContent = dstr;
  }

  BS.updateMapTheme(d);
  BS.updateTrains(false);

  if (!window._loaderDismissed) { window._loaderDismissed = true; dismissLoader(); }

  requestAnimationFrame(tick);
}

function startSimulation() {
  requestAnimationFrame(tick);
}

// ── Expose on BS ──
BS.resetRealtime = resetRealtime;
BS.togglePlay = togglePlay;
BS.scrubTime = scrubTime;
BS.setSpd = setSpd;
BS.tick = tick;
BS.startSimulation = startSimulation;
BS.getActiveTrains = getActiveTrains;
BS.interp = interp;
BS.interpAlongPath = interpAlongPath;
BS.getBearing = getBearing;
BS.makeTrainIcon = makeTrainIcon;
BS.makeTrainId = makeTrainId;
BS.getDateGroup = getDateGroup;

})();
