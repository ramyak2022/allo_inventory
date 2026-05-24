// prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clear existing data
  await prisma.reservation.deleteMany();
  await prisma.stock.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();

  // Warehouses
  const mumbai = await prisma.warehouse.create({
    data: { name: "Mumbai Hub", location: "Mumbai, Maharashtra" },
  });
  const delhi = await prisma.warehouse.create({
    data: { name: "Delhi Hub", location: "New Delhi, Delhi" },
  });
  const bangalore = await prisma.warehouse.create({
    data: { name: "Bangalore Hub", location: "Bangalore, Karnataka" },
  });

  // Products
  const products = [
    {
      name: "Wireless Noise-Cancelling Headphones",
      description: "Premium audio with 30hr battery and active noise cancellation.",
      price: 799900,
    },
    {
      name: "Ergonomic Mechanical Keyboard",
      description: "Tactile switches, RGB backlight, built for long coding sessions.",
      price: 499900,
    },
    {
      name: "4K USB-C Monitor",
      description: "27-inch 4K display with USB-C power delivery and HDR support.",
      price: 2999900,
    },
    {
      name: "Portable SSD 1TB",
      description: "1TB NVMe SSD with USB 3.2 Gen 2, read speeds up to 1050 MB/s.",
      price: 849900,
    },
    {
      name: "Smart Home Hub",
      description: "Control all your smart devices from one central hub.",
      price: 349900,
    },
  ];

  for (const p of products) {
    const product = await prisma.product.create({ data: p });

    // Give each product stock in each warehouse (varying amounts to make it interesting)
    const stockLevels = [
      { warehouseId: mumbai.id, total: Math.floor(Math.random() * 20) + 2 },
      { warehouseId: delhi.id, total: Math.floor(Math.random() * 15) + 1 },
      { warehouseId: bangalore.id, total: Math.floor(Math.random() * 10) + 1 },
    ];

    for (const s of stockLevels) {
      await prisma.stock.create({
        data: {
          productId: product.id,
          warehouseId: s.warehouseId,
          total: s.total,
          reserved: 0,
        },
      });
    }
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
