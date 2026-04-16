export type Side = 'american' | 'british' | 'french' | 'hessian' | 'neutral'
  | 'confederate' | 'german' | 'russian' | 'japanese' | 'ottoman';
export type MarkerType = 'position' | 'commander' | 'landmark' | 'event' | 'artillery' | 'fortification';
export type MovementType = 'advance' | 'retreat' | 'flanking' | 'naval' | 'encirclement';
export type ZoneType = 'fortification' | 'battlefield' | 'encampment' | 'territory';
export type Outcome =
  | 'american_victory'
  | 'british_victory'
  | 'french_victory'
  | 'prussian_victory'
  | 'spanish_victory'
  | 'other_victory'
  | 'inconclusive';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label: string;
  description: string;
  side: Side;
  type: MarkerType;
}

export interface Movement {
  id: string;
  points: [number, number][];
  label: string;
  description: string;
  side: Side;
  type: MovementType;
}

export interface Zone {
  id: string;
  points: [number, number][];
  label: string;
  description: string;
  type: ZoneType;
  side: Side;
}

export interface BattleData {
  name: string;
  date: string;
  location: string;
  center: [number, number];
  zoom: number;
  description: string;
  outcome: Outcome;
  outcomeLabel: string;
  significance: string;
  commanders: Partial<Record<Exclude<Side, 'neutral'> | 'other', string[]>>;
  casualties: Partial<Record<Exclude<Side, 'neutral'> | 'other', string>>;
  markers: MapMarker[];
  movements: Movement[];
  zones: Zone[];
}
