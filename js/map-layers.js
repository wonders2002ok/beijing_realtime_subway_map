(function() {
'use strict';

// ═══════════════════════════════════════════════════════════
// MAP LAYERS — map-layers.js
// ═══════════════════════════════════════════════════════════
// Provides: map creation, tile layers, line/station/train
// rendering, day/night theme, highlight, permanent labels.

const BS = window.BS = window.BS || {};

// ── Map state ──
BS.lineVisible = {};
LINES.forEach(function(_, i) { BS.lineVisible[i] = true; });

BS.isNightMode = null;
BS.drawnStations = new Set();
BS.linePolylines = [];
BS.stationMarkers = {};
BS.stationLineSet = {};
BS.activePopup = null;
BS.highlightedLine = -1;
BS.curvedSegments = {};
BS.permLabels = [];
BS.trainMarkers = {};
BS.stationLines = {};

// ── Create map ──
var map = L.map('map', { center: [39.92, 116.40], zoom: 11, zoomControl: false, attributionControl: false });
BS.map = map;

var tileDay = L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
  subdomains: '1234', maxZoom: 18
});
tileDay.addTo(map);
L.control.zoom({ position: 'bottomright' }).addTo(map);

// ── Day/night theme ──
function updateMapTheme(dtime) {
  var h = dtime.getHours();
  var night = h >= 22 || h < 7;
  if (night === BS.isNightMode) return;
  BS.isNightMode = night;
  var tp = document.querySelector('.leaflet-tile-pane');
  if (night) {
    tp.style.filter = 'invert(100%) hue-rotate(180deg) grayscale(80%) brightness(80%) contrast(120%)';
  } else {
    tp.style.filter = 'brightness(0.85) saturate(0.7)';
  }
}

// ── Build station-to-line lookup ──
LINES.forEach(function(line, li) {
  line.stations.forEach(function(s) {
    var k = s.name + '_' + s.lng.toFixed(4);
    if (!BS.stationLines[k]) BS.stationLines[k] = { name: s.name, lng: s.lng, lat: s.lat, lines: [] };
    BS.stationLines[k].lines.push(li);
  });
});

// ── Draw lines and stations ──
LINES.forEach(function(line, li) {
  var coords = line.stations.filter(function(s) { return s.lng !== null; }).map(function(s) { return [s.lat, s.lng]; });
  if (coords.length < 2) return;

  if (line.loop) { coords.push(coords[0]); }

  var renderCoords = coords;
  try {
    if (coords.length > 2) {
      var lineString = turf.lineString(coords.map(function(c) { return [c[1], c[0]]; }));
      var curved = turf.bezierSpline(lineString, { resolution: 10000, sharpness: 0.5 });
      renderCoords = curved.geometry.coordinates.map(function(c) { return [c[1], c[0]]; });
    }
  } catch (e) {}

  var mainOpts = { color: line.color, weight: 5, opacity: 1.0, lineJoin: 'round' };
  var main = L.polyline(renderCoords, mainOpts).addTo(map);
  BS.linePolylines.push({ main: main, li: li });

  // Build per-segment curved coordinate lookup
  var segMap = {};
  var validStations = line.stations.filter(function(s) { return s.lng !== null; });
  var stationCoords = validStations.map(function(s) { return [s.lat, s.lng]; });
  if (line.loop) stationCoords.push(stationCoords[0]);

  function nearestIdx(pt, arr) {
    var best = 0, bestD = Infinity;
    for (var i = 0; i < arr.length; i++) {
      var dx = arr[i][0] - pt[0], dy = arr[i][1] - pt[1], d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }

  var stIdxOnCurve = stationCoords.map(function(sc) { return nearestIdx(sc, renderCoords); });
  for (var i = 1; i < stIdxOnCurve.length; i++) {
    if (stIdxOnCurve[i] <= stIdxOnCurve[i - 1]) stIdxOnCurve[i] = Math.min(stIdxOnCurve[i - 1] + 1, renderCoords.length - 1);
  }
  for (var j = 0; j < stationCoords.length - 1; j++) {
    var si = line.stIdx[validStations[j % validStations.length].name];
    var ei = line.stIdx[validStations[(j + 1) % validStations.length].name];
    if (si === undefined || ei === undefined) continue;
    var startI = stIdxOnCurve[j], endI = stIdxOnCurve[j + 1];
    var seg = renderCoords.slice(startI, endI + 1);
    if (seg.length >= 2) segMap[si + '_' + ei] = seg;
  }
  BS.curvedSegments[li] = segMap;

  // Station markers
  line.stations.forEach(function(st, idx) {
    var k = st.name + '_' + st.lng.toFixed(4);
    if (!BS.stationLineSet[k]) BS.stationLineSet[k] = new Set();
    BS.stationLineSet[k].add(li);
    if (BS.drawnStations.has(k)) return;
    BS.drawnStations.add(k);

    var info = BS.stationLines[k];
    var isTransfer = info && info.lines.length > 1;

    var iconHtml, iconSize;
    if (isTransfer) {
      iconSize = 15;
      iconHtml = '<svg class="st-transfer-icon" viewBox="0 0 30 30">'
        + '<circle cx="15" cy="15" r="13" fill="#fff" stroke="#333" stroke-width="2.2"/>'
        + '<path d="M9,11.5 A8,8 0 0,1 21,11.5" fill="none" stroke="#333" stroke-width="1.8" stroke-linecap="round"/>'
        + '<path d="M21,18.5 A8,8 0 0,1 9,18.5" fill="none" stroke="#333" stroke-width="1.8" stroke-linecap="round"/>'
        + '<polygon points="21,9 23.2,13.2 18.8,13.2" fill="#333"/>'
        + '<polygon points="9,21 6.8,16.8 11.2,16.8" fill="#333"/>'
        + '</svg>';
    } else {
      iconSize = 15;
      iconHtml = '<div class="st-dot" style="--lc:' + line.color + '"></div>';
    }
    var icon = L.divIcon({
      className: 'station-marker',
      html: iconHtml,
      iconSize: [iconSize, iconSize], iconAnchor: [iconSize / 2, iconSize / 2]
    });
    var marker = L.marker([st.lat, st.lng], { icon: icon, interactive: true, zIndexOffset: isTransfer ? 500 : 100 }).addTo(map);
    BS.stationMarkers[k] = marker;

    var tipHtml = '<b>' + st.name + '</b>';
    if (info && info.lines.length > 1) {
      tipHtml += '<div class="stn-lines">';
      info.lines.forEach(function(lidx) {
        tipHtml += '<span class="stn-dot" style="background:' + LINES[lidx].color + '"></span>';
      });
      tipHtml += '</div>';
    }
    marker.bindTooltip(tipHtml, { className: 'st-tip', direction: 'top', offset: [0, -8] });

    // Click → persistent popup with timetable
    marker.on('click', function() {
      closeActivePopup();
      var lines = info ? info.lines : [li];
      var dg = BS.getDateGroup(new Date(BS.simTimeMs));
      function fmtM(m) {
        if (m == null) return '--:--';
        var h = (m / 60) | 0, min = m % 60, s = "";
        if (h >= 24) { h -= 24; s = " <span style='font-size:9px;color:#888'>(次日)</span>"; }
        return String(h).padStart(2, '0') + ':' + String(min).padStart(2, '0') + s;
      }

      var html = '<div class="popup-card" style="position:relative">';
      html += '<span class="popup-close" onclick="closeActivePopup()">&times;</span>';
      html += '<div class="popup-title" style="margin-bottom:8px">' + st.name + '</div>';

      lines.forEach(function(lidx) {
        var ln = LINES[lidx];
        html += '<div style="margin-bottom:6px;padding:6px;background:rgba(255,255,255,0.03);border-radius:6px;border:1px solid rgba(255,255,255,0.05)">';
        html += '<div style="font-weight:600;color:' + ln.color + ';font-size:12px;margin-bottom:4px;display:flex;align-items:center;gap:4px;">'
          + '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + ln.color + '"></span>'
          + ln.name + '</div>';

        var hasDir = false;
        if (ln.directions && ln.schedule) {
          ln.directions.forEach(function(dir) {
            var sch = ln.schedule[dir.key];
            if (sch && sch[dg] && sch[dg][st.name]) {
              var times = sch[dg][st.name];
              if (times.length > 0) {
                hasDir = true;
                var first = fmtM(times[0]);
                var last = fmtM(times[times.length - 1]);
                var dest = dir.label;
                if (!ln.loop) {
                  dest = dir.reversed ? ln.stations[0].name : ln.stations[ln.stations.length - 1].name;
                  dest += '方向';
                }
                html += '<div style="display:flex;justify-content:space-between;font-size:11px;color:#ccc;margin-top:3px;">';
                html += '<span style="color:#aaa">首末班车 (开往 ' + dest + ')</span>';
                html += '<span>' + first + ' - ' + last + '</span>';
                html += '</div>';
              }
            }
          });
        }
        if (!hasDir) {
          html += '<div style="font-size:11px;color:#777">暂无首末班车数据</div>';
        }
        html += '</div>';
      });

      html += '<div class="popup-addr" style="margin-top:8px">📍 ' + st.lat.toFixed(6) + '°N, ' + st.lng.toFixed(6) + '°E</div>';
      html += '</div>';
      BS.activePopup = L.popup({ closeButton: false, className: 'popup-card', maxWidth: 320, minWidth: 250, offset: [0, -8] })
        .setLatLng([st.lat, st.lng]).setContent(html).openOn(map);
    });
  });

  // Station icon scale
  function updateStationScale() {
    var z = map.getZoom();
    var scale = Math.max(0.35, 0.155 * (z - 6.8));
    document.documentElement.style.setProperty('--station-scale', scale.toFixed(2));
  }
  map.on('zoom', updateStationScale);
  updateStationScale();
});

// ── Permanent station labels at high zoom ──
function updatePermLabels() {
  var z = map.getZoom();
  var showLabels = z >= 14;
  if (showLabels && BS.permLabels.length === 0) {
    Object.keys(BS.stationMarkers).forEach(function(k) {
      var info = BS.stationLines[k];
      if (!info) return;
      var lbl = L.tooltip({
        permanent: true, direction: 'right', offset: [8, 0],
        className: 'st-perm-label', interactive: false
      }).setContent(info.name).setLatLng([info.lat, info.lng]);
      lbl.addTo(map);
      BS.permLabels.push(lbl);
    });
  } else if (!showLabels && BS.permLabels.length > 0) {
    BS.permLabels.forEach(function(l) { map.removeLayer(l); });
    BS.permLabels.length = 0;
  }
}
map.on('zoomend', updatePermLabels);
updatePermLabels();

// ── Popup management ──
function closeActivePopup() {
  if (BS.activePopup) { map.closePopup(BS.activePopup); BS.activePopup = null; }
}
window.closeActivePopup = closeActivePopup;

// ── Highlight line ──
function highlightLine(li) {
  if (BS.highlightedLine === li) { unhighlightAll(); return; }
  BS.highlightedLine = li;
  BS.linePolylines.forEach(function(pl) {
    if (pl.li === li) { pl.main.setStyle({ opacity: 0.9 }); }
    else { pl.main.setStyle({ opacity: 0.08 }); }
  });
  document.querySelectorAll('.line-chip').forEach(function(chip, i) {
    if (i === li) { chip.classList.add('highlighted'); chip.style.opacity = ''; }
    else { chip.classList.remove('highlighted'); chip.style.opacity = '0.3'; }
  });
  Object.keys(BS.stationMarkers).forEach(function(k) {
    var m = BS.stationMarkers[k];
    var lines = BS.stationLineSet[k];
    if (lines && lines.has(li)) {
      m.getElement().classList.remove('station-dimmed');
    } else {
      m.getElement().classList.add('station-dimmed');
    }
  });
}

function unhighlightAll() {
  BS.highlightedLine = -1;
  BS.linePolylines.forEach(function(pl) { pl.main.setStyle({ opacity: 0.9 }); });
  document.querySelectorAll('.line-chip').forEach(function(chip) { chip.classList.remove('highlighted'); chip.style.opacity = ''; });
  Object.keys(BS.stationMarkers).forEach(function(k) {
    BS.stationMarkers[k].getElement().classList.remove('station-dimmed');
  });
}

map.on('click', function(e) {
  if (!e.originalEvent._clickedMarker) { closeActivePopup(); unhighlightAll(); }
});

// ── Toggle line visibility ──
function toggleLine(li) {
  BS.lineVisible[li] = !BS.lineVisible[li];
  var pl = BS.linePolylines[li];
  if (pl) {
    if (BS.lineVisible[li]) { map.addLayer(pl.main); }
    else { map.removeLayer(pl.main); }
  }
}

// ── Update trains layer ──
function updateTrains(forced) {
  BS.weekendFallbackLines.clear();
  var allTrains = [];
  var lineDirCounts = {};
  var dtime = new Date(BS.simTimeMs);

  LINES.forEach(function(line, li) {
    if (!BS.lineVisible[li]) return;
    var trains = BS.getActiveTrains(line, dtime);
    lineDirCounts[li] = { '_total': trains.length };
    trains.forEach(function(t) {
      if (!lineDirCounts[li][t.dir]) lineDirCounts[li][t.dir] = 0;
      lineDirCounts[li][t.dir]++;
    });
    trains.forEach(function(t) { allTrains.push({ train: t, line: line, li: li }); });
  });

  var curKeys = new Set(allTrains.map(function(t) { return t.train.id; }));

  // Remove stale markers
  for (var k in BS.trainMarkers) {
    if (!curKeys.has(k)) {
      if (BS.activePopup && BS.activePopup._trainId === k) {
        closeActivePopup();
      }
      map.removeLayer(BS.trainMarkers[k]);
      delete BS.trainMarkers[k];
    }
  }

  // Add/update markers
  allTrains.forEach(function(item) {
    var t = item.train, line = item.line, li = item.li;
    var pos = BS.interp(t, line);
    if (!pos) return;

    var bearing = pos.bearing || 0;
    var isDimmed = BS.highlightedLine >= 0 && li !== BS.highlightedLine;

    if (BS.trainMarkers[t.id]) {
      var m = BS.trainMarkers[t.id];
      m._t = t;
      m.setLatLng([pos.lat, pos.lng]);
      if (m._lastBearing !== bearing) {
        m._lastBearing = bearing;
        var el = m.getElement();
        if (el) {
          var svgEl = el.querySelector('svg');
          if (svgEl) {
            svgEl.style.transform = 'rotate(' + bearing + 'deg)';
          } else {
            m.setIcon(BS.makeTrainIcon(line.color, bearing));
          }
        }
      }
      m.setOpacity(isDimmed ? 0.15 : 1);
      if (BS.activePopup && BS.activePopup._trainId === t.id) {
        BS.activePopup.setLatLng([pos.lat, pos.lng]);
        var popHtml = '<div class="popup-card" style="position:relative">'
          + '<span class="popup-close" onclick="closeActivePopup()">&times;</span>'
          + '<div class="train-no">车辆编号：' + t.id + '</div>'
          + '<div class="popup-title">' + t.lineName + '</div>'
          + '<div class="popup-row"><b>方向：</b>' + t.dir + '</div>'
          + '<div class="popup-row"><b>区间：</b>' + t.from + ' ➜ ' + t.to + '</div>'
          + '<div class="popup-row"><b>发车：</b>' + t.dep + '</div>'
          + '<div class="popup-row"><b>到站：</b>' + t.arr + '</div>'
          + '<div class="popup-line-tag" style="background:' + line.color + '22;color:' + line.color + ';border:1px solid ' + line.color + '44;margin-top:6px">' + line.name + '</div>'
          + '</div>';
        if (m._lastHtml !== popHtml) {
          BS.activePopup.setContent(popHtml);
          m._lastHtml = popHtml;
        }
      }
    } else {
      var nm = L.marker([pos.lat, pos.lng], { icon: BS.makeTrainIcon(line.color, bearing) }).addTo(map);
      nm._t = t;
      nm._lastBearing = bearing;
      nm.on('click', function(e) {
        L.DomEvent.stopPropagation(e);
        L.DomEvent.preventDefault(e);
        e.originalEvent._clickedMarker = true;
        closeActivePopup();
        var tr = nm._t;
        var nHtml = '<div class="popup-card" style="position:relative">'
          + '<span class="popup-close" onclick="closeActivePopup()">&times;</span>'
          + '<div class="train-no">车辆编号：' + tr.id + '</div>'
          + '<div class="popup-title">' + tr.lineName + '</div>'
          + '<div class="popup-row"><b>方向：</b>' + tr.dir + '</div>'
          + '<div class="popup-row"><b>区间：</b>' + tr.from + ' ➜ ' + tr.to + '</div>'
          + '<div class="popup-row"><b>发车：</b>' + tr.dep + '</div>'
          + '<div class="popup-row"><b>到站：</b>' + tr.arr + '</div>'
          + '<div class="popup-line-tag" style="background:' + line.color + '22;color:' + line.color + ';border:1px solid ' + line.color + '44;margin-top:6px">' + line.name + '</div>'
          + '</div>';
        BS.activePopup = L.popup({ closeButton: false, className: 'popup-card', maxWidth: 300, offset: [0, -10] })
          .setLatLng(nm.getLatLng()).setContent(nHtml).openOn(map);
        BS.activePopup._trainId = tr.id;
      });
      nm.setOpacity(isDimmed ? 0.15 : 1);
      BS.trainMarkers[t.id] = nm;
    }
  });

  // Update stats
  var total = allTrains.length;
  var totalCountEl = document.getElementById('totalCount');
  if (totalCountEl.textContent != total) totalCountEl.textContent = total;

  var toggleCount = document.getElementById('toggleTrainCount');
  if (toggleCount && toggleCount.textContent != total) toggleCount.textContent = total;

  var lineCount = LINES.filter(function(_, i) { return BS.lineVisible[i]; }).length;
  var lineCountEl = document.getElementById('lineCount');
  if (lineCountEl.textContent != lineCount) lineCountEl.textContent = lineCount;

  // Update line list
  var html = '';
  LINES.forEach(function(line, li) {
    if (!BS.lineVisible[li]) return;
    var dc = lineDirCounts[li];
    var ltotal = dc ? dc._total : 0;
    var off = BS.lineVisible[li] ? '' : 'off';
    var dirHtml = '';
    if (dc && line.directions) {
      var parts = [];
      line.directions.forEach(function(d) {
        var cnt = dc[d.key] || 0;
        if (line.loop) {
          parts.push('<b>' + cnt + '</b> ' + d.key);
        } else {
          var stNames = line.stations.map(function(s) { return s.name; });
          var terminal = d.reversed ? stNames[0] : stNames[stNames.length - 1];
          parts.push('<b>' + cnt + '</b> →' + terminal);
        }
      });
      dirHtml = parts.join(' &middot; ');
    }
    var fbMark = BS.weekendFallbackLines.has(line.name) ? ' <span title="⚠️ 使用工作日时刻表（无双休日数据）" style="color:#f39c12;font-size:9px">⚠️</span>' : '';
    html += '<div class="line-chip ' + off + '" data-li="' + li + '">'
      + '<span class="cdot" style="background:' + line.color + '"></span>'
      + '<span class="cname">' + line.name + fbMark + '</span>'
      + '<span class="cdir">' + dirHtml + '</span>'
      + '</div>';
  });

  if (window._lastLineFilterHtml !== html) {
    document.getElementById('lineFilter').innerHTML = html;
    window._lastLineFilterHtml = html;
  }
}

// ── Expose on BS ──
BS.map = map;
BS.updateMapTheme = updateMapTheme;
BS.updatePermLabels = updatePermLabels;
BS.closeActivePopup = closeActivePopup;
BS.highlightLine = highlightLine;
BS.unhighlightAll = unhighlightAll;
BS.toggleLine = toggleLine;
BS.updateTrains = updateTrains;

})();
