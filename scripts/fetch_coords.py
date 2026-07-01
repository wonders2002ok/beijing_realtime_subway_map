"""
Fetch station coordinates from AMap POI Search API.
Usage: python scripts/fetch_coords.py [AMAP_KEY]

If AMAP_KEY is not provided, reads from AMAP_KEY environment variable.
Output: data/amap_fetched_coords.json

API docs: https://lbs.amap.com/api/webservice/guide/api/search
"""
import json, os, sys, time, urllib.request, urllib.parse

# ── Stations to search ──
# Format: {station_name: (approx_lng, approx_lat)}
# Approx coords are used as the "city" hint for nearby search.
TARGETS = {
    # 亦庄T1线 (ordered west to east)
    '屈庄': (116.4986, 39.7935),
    '融兴街': (116.5045, 39.7920),
    '瑞合庄': (116.5105, 39.7905),
    '太和桥北': (116.5168, 39.7868),
    '四海庄': (116.5230, 39.7835),
    '九号村': (116.5288, 39.7808),
    '泰和路': (116.5345, 39.7785),
    '鹿圈东': (116.5400, 39.7770),
    '亦庄同仁': (116.5455, 39.7758),
    '亦创会展中心': (116.5505, 39.7748),
    '经海一路': (116.5555, 39.7740),
    '定海园西': (116.5608, 39.7760),
    '定海园': (116.5660, 39.7778),
}

BASE = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE)
OUTPUT_PATH = os.path.join(PROJECT_ROOT, 'data', 'amap_fetched_coords.json')
AMAP_SEARCH_URL = 'https://restapi.amap.com/v3/place/text'

def get_key():
    """Get AMap API key from CLI arg or environment."""
    if len(sys.argv) > 1:
        return sys.argv[1]
    key = os.environ.get('AMAP_KEY', '')
    if not key:
        print("ERROR: AMap API key required.")
        print("  Usage: python scripts/fetch_coords.py YOUR_AMAP_KEY")
        print("  Or set AMAP_KEY environment variable.")
        sys.exit(1)
    return key

def search_station(key, name, lng, lat):
    """Search for a metro station by name and return {lng, lat} or None."""
    params = {
        'key': key,
        'keywords': name + '地铁站',
        'city': '北京',
        'citylimit': 'true',
        'offset': '5',
        'page': '1',
        'extensions': 'base',
        'output': 'JSON',
    }
    url = AMAP_SEARCH_URL + '?' + urllib.parse.urlencode(params)
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'beijing-subway-coord-fetcher/1.0'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        print(f"  ⚠️  {name}: HTTP error — {e}")
        return None

    if data.get('status') != '1' or not data.get('pois'):
        print(f"  ⚠️  {name}: No POI results")
        return None

    # Pick the best match: prefer exact name match, then first result
    best = None
    for poi in data['pois']:
        if poi.get('name', '') == name or name in poi.get('name', ''):
            best = poi
            break
    if not best:
        best = data['pois'][0]

    # AMap POI location format: "lng,lat"
    loc = best.get('location', '')
    if ',' not in loc:
        print(f"  ⚠️  {name}: Invalid location format: {loc}")
        return None

    lng_str, lat_str = loc.split(',')
    return {'lng': float(lng_str), 'lat': float(lat_str)}

def main():
    key = get_key()
    results = {}

    print(f"Fetching coordinates for {len(TARGETS)} stations from AMap POI API...")
    for name, (approx_lng, approx_lat) in TARGETS.items():
        coord = search_station(key, name, approx_lng, approx_lat)
        if coord:
            # Round to 6 decimal places for consistency
            coord = {'lng': round(coord['lng'], 6), 'lat': round(coord['lat'], 6)}
            results[name] = coord
            print(f"  ✅ {name}: {coord['lng']}, {coord['lat']}")
        else:
            results[name] = None
            print(f"  ❌ {name}: Not found")
        time.sleep(0.2)  # Rate limit: ~5 req/s

    # Only keep successful results
    successful = {k: v for k, v in results.items() if v is not None}
    failed = [k for k, v in results.items() if v is None]

    print(f"\nResults: {len(successful)}/{len(TARGETS)} stations found.")

    if failed:
        print(f"Failed ({len(failed)}): {', '.join(failed)}")
        print("These will continue using MANUAL_COORDS from build.py.")

    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump({'fetched': successful, 'failed': failed, 'source': 'AMap POI Search API'}, f, ensure_ascii=False, indent=2)

    print(f"Saved to: {OUTPUT_PATH}")

if __name__ == '__main__':
    main()
