export interface IRechatGeocode {
  latitude: number;
  longitude: number;
  approximate: boolean;
  confidence: string;
  geo_source: 'Google' | 'Bing' | 'Mapbox';
  formatted_address: string;
  accurate_enough: boolean;
}
