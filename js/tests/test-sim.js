/**
 * Tests for sim-engine core functions.
 * Run: node js/tests/test-sim.js
 *
 * Functions are inlined since sim-engine.js is a browser IIFE.
 */
'use strict';
const assert = require('assert');

// ── Inlined functions under test ──

function getBearing(from, to) {
  var dLng = (to.lng - from.lng) * Math.PI / 180;
  var lat1 = from.lat * Math.PI / 180, lat2 = to.lat * Math.PI / 180;
  var y = Math.sin(dLng) * Math.cos(lat2);
  var x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

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

function mockMakeTrainId(code, dirPrefix, trainIdx) {
  return code + dirPrefix + String(trainIdx).padStart(3, '0');
}

function getDateGroup(dayOfWeek) {
  return (dayOfWeek === 0 || dayOfWeek === 6) ? '双休日' : '工作日';
}

// ═══════════════════════════════════════════════════════════
// TEST RUNNER
// ═══════════════════════════════════════════════════════════

var passed = 0, failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  ✅ ' + name);
  } catch (e) {
    failed++;
    console.log('  ❌ ' + name + '\n     ' + e.message);
  }
}

console.log('\n── getBearing ──');
test('due east (~90°)', function() {
  var b = getBearing({ lat: 0, lng: 0 }, { lat: 0, lng: 1 });
  assert.ok(b > 85 && b < 95, 'Expected ~90°, got ' + b);
});
test('due north (~0°)', function() {
  var b = getBearing({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
  assert.ok(b < 5 || b > 355, 'Expected ~0°, got ' + b);
});
test('due west (~270°)', function() {
  var b = getBearing({ lat: 0, lng: 1 }, { lat: 0, lng: 0 });
  assert.ok(b > 265 && b < 275, 'Expected ~270°, got ' + b);
});
test('value always in [0, 360)', function() {
  for (var i = 0; i < 100; i++) {
    var from = { lat: Math.random() * 90 - 45, lng: Math.random() * 360 - 180 };
    var to = { lat: Math.random() * 90 - 45, lng: Math.random() * 360 - 180 };
    var b = getBearing(from, to);
    assert.ok(b >= 0 && b < 360, 'Bearing out of range: ' + b);
  }
});

console.log('\n── interpAlongPath ──');
test('null for empty array', function() {
  assert.strictEqual(interpAlongPath([], 0.5), null);
});
test('null for single point', function() {
  assert.strictEqual(interpAlongPath([[0, 0]], 0.5), null);
});
test('pr=0 returns start', function() {
  var pts = [[0, 0], [1, 0], [2, 0]];
  var r = interpAlongPath(pts, 0);
  assert.strictEqual(r.lat, 0);
  assert.strictEqual(r.lng, 0);
});
test('pr=1 returns end', function() {
  var pts = [[0, 0], [1, 0], [2, 0]];
  var r = interpAlongPath(pts, 1);
  assert.strictEqual(r.lat, 2);
  assert.strictEqual(r.lng, 0);
});
test('pr=0.5 is midpoint', function() {
  var pts = [[0, 0], [1, 0]];
  var r = interpAlongPath(pts, 0.5);
  assert.strictEqual(r.lat, 0.5);
  assert.strictEqual(r.lng, 0);
});
test('clamps pr < 0', function() {
  var pts = [[0, 0], [1, 0]];
  var r = interpAlongPath(pts, -0.5);
  assert.strictEqual(r.lat, 0);
});
test('clamps pr > 1', function() {
  var pts = [[0, 0], [1, 0]];
  var r = interpAlongPath(pts, 1.5);
  assert.strictEqual(r.lat, 1);
});

console.log('\n── getDateGroup ──');
test('Mon=工作日', function() { assert.strictEqual(getDateGroup(1), '工作日'); });
test('Fri=工作日', function() { assert.strictEqual(getDateGroup(5), '工作日'); });
test('Sat=双休日', function() { assert.strictEqual(getDateGroup(6), '双休日'); });
test('Sun=双休日', function() { assert.strictEqual(getDateGroup(0), '双休日'); });

console.log('\n── makeTrainId ──');
test('standard format', function() {
  assert.strictEqual(mockMakeTrainId('01', '0', 5), '010005');
  assert.strictEqual(mockMakeTrainId('PEK', '1', 123), 'PEK1123');
  assert.strictEqual(mockMakeTrainId('FS', '0', 0), 'FS0000');
});

console.log('\n═══ ' + passed + ' passed, ' + failed + ' failed ═══\n');
process.exit(failed > 0 ? 1 : 0);
