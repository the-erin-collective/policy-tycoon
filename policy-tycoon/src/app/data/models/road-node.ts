import { Direction } from './city-generation';

export interface RoadNode {
  x: number;
  z: number;
  connections: Direction[];
  isIntersection: boolean;
  isDeadEnd: boolean;
}
