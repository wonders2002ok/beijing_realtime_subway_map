(function() {
'use strict';

// ═══════════════════════════════════════════════════════════
// UI PANEL — ui-panel.js
// ═══════════════════════════════════════════════════════════
// Provides: search, time slider, play/pause controls,
// speed selector, line filter interaction, mobile drawer,
// URL state sharing.

const BS = window.BS = window.BS || {};

// ── Pre-compute direction prefix per line ──
LINES.forEach(function(line) {
  if (!line.directions) return;
  line._dirPrefix = {};
  line.directions.forEach(function(d) { line._dirPrefix[d.key] = d.reversed ? '1' : '0'; });
});

// ── UI Event Listeners (controls) ──
document.getElementById('timeSlider').addEventListener('input', function(e) {
  BS.scrubTime(e.target.value);
});
document.getElementById('timeSlider').addEventListener('change', function(e) {
  BS.scrubTime(e.target.value);
});
document.getElementById('btnPlay').addEventListener('click', BS.togglePlay);
document.getElementById('btnRT').addEventListener('click', BS.resetRealtime);
document.getElementById('spdSelect').addEventListener('change', function(e) {
  BS.setSpd(e.target.value);
});

// ── Line filter: click = highlight, double-click = toggle visibility ──
document.getElementById('lineFilter').addEventListener('click', function(e) {
  var chip = e.target.closest('.line-chip');
  if (!chip) return;
  var li = parseInt(chip.getAttribute('data-li'));
  BS.highlightLine(li);
});

document.getElementById('lineFilter').addEventListener('dblclick', function(e) {
  var chip = e.target.closest('.line-chip');
  if (!chip) return;
  var li = parseInt(chip.getAttribute('data-li'));
  e.stopPropagation();
  BS.toggleLine(li);
});

// ── URL state: restore on load ──
function applyUrlState() {
  var params = new URLSearchParams(window.location.search);
  var lat = parseFloat(params.get('lat')), lng = parseFloat(params.get('lng')), z = parseInt(params.get('z'));
  var t = parseInt(params.get('t'));
  if (!isNaN(lat) && !isNaN(lng) && !isNaN(z)) {
    BS.map.setView([lat, lng], z);
  } else {
    var allCoords = [];
    LINES.forEach(function(line) {
      line.stations.forEach(function(s) { if (s.lng !== null) allCoords.push([s.lat, s.lng]); });
    });
    if (allCoords.length) BS.map.fitBounds(L.latLngBounds(allCoords).pad(0.05));
  }
  if (!isNaN(t) && t >= 0 && t <= 86400) {
    BS.scrubTime(t);
  }
}
applyUrlState();

// ── URL state: sync on map move (debounced) ──
var urlTimer = null;
function syncUrlState() {
  clearTimeout(urlTimer);
  urlTimer = setTimeout(function() {
    var c = BS.map.getCenter(), z = BS.map.getZoom();
    var d = new Date(BS.simTimeMs);
    var secOfDay = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
    var url = new URL(window.location);
    url.searchParams.set('lat', c.lat.toFixed(4));
    url.searchParams.set('lng', c.lng.toFixed(4));
    url.searchParams.set('z', z);
    if (BS.simMode === 'sim') url.searchParams.set('t', secOfDay);
    else url.searchParams.delete('t');
    history.replaceState(null, '', url);
  }, 500);
}
BS.map.on('moveend', syncUrlState);
BS.map.on('zoomend', syncUrlState);

// ── SEARCH ──
var searchInput = document.getElementById('searchInput');
var searchResults = document.getElementById('searchResults');

var searchIndex = [];
function toPinyin(str, firstLetter) {
  if (typeof pinyinPro === 'undefined') return '';
  try {
    return pinyinPro.pinyin(str, {
      toneType: 'none',
      pattern: firstLetter ? 'first' : 'pinyin'
    }).replace(/\s+/g, '').toLowerCase();
  } catch (e) { return ''; }
}

Object.keys(BS.stationLines).forEach(function(k) {
  var info = BS.stationLines[k];
  if (!info) return;
  searchIndex.push({
    name: info.name, lat: info.lat, lng: info.lng,
    lines: info.lines.map(function(li) { return LINES[li]; }),
    key: k,
    pinyin: toPinyin(info.name),
    pyAbbr: toPinyin(info.name, true)
  });
});

searchInput.addEventListener('input', function() {
  var q = this.value.trim().toLowerCase();
  if (!q) { searchResults.classList.remove('active'); searchResults.innerHTML = ''; return; }
  var matches = searchIndex.filter(function(s) {
    return s.name.toLowerCase().includes(q)
      || s.pinyin.includes(q)
      || s.pyAbbr.includes(q);
  }).slice(0, 10);
  if (!matches.length) { searchResults.classList.remove('active'); searchResults.innerHTML = ''; return; }
  var html = '';
  matches.forEach(function(m) {
    var lineNames = m.lines.map(function(l) {
      return '<span class="si-line" style="color:' + l.color + '">' + l.name + '</span>';
    }).join(' ');
    html += '<div class="search-item" data-lat="' + m.lat + '" data-lng="' + m.lng + '" data-key="' + m.key + '">'
      + '<span class="si-dot" style="background:' + m.lines[0].color + '"></span>'
      + '<span class="si-name">' + m.name + '</span>'
      + lineNames
      + '</div>';
  });
  searchResults.innerHTML = html;
  searchResults.classList.add('active');
});

searchResults.addEventListener('click', function(e) {
  var item = e.target.closest('.search-item');
  if (!item) return;
  var lat = parseFloat(item.dataset.lat), lng = parseFloat(item.dataset.lng);
  BS.map.flyTo([lat, lng], 15, { duration: 0.8 });

  var key = item.dataset.key;
  if (BS.stationMarkers[key]) {
    BS.stationMarkers[key].fire('click');
  }

  searchInput.value = '';
  searchResults.classList.remove('active');
  searchResults.innerHTML = '';
  document.getElementById('panel').classList.remove('open');
});

document.addEventListener('click', function(e) {
  if (!e.target.closest('.search-box')) {
    searchResults.classList.remove('active');
  }
});

// ── MOBILE DRAWER ──
document.getElementById('panelToggle').addEventListener('click', function() {
  document.getElementById('panel').classList.add('open');
});
document.getElementById('panelClose').addEventListener('click', function() {
  document.getElementById('panel').classList.remove('open');
});
BS.map.on('click', function() {
  document.getElementById('panel').classList.remove('open');
});

})();
