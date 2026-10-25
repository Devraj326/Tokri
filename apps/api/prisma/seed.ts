import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const STORE = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Tokri Dark Store — Indiranagar',
  lat: 12.9716,
  lng: 77.6412,
  radiusKm: 20000, // demo has a single store; keep it serviceable from any real test device location
};

type SeedProduct = {
  name: string;
  hindiName?: string;
  aliases?: string[];
  category: string;
  brand?: string;
  unit: string;
  tileColor?: 'haldi' | 'clay' | 'methi' | 'mirchi' | 'dust';
  isVeg?: boolean;
  variants: { size: string; mrp: number; price: number; qty: number }[];
};

const CATEGORIES = [
  { name: 'Vegetables & Fruits', slug: 'vegetables-fruits', hindiName: 'सब्ज़ी' },
  { name: 'Grocery & Staples', slug: 'grocery-staples', hindiName: 'राशन' },
  { name: 'Hardware & Tools', slug: 'hardware-tools', hindiName: 'औज़ार' },
  { name: 'Electronics Accessories', slug: 'electronics-accessories', hindiName: 'इलेक्ट्रॉनिक्स' },
  { name: 'Stationery', slug: 'stationery', hindiName: 'स्टेशनरी' },
  { name: 'Cleaning & Household', slug: 'cleaning-household', hindiName: 'सफ़ाई' },
  { name: 'Personal Care', slug: 'personal-care', hindiName: 'पर्सनल केयर' },
];

const PRODUCTS: SeedProduct[] = [
  // --- aloo ki sabzi worked example ---
  { name: 'Potato', hindiName: 'आलू', aliases: ['aloo', 'alu'], category: 'vegetables-fruits', unit: 'g', tileColor: 'clay', isVeg: true, variants: [{ size: '500 g', mrp: 30, price: 26, qty: 200 }, { size: '1 kg', mrp: 55, price: 48, qty: 150 }] },
  { name: 'Onion', hindiName: 'प्याज़', aliases: ['pyaz', 'piyaz'], category: 'vegetables-fruits', unit: 'pc', tileColor: 'clay', isVeg: true, variants: [{ size: '500 g', mrp: 28, price: 24, qty: 180 }] },
  { name: 'Tomato', hindiName: 'टमाटर', aliases: ['tamatar'], category: 'vegetables-fruits', unit: 'pc', tileColor: 'methi', isVeg: true, variants: [{ size: '500 g', mrp: 32, price: 28, qty: 160 }] },
  { name: 'Green Chilli', hindiName: 'हरी मिर्च', aliases: ['hari mirch', 'mirchi'], category: 'vegetables-fruits', unit: 'pc', tileColor: 'methi', isVeg: true, variants: [{ size: '100 g', mrp: 12, price: 10, qty: 220 }] },
  { name: 'Ginger', hindiName: 'अदरक', aliases: ['adrak'], category: 'vegetables-fruits', unit: 'inch', tileColor: 'clay', isVeg: true, variants: [{ size: '100 g', mrp: 20, price: 18, qty: 140 }] },
  { name: 'Jeera Powder', hindiName: 'जीरा पाउडर', aliases: ['cumin powder'], category: 'grocery-staples', unit: 'g', tileColor: 'haldi', variants: [{ size: '100 g', mrp: 45, price: 40, qty: 90 }] },
  { name: 'Haldi Powder', hindiName: 'हल्दी', aliases: ['turmeric'], category: 'grocery-staples', unit: 'g', tileColor: 'haldi', variants: [{ size: '100 g', mrp: 35, price: 32, qty: 120 }] },
  { name: 'Red Chilli Powder', hindiName: 'लाल मिर्च पाउडर', aliases: ['lal mirch'], category: 'grocery-staples', unit: 'g', tileColor: 'mirchi', variants: [{ size: '100 g', mrp: 40, price: 36, qty: 110 }] },
  { name: 'Dhaniya Powder', hindiName: 'धनिया पाउडर', aliases: ['coriander powder'], category: 'grocery-staples', unit: 'g', tileColor: 'methi', variants: [{ size: '100 g', mrp: 38, price: 34, qty: 100 }] },
  { name: 'Fresh Coriander', hindiName: 'हरा धनिया', aliases: ['hara dhaniya', 'cilantro'], category: 'vegetables-fruits', unit: 'bunch', tileColor: 'methi', isVeg: true, variants: [{ size: '1 bunch', mrp: 15, price: 12, qty: 90 }] },
  { name: 'Cooking Oil', hindiName: 'तेल', aliases: ['tel', 'sunflower oil'], category: 'grocery-staples', unit: 'L', tileColor: 'haldi', variants: [{ size: '1 L', mrp: 150, price: 139, qty: 70 }] },
  { name: 'Salt', hindiName: 'नमक', aliases: ['namak'], category: 'grocery-staples', unit: 'kg', tileColor: 'dust', variants: [{ size: '1 kg', mrp: 25, price: 22, qty: 200 }] },

  // --- laptop repair worked example ---
  { name: 'Precision Screwdriver Set', aliases: ['screwdriver kit'], category: 'hardware-tools', unit: 'set', tileColor: 'clay', variants: [{ size: '32-in-1', mrp: 599, price: 499, qty: 40 }] },
  { name: 'Spudger & Opening Tool Kit', aliases: ['prying tool', 'plastic spudger'], category: 'hardware-tools', unit: 'set', tileColor: 'clay', variants: [{ size: '6-piece', mrp: 349, price: 299, qty: 35 }] },
  { name: 'Anti-Static Wrist Strap', aliases: ['esd strap'], category: 'electronics-accessories', unit: 'pc', tileColor: 'methi', variants: [{ size: 'Standard', mrp: 199, price: 169, qty: 50 }] },
  { name: 'Digital Multimeter', aliases: ['multimeter'], category: 'electronics-accessories', unit: 'pc', tileColor: 'haldi', variants: [{ size: 'Standard', mrp: 899, price: 749, qty: 20 }] },
  { name: 'Isopropyl Alcohol 99%', aliases: ['ipa', 'isopropyl'], category: 'cleaning-household', unit: 'ml', tileColor: 'methi', variants: [{ size: '100 ml', mrp: 180, price: 159, qty: 60 }] },
  { name: 'Universal Laptop Charger', aliases: ['laptop adapter'], category: 'electronics-accessories', unit: 'pc', tileColor: 'haldi', variants: [{ size: '90W', mrp: 1499, price: 1299, qty: 25 }] },

  // --- volcano project worked example ---
  { name: 'Baking Soda', aliases: ['cooking soda'], category: 'grocery-staples', unit: 'g', tileColor: 'dust', variants: [{ size: '200 g', mrp: 45, price: 39, qty: 80 }] },
  { name: 'White Vinegar', aliases: ['safed sirka'], category: 'grocery-staples', unit: 'ml', tileColor: 'dust', variants: [{ size: '500 ml', mrp: 65, price: 55, qty: 70 }] },
  { name: 'Red Food Colour', aliases: ['food color'], category: 'grocery-staples', unit: 'bottle', tileColor: 'mirchi', variants: [{ size: '20 ml', mrp: 30, price: 25, qty: 90 }] },
  { name: 'Air-Dry Clay', aliases: ['modelling clay'], category: 'stationery', unit: 'pack', tileColor: 'clay', variants: [{ size: '500 g', mrp: 199, price: 169, qty: 40 }] },
  { name: 'Poster Paint Set', aliases: ['acrylic colors', 'paint set'], category: 'stationery', unit: 'set', tileColor: 'haldi', variants: [{ size: '12 colors', mrp: 249, price: 219, qty: 45 }] },
  { name: 'Cardboard Sheet', aliases: ['chart board'], category: 'stationery', unit: 'pc', tileColor: 'dust', variants: [{ size: 'A2', mrp: 25, price: 20, qty: 100 }] },

  // --- general catalog padding ---
  { name: 'Amul Butter', aliases: ['makhan'], category: 'grocery-staples', brand: 'Amul', unit: 'g', tileColor: 'haldi', variants: [{ size: '100 g', mrp: 62, price: 59, qty: 120 }] },
  { name: 'Toor Dal', hindiName: 'तूर दाल', aliases: ['arhar dal'], category: 'grocery-staples', unit: 'kg', tileColor: 'haldi', variants: [{ size: '1 kg', mrp: 160, price: 149, qty: 90 }] },
  { name: 'Basmati Rice', hindiName: 'चावल', aliases: ['chawal'], category: 'grocery-staples', unit: 'kg', tileColor: 'dust', variants: [{ size: '1 kg', mrp: 120, price: 109, qty: 100 }] },
  { name: 'Paneer', hindiName: 'पनीर', category: 'grocery-staples', brand: 'Amul', unit: 'g', tileColor: 'haldi', isVeg: true, variants: [{ size: '200 g', mrp: 95, price: 89, qty: 60 }] },
  { name: 'Milk', hindiName: 'दूध', aliases: ['doodh'], category: 'grocery-staples', brand: 'Amul', unit: 'L', tileColor: 'methi', isVeg: true, variants: [{ size: '500 ml', mrp: 32, price: 30, qty: 150 }] },
  { name: 'Bread', hindiName: 'ब्रेड', category: 'grocery-staples', unit: 'pc', tileColor: 'clay', variants: [{ size: '400 g', mrp: 45, price: 40, qty: 80 }] },
  { name: 'Dish Wash Liquid', aliases: ['bartan dhona'], category: 'cleaning-household', unit: 'ml', tileColor: 'methi', variants: [{ size: '500 ml', mrp: 99, price: 89, qty: 70 }] },
  { name: 'Phenyl Floor Cleaner', aliases: ['floor cleaner'], category: 'cleaning-household', unit: 'L', tileColor: 'methi', variants: [{ size: '1 L', mrp: 120, price: 105, qty: 50 }] },
  { name: 'Scrub Brush', category: 'cleaning-household', unit: 'pc', tileColor: 'clay', variants: [{ size: 'Standard', mrp: 49, price: 39, qty: 60 }] },
  { name: 'Ballpoint Pen Pack', aliases: ['pen'], category: 'stationery', unit: 'pack', tileColor: 'dust', variants: [{ size: '10 pcs', mrp: 50, price: 45, qty: 150 }] },
  { name: 'A4 Notebook', aliases: ['copy', 'kapi'], category: 'stationery', unit: 'pc', tileColor: 'clay', variants: [{ size: '100 pages', mrp: 60, price: 54, qty: 100 }] },
  { name: 'Glue Stick', category: 'stationery', unit: 'pc', tileColor: 'haldi', variants: [{ size: 'Standard', mrp: 25, price: 20, qty: 90 }] },
  { name: 'Scissors', aliases: ['kainchi'], category: 'stationery', unit: 'pc', tileColor: 'clay', variants: [{ size: 'Standard', mrp: 45, price: 39, qty: 70 }] },
  { name: 'USB-C Cable', aliases: ['charging cable'], category: 'electronics-accessories', unit: 'pc', tileColor: 'haldi', variants: [{ size: '1 m', mrp: 299, price: 249, qty: 80 }] },
  { name: 'Power Bank', category: 'electronics-accessories', unit: 'pc', tileColor: 'haldi', variants: [{ size: '10000 mAh', mrp: 1299, price: 1099, qty: 30 }] },
  { name: 'LED Bulb', aliases: ['bulb'], category: 'hardware-tools', unit: 'pc', tileColor: 'haldi', variants: [{ size: '9W', mrp: 99, price: 85, qty: 100 }] },
  { name: 'Measuring Tape', category: 'hardware-tools', unit: 'pc', tileColor: 'clay', variants: [{ size: '5 m', mrp: 149, price: 129, qty: 50 }] },
  { name: 'Adjustable Wrench', aliases: ['pana'], category: 'hardware-tools', unit: 'pc', tileColor: 'clay', variants: [{ size: '8 inch', mrp: 249, price: 219, qty: 40 }] },
  { name: 'Cycle Puncture Kit', aliases: ['puncture kit'], category: 'hardware-tools', unit: 'set', tileColor: 'clay', variants: [{ size: 'Standard', mrp: 149, price: 129, qty: 35 }] },
  { name: 'Plumber Tape', aliases: ['teflon tape'], category: 'hardware-tools', unit: 'pc', tileColor: 'dust', variants: [{ size: '12 m', mrp: 35, price: 29, qty: 60 }] },
  { name: 'Shampoo', category: 'personal-care', unit: 'ml', tileColor: 'methi', variants: [{ size: '200 ml', mrp: 180, price: 159, qty: 60 }] },
  { name: 'Soap Bar', aliases: ['sabun'], category: 'personal-care', unit: 'pc', tileColor: 'haldi', variants: [{ size: '100 g', mrp: 45, price: 39, qty: 120 }] },
  { name: 'Toothpaste', category: 'personal-care', unit: 'g', tileColor: 'methi', variants: [{ size: '150 g', mrp: 95, price: 85, qty: 90 }] },
];

// Common staples the AI kit assistant should bucket as "probably at home"
const PANTRY_STAPLES = ['oil', 'salt', 'water', 'sugar', 'screwdriver', 'scissors'];

async function main() {
  await prisma.store.upsert({
    where: { id: STORE.id },
    update: {},
    create: STORE,
  });

  const categorySlugToId = new Map<string, string>();
  for (const c of CATEGORIES) {
    const created = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, hindiName: c.hindiName },
      create: { name: c.name, slug: c.slug, hindiName: c.hindiName },
    });
    categorySlugToId.set(c.slug, created.id);
  }

  for (const p of PRODUCTS) {
    const categoryId = categorySlugToId.get(p.category);
    if (!categoryId) throw new Error(`Unknown category ${p.category}`);

    const existing = await prisma.product.findFirst({ where: { name: p.name } });
    const product = existing
      ? await prisma.product.update({
          where: { id: existing.id },
          data: {
            hindiName: p.hindiName,
            aliases: p.aliases ?? [],
            categoryId,
            brand: p.brand,
            unit: p.unit,
            tileColor: p.tileColor ?? 'haldi',
            isVeg: p.isVeg,
          },
        })
      : await prisma.product.create({
          data: {
            name: p.name,
            hindiName: p.hindiName,
            aliases: p.aliases ?? [],
            categoryId,
            brand: p.brand,
            unit: p.unit,
            tileColor: p.tileColor ?? 'haldi',
            isVeg: p.isVeg,
            images: [],
          },
        });

    for (const v of p.variants) {
      const existingVariant = await prisma.variant.findFirst({
        where: { productId: product.id, size: v.size },
      });
      const variant = existingVariant
        ? await prisma.variant.update({
            where: { id: existingVariant.id },
            data: { mrp: v.mrp, price: v.price },
          })
        : await prisma.variant.create({
            data: { productId: product.id, size: v.size, mrp: v.mrp, price: v.price },
          });

      await prisma.inventory.upsert({
        where: { storeId_variantId: { storeId: STORE.id, variantId: variant.id } },
        update: { qtyAvailable: v.qty },
        create: { storeId: STORE.id, variantId: variant.id, qtyAvailable: v.qty, qtyReserved: 0 },
      });
    }

    // seed alias table too (aliases + hindi name both point at canonical product name)
    const aliasTargets = [...(p.aliases ?? []), ...(p.hindiName ? [p.hindiName] : [])];
    for (const alias of aliasTargets) {
      const existingAlias = await prisma.productAlias.findFirst({ where: { alias, canonical: p.name } });
      if (!existingAlias) {
        await prisma.productAlias.create({ data: { alias, canonical: p.name } });
      }
    }
  }

  console.log(`Seeded ${CATEGORIES.length} categories and ${PRODUCTS.length} products.`);
  console.log(`Pantry staples recognised by kit assistant: ${PANTRY_STAPLES.join(', ')}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
