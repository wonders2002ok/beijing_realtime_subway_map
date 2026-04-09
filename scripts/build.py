"""
Beijing Subway Real-Time Simulation Builder v2
Uses Beijing-Subway-Tools JSON5 data (24 lines) + Amap coordinates.
Outputs a single-file HTML with all data embedded.
"""
import json, os, sys

try:
    import pyjson5
except ImportError:
    print("ERROR: pyjson5 not installed. Run: pip install pyjson5")
    sys.exit(1)

BASE = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE)
AMAP_PATH = os.path.join(PROJECT_ROOT, 'data', 'amap_beijing.json')
TOOLS_DATA = os.path.join(PROJECT_ROOT, '..', 'Beijing-Subway-Tools', 'data', 'beijing')
TEMPLATE_PATH = os.path.join(PROJECT_ROOT, 'template.html')
OUTPUT_PATH = os.path.join(PROJECT_ROOT, 'index.html')

# ── Load Amap coordinates ──
print("Loading Amap coordinates...")
with open(AMAP_PATH, 'r', encoding='utf-8') as f:
    amap = json.load(f)

amap_stations = {}  # station_name -> {lng, lat}
for ln_data in amap.get('l', []):
    for st in ln_data.get('st', []):
        name = st.get('n', '')
        sl = st.get('sl', '')
        if ',' in sl and name not in amap_stations:
            lng, lat = sl.split(',')
            amap_stations[name] = {'lng': float(lng), 'lat': float(lat)}

# Manual coordinates for newer stations not yet in Amap (T1 line approximate)
# T1 line runs roughly east-west in Yizhuang area (~116.50-116.56 lng, ~39.77-39.80 lat)
MANUAL_COORDS = {
    # 亦庄T1线 (ordered west to east as per line data)
    '屈庄': {'lng': 116.4986, 'lat': 39.7935},
    '融兴街': {'lng': 116.5045, 'lat': 39.7920},
    '瑞合庄': {'lng': 116.5105, 'lat': 39.7905},
    '太和桥北': {'lng': 116.5168, 'lat': 39.7868},
    '四海庄': {'lng': 116.5230, 'lat': 39.7835},
    '九号村': {'lng': 116.5288, 'lat': 39.7808},
    '泰和路': {'lng': 116.5345, 'lat': 39.7785},
    '鹿圈东': {'lng': 116.5400, 'lat': 39.7770},
    '亦庄同仁': {'lng': 116.5455, 'lat': 39.7758},
    '亦创会展中心': {'lng': 116.5505, 'lat': 39.7748},
    '经海一路': {'lng': 116.5555, 'lat': 39.7740},
    '定海园西': {'lng': 116.5608, 'lat': 39.7760},
    '定海园': {'lng': 116.5660, 'lat': 39.7778},
}
amap_stations.update(MANUAL_COORDS)

print("  Amap: %d unique stations (+ %d manual)" % (len(amap_stations) - len(MANUAL_COORDS), len(MANUAL_COORDS)))

# ── Delta expansion ──
def expand_delta(first_train, delta_arr):
    """Expand delta format schedule into list of 'HH:MM' strings."""
    def _expand(arr):
        result = []
        for item in arr:
            if isinstance(item, list):
                if len(item) == 2 and isinstance(item[0], int) and isinstance(item[1], list):
                    count, inner = item
                    result.extend(_expand(inner) * count)
                else:
                    result.extend(_expand(item))
            else:
                result.append(int(item))
        return result
    
    h, m = int(first_train[:2]), int(first_train[3:])
    base = h * 60 + m
    times = [first_train]
    for d in _expand(delta_arr):
        base += d
        times.append('%02d:%02d' % (base // 60, base % 60))
    return times

def get_all_times(schedule_blocks):
    """Given a list of schedule blocks, return all train times."""
    all_t = []
    for block in schedule_blocks:
        if 'trains' in block:
            all_t.extend(block['trains'])
        elif 'first_train' in block:
            all_t.extend(expand_delta(block['first_train'], block.get('delta', [])))
    return all_t

def time_to_min(t):
    """Convert 'HH:MM' string to minutes since midnight."""
    return int(t[:2]) * 60 + int(t[3:])

def apply_filters(all_times, filters):
    """
    Given all departure times and a list of filters, return a set of indices
    that belong to non-loop (回库车) trains.
    
    Each filter marks certain trains as belonging to a specific route plan.
    Routes with {loop: false} or 'ends_with' mean the train terminates early.
    
    Returns: dict mapping route_plan_name -> set of time indices (into all_times).
    """
    route_indices = {}
    for filt in filters:
        plan = filt.get('plan', '')
        route_data = filt.get('route_data', {})
        
        # Find matching train indices
        indices = set()
        
        if 'trains' in filt and filt['trains']:
            # Exact time list
            for t_str in filt['trains']:
                t_min = time_to_min(t_str)
                for i, t in enumerate(all_times):
                    if time_to_min(t) == t_min:
                        indices.add(i)
        
        if 'first_train' in filt:
            first_min = time_to_min(filt['first_train'])
            start_idx = None
            for i, t in enumerate(all_times):
                if time_to_min(t) >= first_min:
                    start_idx = i
                    break
            
            if start_idx is not None:
                if 'until' in filt:
                    until_min = time_to_min(filt['until'])
                    end_idx = start_idx
                    for i in range(start_idx, len(all_times)):
                        if time_to_min(all_times[i]) <= until_min:
                            end_idx = i
                        else:
                            break
                    # All trains from start_idx to end_idx
                    candidates = list(range(start_idx, end_idx + 1))
                    skip = filt.get('skip_trains', 0)
                    count = filt.get('count', None)
                    
                    # Apply skip: take every (skip+1)-th train
                    selected = candidates[skip::skip + 1] if skip > 0 else candidates
                    if count:
                        selected = selected[:count]
                    indices.update(selected)
                else:
                    # first_train without until: single train or count from that point
                    skip = filt.get('skip_trains', 0)
                    count = filt.get('count', 1)
                    candidates = list(range(start_idx, len(all_times)))
                    selected = candidates[skip::skip + 1] if skip > 0 else candidates
                    selected = selected[:count]
                    indices.update(selected)
        
        if indices:
            if plan not in route_indices:
                route_indices[plan] = set()
            route_indices[plan].update(indices)
    
    return route_indices

def parse_train_endpoints(directions, train_routes, timetable, date_groups, first_station):
    """
    For loop lines, parse filters to determine which trains are non-loop (回库车).
    
    Returns: dict[dkey][mk] = list where index i = terminal station name or None (full loop).
    """
    if not train_routes:
        return {}
    
    endpoints = {}
    for dir_name, dir_data in train_routes.items():
        if dir_name in ('aliases', 'icon'):
            continue
        
        dkey = dir_name
        
        # Find non-loop route plans and short-turn routes (回库车 / 终点车)
        non_loop_plans = {}
        for route_name, route_info in dir_data.items():
            if route_name in ('aliases', 'icon', 'reversed', '环行'):
                continue
            # A train is "non-loop" if it has loop:false OR ends_with (short-turn)
            is_nonloop = not route_info.get('loop', True)
            has_end = 'ends_with' in route_info
            if is_nonloop or has_end:
                # Determine terminal station
                terminal = route_info.get('ends_with')
                if not terminal and '回库车' in route_name:
                    terminal = route_name.replace('回库车', '').strip()
                if terminal:
                    non_loop_plans[route_name] = terminal
        
        if not non_loop_plans:
            continue
        
        endpoints[dkey] = {}
        for dg_name in date_groups:
            # Map to standard key
            weekday_days = date_groups[dg_name].get('weekday', [])
            if set(weekday_days) <= {1, 2, 3, 4, 5} and weekday_days:
                mk = '工作日'
            elif set(weekday_days) <= {6, 7} and weekday_days:
                mk = '双休日'
            elif dg_name in ('全日',):
                mk = 'both'
            else:
                mk = dg_name
            
            keys = [mk] if mk != 'both' else ['工作日', '双休日']
            for k in keys:
                if k in endpoints[dkey]:
                    continue
                
                # Get departure times and filters from first station
                st_tt = timetable.get(first_station, {}).get(dkey, {}).get(dg_name, {})
                sched_blocks = st_tt.get('schedule', [])
                filters_raw = st_tt.get('filters', [])
                
                if not sched_blocks or not filters_raw:
                    endpoints[dkey][k] = None
                    continue
                
                all_times = get_all_times(sched_blocks)
                
                # Attach route_data to each filter for terminal station lookup
                enriched_filters = []
                for f in filters_raw:
                    plan = f.get('plan', '')
                    if plan in non_loop_plans:
                        ef = dict(f)
                        ef['route_data'] = dir_data.get(plan, {})
                        ef['_terminal'] = non_loop_plans[plan]
                        enriched_filters.append(ef)
                
                if not enriched_filters:
                    endpoints[dkey][k] = None
                    continue
                
                route_indices = apply_filters(all_times, enriched_filters)
                
                # Build endpoint list: index i = terminal name or None
                ep_list = [None] * len(all_times)
                for plan, indices in route_indices.items():
                    terminal = non_loop_plans.get(plan)
                    for idx in indices:
                        if idx < len(ep_list):
                            ep_list[idx] = terminal
                
                endpoints[dkey][k] = ep_list
    
    return endpoints

# ── Load all line data ──
LINE_FILE_NAMES = [
    'line1.json5', 'line2.json5', 'line3.json5', 'line4.json5', 'line5.json5',
    'line6.json5', 'line7.json5', 'line8.json5', 'line9.json5', 'line10.json5',
    'line11.json5', 'line12.json5', 'line13.json5', 'line14.json5', 'line15.json5',
    'line16.json5', 'line17.json5', 'line18.json5', 'line19.json5',
    'fangshan-line.json5', 'yizhuang-line.json5', 'yanfang-line.json5',
    'changping-line.json5', 'line-s1.json5',
    'xijiao-line.json5', 'yizhuang-t1-line.json5',
    'capital-airport-express.json5', 'daxing-airport-express.json5',
]

lines_output = []
station_coord_missing = set()

for fn in LINE_FILE_NAMES:
    fp = os.path.join(TOOLS_DATA, fn)
    if not os.path.exists(fp):
        print("  SKIP: %s not found" % fn)
        continue
    
    data = pyjson5.load(open(fp, encoding='utf-8'))
    name = data['name']
    color = data.get('color', '#888888')
    is_loop = data.get('loop', False)
    stations_raw = data['stations']
    train_routes = data['train_routes']
    date_groups = data['date_groups']
    timetable = data['timetable']
    
    # Build station list with coordinates
    stations = []
    for i, st in enumerate(stations_raw):
        sname = st['name']
        coord = amap_stations.get(sname)
        # Fuzzy match: strip parenthetical suffix, e.g. "木樨地(16号线)" -> "木樨地"
        if not coord and '(' in sname:
            base = sname.split('(')[0]
            coord = amap_stations.get(base)
        # Also add with offset for disambiguated stations (to avoid overlapping)
        if coord and '(' in sname:
            # Slight offset so they don't overlap on map
            coord = {'lng': coord['lng'] + 0.0008, 'lat': coord['lat'] + 0.0005}
        if coord:
            stations.append({'name': sname, 'lng': coord['lng'], 'lat': coord['lat']})
        else:
            station_coord_missing.add(sname)
            stations.append({'name': sname, 'lng': None, 'lat': None})
    
    if not stations:
        print("  SKIP: %s has no stations" % name)
        continue
    
    # Build directions
    directions = []
    for dir_name, dir_data in train_routes.items():
        if dir_name in ('aliases', 'icon'):
            continue
        reversed = dir_data.get('reversed', False)
        # Get route names (excluding aliases)
        routes = [k for k in dir_data.keys() if k not in ('aliases', 'icon', 'reversed')]
        directions.append({
            'key': dir_name,
            'label': dir_name,
            'reversed': reversed,
            'routes': routes
        })
    
    # Build schedule: for each direction x date_group -> list of departure times from each station
    # Store as minute integers for faster JS parsing
    # Handle special date groups by mapping to weekday/weekend
    schedule = {}
    for dir_name in directions:
        dkey = dir_name['key']
        schedule[dkey] = {}
        for dg_name, dg_data in date_groups.items():
            # Map special date groups to standard weekday/weekend for simulation
            weekday_days = dg_data.get('weekday', [])
            # Determine if this date group maps to weekdays or weekends
            if set(weekday_days) <= {1, 2, 3, 4, 5} and weekday_days:
                mapped_key = '工作日'
            elif set(weekday_days) <= {6, 7} and weekday_days:
                mapped_key = '双休日'
            elif dg_name in ('全日',):
                # Applies to both, store under both keys
                mapped_key = 'both'
            elif dg_name in ('平常日', '平日', '星期五', '重点保障'):
                # 平常日/平日 ≈ weekdays, 星期五/重点保障 are special but approximate
                if '周五' in dg_name or '星期五' in dg_name or '重点保障' in dg_name:
                    mapped_key = '工作日'  # approximate
                else:
                    mapped_key = '工作日'  # 平常日/平日 ≈ weekdays
            elif dg_name == '周日':
                mapped_key = '双休日'
            else:
                mapped_key = dg_name  # keep as-is

            keys = [mapped_key] if mapped_key != 'both' else ['工作日', '双休日']
            for mk in keys:
                if mk not in schedule[dkey]:
                    schedule[dkey][mk] = {}
                for st_obj in stations_raw:
                    sname = st_obj['name']
                    if sname not in timetable:
                        continue
                    st_tt = timetable[sname]
                    if dkey not in st_tt:
                        continue
                    if dg_name not in st_tt[dkey]:
                        continue
                    st_data = st_tt[dkey][dg_name]
                    sched_blocks = st_data.get('schedule', [])
                    all_times = get_all_times(sched_blocks)
                    if all_times:
                        minutes_list = [int(t[:2]) * 60 + int(t[3:]) for t in all_times]
                        schedule[dkey][mk][sname] = minutes_list
    
    # Parse train endpoints for loop lines (回库车 terminate early)
    train_endpoints = {}
    if is_loop:
        train_endpoints = parse_train_endpoints(
            directions, train_routes, timetable, date_groups,
            stations_raw[0]['name']
        )
        if train_endpoints:
            ep_count = sum(
                sum(1 for v in ep if v is not None)
                for dkey in train_endpoints
                for ep in train_endpoints[dkey].values()
                if ep
            )
            print("    trainEndpoints: %d entries" % ep_count)
    
    line_info = {
        'name': name,
        'color': color,
        'loop': is_loop,
        'directions': directions,
        'stations': stations,
        'schedule': schedule,
        'trainEndpoints': train_endpoints,
        # Raw route info for tooltip display
        'routeNames': {dkey: dir_data['routes'] for dkey, dir_data in [(d['key'], d) for d in directions]}
    }
    lines_output.append(line_info)
    
    print("  %s: %d stations, %d dirs, loop=%s" % (name, len(stations), len(directions), is_loop))

if station_coord_missing:
    print("\nWARNING: Missing Amap coordinates for %d stations:" % len(station_coord_missing))
    for s in sorted(station_coord_missing):
        print("  - %s" % s)

print("\nTotal lines loaded: %d" % len(lines_output))

# ── Generate output files ──
import shutil

# 1. Generate js/data.js from js/data.template.js
DATA_TEMPLATE = os.path.join(PROJECT_ROOT, 'js', 'data.template.js')
DATA_OUTPUT = os.path.join(PROJECT_ROOT, 'js', 'data.js')

print("\nGenerating js/data.js...")
with open(DATA_TEMPLATE, 'r', encoding='utf-8') as f:
    data_js = f.read()

lines_json = json.dumps(lines_output, ensure_ascii=False, separators=(',', ':'))
data_js = data_js.replace('__LINES__', lines_json, 1)

with open(DATA_OUTPUT, 'w', encoding='utf-8') as f:
    f.write(data_js)

data_kb = len(data_js.encode('utf-8')) // 1024
print("  js/data.js (%d KB)" % data_kb)

# 2. Copy template.html -> index.html
print("Copying template.html -> index.html...")
shutil.copy2(TEMPLATE_PATH, OUTPUT_PATH)

print("Output: %s" % OUTPUT_PATH)
print("Done!")
