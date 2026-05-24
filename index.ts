// src/types/index.ts
export type ReservationStatus = "PENDING" | "CONFIRMED" | "RELEASED";

export interface ProductWithStock {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stocks: {
    warehouseId: string;
    warehouseName: string;
    available: number; // total - reserved
    reserved: number;
    total: number;
  }[];
}

export interface WarehouseResponse {
  id: string;
  name: string;
  location: string;
}

export interface ReservationResponse {
  id: string;
  productId: string;
  productName: string;
  warehouseId: string;
  warehouseName: string;
  quantity: number;
  status: ReservationStatus;
  expiresAt: string;
  createdAt: string;
}
