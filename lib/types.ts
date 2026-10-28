export type ModelStatus = "pending" | "processing" | "ready" | "failed";

export interface StockItem {
  id: string;
  name: string;
  quantity: number;
  /** foto original enviada */
  photo: string;
  /** foto sem fundo (PNG transparente), usada no modo recorte */
  cutout: string | null;
  /** altura real aproximada do item em metros */
  height: number;
  /** modelo 3D gerado pela IA (.glb) */
  glb: string | null;
  status: ModelStatus;
  provider: "meshy" | "trellis" | "cutout";
  taskId: string | null;
  progress: number;
  error: string | null;
  createdAt: number;
}

export interface Venue {
  id: string;
  name: string;
  photo: string;
  createdAt: number;
}

export interface PlacedItem {
  uid: string;
  itemId: string;
  x: number;
  z: number;
  rotation: number;
  scale: number;
}

export type BackdropMode = "none" | "wall" | "floor" | "panorama";

export interface PartyEvent {
  id: string;
  name: string;
  venueId: string | null;
  backdrop: BackdropMode;
  width: number;
  depth: number;
  floorColor: string;
  placed: PlacedItem[];
  updatedAt: number;
}

export interface Db {
  items: StockItem[];
  venues: Venue[];
  events: PartyEvent[];
}
