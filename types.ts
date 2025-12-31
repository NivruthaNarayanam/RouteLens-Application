export interface Coordinate {
  lat: number;
  lng: number;
}

export enum LightingLevel {
  GOOD = 'Good',
  MODERATE = 'Moderate',
  POOR = 'Poor',
}

export enum CrowdLevel {
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low',
}

export type RouteMood = 'Calm' | 'Busy' | 'Isolated';

export interface RouteStep {
  instruction: string;
  distance: number; // meters
  duration: number; // seconds
}

export interface RouteSegment {
  coordinates: Coordinate[];
  streetName?: string;
}

export interface RiskInterval {
  startPct: number; // 0.0 to 1.0
  endPct: number;   // 0.0 to 1.0
  type: 'Lighting' | 'Traffic' | 'Crowd';
  description: string;
}

export interface RouteAnalysis {
  safetyScore: number;
  lightingScore: LightingLevel;
  crowdLevel: CrowdLevel;
  mood: RouteMood;
  reasoning: string;
  drawbacks?: string; // Why not this route?
  landmarks: string[];
  tags: string[]; // e.g., ['Safest', 'Fastest', 'Balanced']
  confidence: 'High' | 'Medium' | 'Low';
  riskIntervals?: RiskInterval[];
  riskySegments?: any[]; // Legacy support if needed, preferring riskIntervals
}

export interface NavigationRoute {
  id: string;
  summary: string;
  duration: number; // in seconds
  distance: number; // in meters
  geometry: Coordinate[]; // Full path
  steps: RouteStep[]; // Turn-by-turn instructions
  analysis?: RouteAnalysis;
  color?: string;
}

export interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
}

export type LandmarkType = 'hospital' | 'police' | 'fuel' | 'shop' | 'pharmacy';

export interface Landmark {
  id: string;
  lat: number;
  lng: number;
  name: string;
  type: LandmarkType;
}

export interface DestinationInsight {
  text: string;
  sources: { title: string; uri: string }[];
}

export type UserPreference = 'Safety' | 'Speed' | 'Balanced';
