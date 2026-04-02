"""
Extract station coordinates (from Amap) + schedules (from BoyInTheSun)
for Beijing Subway Lines 1/2/5/6/10, then inject into index.html.
"""
import json, re

# ── Load data ──
with open('amap_beijing.json', 'r', encoding='utf-8') as f:
    amap = json.load(f)
with open('schedule.json', 'r', encoding='utf-8') as f:
    sched = json.load(f)

# ── Config ──
LINE_CONFIG = [
    {'id': 1, 'name': '1号线', 'color': '#e74c3c', 'amap_name': '1号线', 'sched_name': '1号线八通线',
     'directions': [{'key': '东行', 'label': '东行'}, {'key': '西行', 'label': '西行'}],
     'station_order': None},  # will use schedule first train order
    {'id': 2, 'name': '2号线', 'color': '#3498db', 'amap_name': '2号线', 'sched_name': '2号线',
     'directions': [{'key': '外环', 'label': '外环'}, {'key': '内环', 'label': '内环'}],
     'station_order': None},
    {'id': 5, 'name': '5号线', 'color': '#9b59b6', 'amap_name': '5号线', 'sched_name': '5号线',
     'directions': [{'key': '南行', 'label': '南行'}, {'key': '北行', 'label': '北行'}],
     'station_order': None},
    {'id': 6, 'name': '6号线', 'color': '#e84393', 'amap_name': '6号线', 'sched_name': '6号线',
     'directions': [{'key': '东行', 'label': '东行'}, {'key': '西行', 'label': '西行'}],
     'station_order': None},
    {'id': 10, 'name': '10号线', 'color': '#00cec9', 'amap_name': '10号线', 'sched_name': '10号线',
     'directions': [{'key': '内环', 'label': '内环'}, {'key': '外环', 'label': '外环'}],
     'station_order': None},
]

# ── Extract Amap station coordinates ──
amap_lines = {}
for ln_data in amap.get('l', []):
    ln_name = ln_data.get('ln', '')
    # Normalize: remove "八通线" suffix for matching
    base_name = ln_name.replace('八通线', '')
    stations = []
    for st in ln_data.get('st', []):
        n = st.get('n', '')
        sl = st.get('sl', '')
        if ',' in sl:
            lng, lat = sl.split(',')
            stations.append({'name': n, 'lng': float(lng), 'lat': float(lat)})
    # Store both base name and full name
    if stations:
        amap_lines[ln_name] = stations
        if base_name != ln_name:
            amap_lines[base_name] = stations

# ── Get full station order from schedule ──
def get_full_station_order(sched_data, sched_name, prefer_dirs):
    """Get the complete station list from schedule by finding the longest train run."""
    wd = sched_data.get('工作日', {})
    if sched_name not in wd:
        print("  WARNING: %s not found in weekday schedule!" % sched_name)
        return []
    
    line_sch = wd[sched_name]
    best_stations = []
    
    # Check all directions, pick the one with most stops
    for dkey in prefer_dirs:
        if dkey not in line_sch:
            continue
        trains = line_sch[dkey]
        for tid, stops in trains.items():
            if len(stops) > len(best_stations):
                best_stations = [s[0] for s in stops]
    
    # Deduplicate while preserving order
    seen = set()
    result = []
    for s in best_stations:
        if s not in seen:
            seen.add(s)
            result.append(s)
    return result

# ── Build coordinate lookup ──
def build_coord_lookup(amap_name):
    """Build name -> {lng, lat} from amap data."""
    stations = amap_lines.get(amap_name, [])
    return {s['name']: {'lng': s['lng'], 'lat': s['lat']} for s in stations}

# ── Build schedule object (weekday/weekend per direction) ──
def build_schedule(sched_data, sched_name, direction_keys):
    """Extract schedule data for specific line and directions."""
    result = {}
    for period in ['工作日', '双休日']:
        period_key = 'weekday' if period == '工作日' else 'weekend'
        result[period_key] = {}
        pd = sched_data.get(period, {})
        if sched_name not in pd:
            continue
        line_sch = pd[sched_name]
        for dkey in direction_keys:
            if dkey in line_sch:
                # Convert trains: each train is {id: [[station_name, "HH:MM"], ...]}
                trains = line_sch[dkey]
                result[period_key][dkey] = trains
    return result

# ── Assemble all lines ──
lines_output = []

for cfg in LINE_CONFIG:
    print("Processing %s..." % cfg['name'])
    
    # Get full station order from schedule
    full_stations = get_full_station_order(sched, cfg['sched_name'], [d['key'] for d in cfg['directions']])
    print("  Stations from schedule: %d" % len(full_stations))
    
    # Get coordinates from Amap
    coord_map = build_coord_lookup(cfg['amap_name'])
    print("  Coordinates from Amap: %d" % len(coord_map))
    
    # Merge: schedule order + amap coordinates
    stations = []
    missing_coords = []
    for sname in full_stations:
        if sname in coord_map:
            stations.append({'name': sname, 'lng': coord_map[sname]['lng'], 'lat': coord_map[sname]['lat']})
        else:
            missing_coords.append(sname)
    
    if missing_coords:
        print("  WARNING: Missing coordinates for: %s" % missing_coords[:5])
    
    # Build schedule
    dir_keys = [d['key'] for d in cfg['directions']]
    schedule = build_schedule(sched, cfg['sched_name'], dir_keys)
    
    # Stats
    wd_trains = sum(len(v) for d in schedule.get('weekday', {}).values() for v in [list(d.values())][0])
    print("  Weekday total trains: %d" % sum(len(t) for t in schedule.get('weekday', {}).values()))
    print("  Weekend total trains: %d" % sum(len(t) for t in schedule.get('weekend', {}).values()))
    
    lines_output.append({
        'id': cfg['id'],
        'name': cfg['name'],
        'color': cfg['color'],
        'directions': cfg['directions'],
        'stations': stations,
        'schedule': schedule
    })
    print("  Done: %d stations" % len(stations))

# ── Inject into HTML ──
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

lines_json = json.dumps(lines_output, ensure_ascii=False, separators=(',', ':'))
html = html.replace('__LINES__', lines_json, 1)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("\nDone! index.html updated. Size: %d KB" % (len(html.encode('utf-8')) // 1024))
