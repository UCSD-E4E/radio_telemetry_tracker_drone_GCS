export interface MapSource {
  id: string;
  name: string;
  attribution: string;
  minZoom: number;
  maxZoom: number;
}

export const MAP_SOURCES: MapSource[] = [
  {
    id: 'osm',
    name: 'OpenStreetMap',
    attribution: '© OpenStreetMap contributors',
    minZoom: 0,
    maxZoom: 19
  },
  {
    id: 'satellite',
    name: 'Satellite',
    attribution: '© Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    minZoom: 0,
    maxZoom: 19
  }
];

export const OFFLINE_MODE_KEY = 'mapOfflineMode'; 