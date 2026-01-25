/**
 * GIS Export Utilities
 * Convert analysis data to GeoJSON and KML formats for use in QGIS and other GIS software
 */

export interface AnalysisFeature {
  id: string;
  name: string;
  coordinates: { lat: number; lng: number };
  eventType: string;
  changePercent?: number;
  startDate: string;
  endDate: string;
  summary?: string;
  areaAnalyzed?: string;
  createdAt: string;
}

export interface GeoJSONFeature {
  type: "Feature";
  properties: Record<string, any>;
  geometry: {
    type: "Point" | "Polygon";
    coordinates: number[] | number[][][];
  };
}

export interface GeoJSONCollection {
  type: "FeatureCollection";
  name: string;
  crs: {
    type: "name";
    properties: {
      name: string;
    };
  };
  features: GeoJSONFeature[];
}

/**
 * Generate a bounding polygon around a point location
 */
function generateBoundingPolygon(
  lng: number,
  lat: number,
  size: number = 0.15
): number[][] {
  return [
    [lng - size, lat + size],
    [lng + size, lat + size],
    [lng + size, lat - size],
    [lng - size, lat - size],
    [lng - size, lat + size], // Close the polygon
  ];
}

/**
 * Convert analysis results to GeoJSON format
 */
export function toGeoJSON(
  features: AnalysisFeature[],
  collectionName: string = "GeoPulse Analysis Export",
  includePolygons: boolean = true
): GeoJSONCollection {
  const geoJSONFeatures: GeoJSONFeature[] = [];

  features.forEach((feature) => {
    const { lat, lng } = feature.coordinates;

    // Add point feature
    geoJSONFeatures.push({
      type: "Feature",
      properties: {
        id: feature.id,
        name: feature.name,
        event_type: feature.eventType,
        change_percent: feature.changePercent || 0,
        start_date: feature.startDate,
        end_date: feature.endDate,
        summary: feature.summary || "",
        area_analyzed: feature.areaAnalyzed || "",
        created_at: feature.createdAt,
        geometry_type: "point",
      },
      geometry: {
        type: "Point",
        coordinates: [lng, lat], // GeoJSON uses [lng, lat]
      },
    });

    // Add polygon feature if requested
    if (includePolygons) {
      geoJSONFeatures.push({
        type: "Feature",
        properties: {
          id: `${feature.id}_boundary`,
          name: `${feature.name} - Analysis Area`,
          event_type: feature.eventType,
          change_percent: feature.changePercent || 0,
          start_date: feature.startDate,
          end_date: feature.endDate,
          geometry_type: "polygon",
        },
        geometry: {
          type: "Polygon",
          coordinates: [generateBoundingPolygon(lng, lat)],
        },
      });
    }
  });

  return {
    type: "FeatureCollection",
    name: collectionName,
    crs: {
      type: "name",
      properties: {
        name: "urn:ogc:def:crs:OGC:1.3:CRS84", // WGS84
      },
    },
    features: geoJSONFeatures,
  };
}

/**
 * Convert analysis results to KML format
 */
export function toKML(
  features: AnalysisFeature[],
  documentName: string = "GeoPulse Analysis Export"
): string {
  const placemarks = features
    .map((feature) => {
      const { lat, lng } = feature.coordinates;
      const changePercent = feature.changePercent || 0;
      
      // Color based on change severity (KML uses AABBGGRR format)
      const color = changePercent > 50 
        ? "ff0000ff" // Red
        : changePercent > 25 
        ? "ff00a5ff" // Orange
        : "ff00ff00"; // Green

      const polygonCoords = generateBoundingPolygon(lng, lat)
        .map((coord) => `${coord[0]},${coord[1]},0`)
        .join(" ");

      return `
    <Placemark>
      <name>${escapeXML(feature.name)}</name>
      <description><![CDATA[
        <h3>${escapeXML(feature.eventType.replace(/_/g, " ").toUpperCase())}</h3>
        <p><strong>Change Detected:</strong> ${changePercent}%</p>
        <p><strong>Analysis Period:</strong> ${feature.startDate} to ${feature.endDate}</p>
        <p><strong>Coordinates:</strong> ${lat.toFixed(6)}, ${lng.toFixed(6)}</p>
        ${feature.summary ? `<p><strong>Summary:</strong> ${escapeXML(feature.summary)}</p>` : ""}
        ${feature.areaAnalyzed ? `<p><strong>Area:</strong> ${escapeXML(feature.areaAnalyzed)}</p>` : ""}
        <p><strong>Created:</strong> ${new Date(feature.createdAt).toLocaleDateString()}</p>
      ]]></description>
      <ExtendedData>
        <Data name="event_type"><value>${feature.eventType}</value></Data>
        <Data name="change_percent"><value>${changePercent}</value></Data>
        <Data name="start_date"><value>${feature.startDate}</value></Data>
        <Data name="end_date"><value>${feature.endDate}</value></Data>
      </ExtendedData>
      <Style>
        <IconStyle>
          <color>${color}</color>
          <scale>1.2</scale>
          <Icon>
            <href>http://maps.google.com/mapfiles/kml/shapes/placemark_circle.png</href>
          </Icon>
        </IconStyle>
        <PolyStyle>
          <color>4d${color.slice(2)}</color>
          <outline>1</outline>
        </PolyStyle>
        <LineStyle>
          <color>${color}</color>
          <width>2</width>
        </LineStyle>
      </Style>
      <MultiGeometry>
        <Point>
          <coordinates>${lng},${lat},0</coordinates>
        </Point>
        <Polygon>
          <outerBoundaryIs>
            <LinearRing>
              <coordinates>${polygonCoords}</coordinates>
            </LinearRing>
          </outerBoundaryIs>
        </Polygon>
      </MultiGeometry>
    </Placemark>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXML(documentName)}</name>
    <description>Exported from GeoPulse - Environmental Monitoring Platform</description>
    <Style id="analysisStyle">
      <IconStyle>
        <scale>1.2</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/shapes/placemark_circle.png</href>
        </Icon>
      </IconStyle>
    </Style>
    ${placemarks}
  </Document>
</kml>`;
}

/**
 * Escape special XML characters
 */
function escapeXML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Download a file with the given content
 */
export function downloadFile(
  content: string,
  filename: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export analysis data as GeoJSON file
 */
export function exportAsGeoJSON(
  features: AnalysisFeature[],
  filename: string = "geopulse-export"
): void {
  const geoJSON = toGeoJSON(features);
  downloadFile(
    JSON.stringify(geoJSON, null, 2),
    `${filename}.geojson`,
    "application/geo+json"
  );
}

/**
 * Export analysis data as KML file
 */
export function exportAsKML(
  features: AnalysisFeature[],
  filename: string = "geopulse-export"
): void {
  const kml = toKML(features);
  downloadFile(kml, `${filename}.kml`, "application/vnd.google-earth.kml+xml");
}

/**
 * Convert database analysis result to AnalysisFeature format
 */
export function dbResultToFeature(result: any): AnalysisFeature | null {
  // Handle coordinates in various formats
  let coords = result.coordinates;
  if (typeof coords === "string") {
    try {
      coords = JSON.parse(coords);
    } catch {
      return null;
    }
  }

  if (!coords || (typeof coords.lat !== "number" && typeof coords.latitude !== "number")) {
    return null;
  }

  return {
    id: result.id,
    name: result.region || result.location_name || "Unknown Location",
    coordinates: {
      lat: coords.lat || coords.latitude,
      lng: coords.lng || coords.longitude || coords.lon,
    },
    eventType: result.event_type,
    changePercent: result.change_percent,
    startDate: result.start_date,
    endDate: result.end_date,
    summary: result.summary,
    areaAnalyzed: result.area_analyzed,
    createdAt: result.created_at,
  };
}
