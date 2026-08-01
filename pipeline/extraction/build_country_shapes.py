"""
[SO-HIST] Extracts each SO-Survey country's real boundary shape from the
existing world-countries.geo.json (same file used by GisAiMapSlide.jsx),
projects it into its own local 0-200 x 0-140 coordinate space (each country
is shown individually, zoomed to fit its own panel - not positioned
relative to the rest of the world, so a simple per-country bounding-box
normalization is correct here, not a full map projection), and outputs one
SVG path string per country to a JSON file the React component can import
directly.

Countries needing a rename to match the geojson file's own naming (e.g.
"United States" -> "United States of America") are resolved via the
so_survey_to_geojson_country crosswalk seed. Countries with no boundary
shape at all in this simplified 180-feature world map (has_boundary_shape
= false in that same seed - e.g. Singapore, Hong Kong, too small for this
low-resolution file) are simply skipped here; the frontend falls back to
a flag-colored badge for those instead of a silhouette.
"""
import json
import psycopg2

GEOJSON_PATH = "/tmp/world-countries.geo.json"
OUTPUT_PATH = "country_shapes.json"
VIEWBOX_W = 200
VIEWBOX_H = 140
PADDING = 10


def flatten_coords(geometry):
    """Yields every (lon, lat) point across Polygon or MultiPolygon rings."""
    coords = geometry["coordinates"]
    geom_type = geometry["type"]
    if geom_type == "Polygon":
        for ring in coords:
            for pt in ring:
                yield pt
    elif geom_type == "MultiPolygon":
        for polygon in coords:
            for ring in polygon:
                for pt in ring:
                    yield pt


def build_svg_path(geometry, min_lon, max_lon, min_lat, max_lat):
    """Projects lon/lat into the local viewBox and builds an SVG path string.
    Multiple rings/polygons (e.g. islands) become separate M...Z subpaths
    within one path 'd' attribute, which SVG renders correctly as one shape."""
    lon_range = max(max_lon - min_lon, 0.0001)
    lat_range = max(max_lat - min_lat, 0.0001)
    scale = min(
        (VIEWBOX_W - 2 * PADDING) / lon_range,
        (VIEWBOX_H - 2 * PADDING) / lat_range,
    )

    def project(lon, lat):
        x = PADDING + (lon - min_lon) * scale
        # Flip y: latitude increases northward, SVG y increases downward.
        y = PADDING + (max_lat - lat) * scale
        return round(x, 2), round(y, 2)

    def ring_to_path(ring):
        points = [project(lon, lat) for lon, lat in ring]
        d = f"M{points[0][0]},{points[0][1]} "
        d += " ".join(f"L{x},{y}" for x, y in points[1:])
        d += " Z"
        return d

    coords = geometry["coordinates"]
    geom_type = geometry["type"]
    if geom_type == "Polygon":
        return " ".join(ring_to_path(ring) for ring in coords)
    elif geom_type == "MultiPolygon":
        paths = []
        for polygon in coords:
            for ring in polygon:
                paths.append(ring_to_path(ring))
        return " ".join(paths)
    return ""


with open(GEOJSON_PATH) as f:
    geo = json.load(f)
geo_by_name = {f["properties"]["name"]: f for f in geo["features"]}

conn = psycopg2.connect(
    host="portfolio_postgres", port=5432, dbname="portfolio",
    user="postgres", password="localdevpassword",
)
cur = conn.cursor()
cur.execute("SELECT DISTINCT country FROM dbt_dev_gold.fact_de_tool_by_country_year")
survey_countries = [r[0] for r in cur.fetchall()]

cur.execute("SELECT survey_country, geojson_name, has_boundary_shape FROM dbt_dev.so_survey_to_geojson_country")
crosswalk = {row[0]: (row[1], row[2]) for row in cur.fetchall()}

results = {}
skipped_no_shape = []
skipped_no_match = []

for country in survey_countries:
    geojson_name, has_shape = crosswalk.get(country, (country, True))
    if not has_shape:
        skipped_no_shape.append(country)
        continue
    feature = geo_by_name.get(geojson_name)
    if feature is None:
        skipped_no_match.append(country)
        continue

    geometry = feature["geometry"]
    lons = [pt[0] for pt in flatten_coords(geometry)]
    lats = [pt[1] for pt in flatten_coords(geometry)]
    svg_path = build_svg_path(geometry, min(lons), max(lons), min(lats), max(lats))
    results[country] = svg_path

with open(OUTPUT_PATH, "w") as f:
    json.dump(results, f)

print(f"Built shapes for {len(results)} countries")
print(f"Skipped (no boundary shape available, e.g. small city-states): {len(skipped_no_shape)} - {skipped_no_shape}")
print(f"Skipped (name genuinely didn't match anything): {len(skipped_no_match)} - {skipped_no_match[:10]}")