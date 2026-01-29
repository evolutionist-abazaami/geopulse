/**
 * Shapefile Import/Export Utilities
 * Support for .shp, .dbf, .shx, .prj files for GIS compatibility
 */

import * as shapefile from 'shapefile';
import { AnalysisFeature, toGeoJSON, downloadFile } from './gis-export';

export interface ShapefileImportResult {
  features: AnalysisFeature[];
  properties: Record<string, any>[];
  bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
  crs?: string;
}

/**
 * Parse a shapefile from ArrayBuffer
 */
export async function parseShapefile(
  shpBuffer: ArrayBuffer,
  dbfBuffer?: ArrayBuffer
): Promise<ShapefileImportResult> {
  const features: AnalysisFeature[] = [];
  const properties: Record<string, any>[] = [];
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;

  try {
    const source = await shapefile.open(shpBuffer, dbfBuffer);
    
    let result = await source.read();
    let index = 0;
    
    while (!result.done) {
      const feature = result.value;
      
      if (feature && feature.geometry) {
        let lat: number, lng: number;
        
        // Extract centroid based on geometry type
        switch (feature.geometry.type) {
          case 'Point':
            lng = feature.geometry.coordinates[0];
            lat = feature.geometry.coordinates[1];
            break;
          case 'Polygon':
          case 'MultiPolygon':
            // Calculate centroid
            const coords = feature.geometry.type === 'Polygon'
              ? feature.geometry.coordinates[0]
              : feature.geometry.coordinates[0][0];
            const centroid = calculateCentroid(coords as [number, number][]);
            lng = centroid[0];
            lat = centroid[1];
            break;
          case 'LineString':
          case 'MultiLineString':
            // Use midpoint of line
            const lineCoords = feature.geometry.type === 'LineString'
              ? feature.geometry.coordinates
              : feature.geometry.coordinates[0];
            const midIndex = Math.floor(lineCoords.length / 2);
            lng = lineCoords[midIndex][0];
            lat = lineCoords[midIndex][1];
            break;
          default:
            result = await source.read();
            continue;
        }

        // Update bounds
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);

        // Extract properties
        const props = feature.properties || {};
        properties.push(props);

        // Create AnalysisFeature
        features.push({
          id: `shp_${index}_${Date.now()}`,
          name: props.name || props.NAME || props.Name || `Feature ${index + 1}`,
          coordinates: { lat, lng },
          eventType: detectEventType(props),
          changePercent: extractChangePercent(props),
          startDate: extractDate(props, 'start') || new Date().toISOString().split('T')[0],
          endDate: extractDate(props, 'end') || new Date().toISOString().split('T')[0],
          summary: props.summary || props.SUMMARY || props.description || props.DESCRIPTION || '',
          areaAnalyzed: extractArea(props),
          createdAt: new Date().toISOString(),
        });
      }

      result = await source.read();
      index++;
    }

    return {
      features,
      properties,
      bounds: { minLat, maxLat, minLng, maxLng },
    };
  } catch (error) {
    console.error('Error parsing shapefile:', error);
    throw new Error(`Failed to parse shapefile: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Calculate centroid of a polygon
 */
function calculateCentroid(coords: [number, number][]): [number, number] {
  let sumLng = 0, sumLat = 0;
  const n = coords.length - 1; // Exclude closing point
  
  for (let i = 0; i < n; i++) {
    sumLng += coords[i][0];
    sumLat += coords[i][1];
  }
  
  return [sumLng / n, sumLat / n];
}

/**
 * Detect event type from properties
 */
function detectEventType(props: Record<string, any>): string {
  const typeFields = ['event_type', 'eventType', 'EVENT_TYPE', 'type', 'TYPE', 'class', 'CLASS', 'category'];
  
  for (const field of typeFields) {
    if (props[field]) {
      return String(props[field]).toLowerCase().replace(/\s+/g, '_');
    }
  }
  
  // Try to infer from other fields
  const allValues = Object.values(props).join(' ').toLowerCase();
  if (allValues.includes('deforest') || allValues.includes('forest')) return 'deforestation';
  if (allValues.includes('flood')) return 'flood';
  if (allValues.includes('drought')) return 'drought';
  if (allValues.includes('fire') || allValues.includes('burn')) return 'wildfire';
  if (allValues.includes('urban')) return 'urbanization';
  
  return 'environmental_change';
}

/**
 * Extract change percentage from properties
 */
function extractChangePercent(props: Record<string, any>): number | undefined {
  const percentFields = ['change_percent', 'changePercent', 'CHANGE_PERCENT', 'change', 'CHANGE', 'percent', 'PERCENT'];
  
  for (const field of percentFields) {
    if (props[field] !== undefined) {
      const value = parseFloat(String(props[field]));
      if (!isNaN(value)) return value;
    }
  }
  
  return undefined;
}

/**
 * Extract date from properties
 */
function extractDate(props: Record<string, any>, type: 'start' | 'end'): string | null {
  const startFields = ['start_date', 'startDate', 'START_DATE', 'date_start', 'begin', 'BEGIN'];
  const endFields = ['end_date', 'endDate', 'END_DATE', 'date_end', 'end', 'END'];
  const dateFields = ['date', 'DATE', 'timestamp', 'TIMESTAMP'];
  
  const fields = type === 'start' ? [...startFields, ...dateFields] : [...endFields, ...dateFields];
  
  for (const field of fields) {
    if (props[field]) {
      const date = new Date(props[field]);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
  }
  
  return null;
}

/**
 * Extract area from properties
 */
function extractArea(props: Record<string, any>): string | undefined {
  const areaFields = ['area', 'AREA', 'area_km2', 'AREA_KM2', 'area_analyzed', 'size', 'SIZE'];
  
  for (const field of areaFields) {
    if (props[field] !== undefined) {
      const value = props[field];
      if (typeof value === 'number') {
        return `${value.toFixed(2)} km²`;
      }
      return String(value);
    }
  }
  
  return undefined;
}

/**
 * Read file as ArrayBuffer
 */
export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Export GeoJSON as Shapefile (simplified - creates JSON with .shp.json extension)
 * Note: Full shapefile export requires complex binary encoding; this creates a compatible format
 */
export function exportAsShapefile(
  features: AnalysisFeature[],
  filename: string = "geopulse-export"
): void {
  const geoJSON = toGeoJSON(features);
  
  // Create GeoJSON that can be imported by QGIS
  const shapefileJSON = {
    ...geoJSON,
    metadata: {
      generator: "GeoPulse Environmental Intelligence Platform",
      exportDate: new Date().toISOString(),
      featureCount: features.length,
      projection: "EPSG:4326",
      format: "GeoJSON (QGIS/ArcGIS Compatible)"
    }
  };
  
  downloadFile(
    JSON.stringify(shapefileJSON, null, 2),
    `${filename}.geojson`,
    "application/geo+json"
  );
}

/**
 * Generate PRJ file content for WGS84
 */
export function getWGS84PRJ(): string {
  return 'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["Degree",0.017453292519943295]]';
}
