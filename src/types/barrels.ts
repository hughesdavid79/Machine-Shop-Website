export interface Barrel {
  id: number;
  filled: boolean;
}

export interface BarrelType {
  id: number;
  type: string;
  color: string;
  threshold: number;
  decrementOnFill: boolean;
  barrels: Barrel[];
} 