// src/app/api/products/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        stocks: {
          include: { warehouse: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const response = products.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      stocks: p.stocks.map((s) => ({
        warehouseId: s.warehouseId,
        warehouseName: s.warehouse.name,
        available: Math.max(0, s.total - s.reserved),
        reserved: s.reserved,
        total: s.total,
      })),
    }));

    return NextResponse.json(response);
  } catch (err) {
    console.error("[GET /api/products]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
