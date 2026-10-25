import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Covers the small set of original hand-curated demo products (no brand
// prefix), which the suffix-based backfill couldn't match.
const EXACT: Record<string, string> = {
  'Dish Wash Liquid': 'Kitchen Cleaning',
  'Isopropyl Alcohol 99%': 'Kitchen Cleaning',
  'Scrub Brush': 'Kitchen Cleaning',
  'Anti-Static Wrist Strap': 'Computer Accessories',
  'Digital Multimeter': 'Everyday Electronics',
  'Power Bank': 'Cables & Chargers',
  'USB-C Cable': 'Cables & Chargers',
  'Universal Laptop Charger': 'Cables & Chargers',
  'Amul Butter': 'Dairy & Bread',
  'Baking Soda': 'Sugar & Salt',
  'Basmati Rice': 'Rice & Atta',
  Bread: 'Dairy & Bread',
  'Cooking Oil': 'Oil & Ghee',
  'Dhaniya Powder': 'Masala & Spices',
  'Haldi Powder': 'Masala & Spices',
  'Jeera Powder': 'Masala & Spices',
  Milk: 'Dairy & Bread',
  Paneer: 'Dairy & Bread',
  'Red Food Colour': 'Masala & Spices',
  Salt: 'Sugar & Salt',
  'Toor Dal': 'Dals & Pulses',
  'White Vinegar': 'Sauces & Pickles',
  'Adjustable Wrench': 'Hand Tools',
  'Cycle Puncture Kit': 'Cycle Care',
  'LED Bulb': 'Electrical',
  'Measuring Tape': 'Hand Tools',
  'Plumber Tape': 'Fasteners & Adhesives',
  'Spudger & Opening Tool Kit': 'Hand Tools',
  Shampoo: 'Hair Care',
  'Soap Bar': 'Skin Care',
  Toothpaste: 'Oral Care',
  'A4 Notebook': 'Notebooks & Paper',
  'Air-Dry Clay': 'Art Supplies',
  'Ballpoint Pen Pack': 'Pens & Writing',
  'Cardboard Sheet': 'Notebooks & Paper',
  'Glue Stick': 'Office Supplies',
  'Poster Paint Set': 'Art Supplies',
  Scissors: 'Office Supplies',
  'Fresh Coriander': 'Leafy & Herbs',
  Ginger: 'Leafy & Herbs',
  'Green Chilli': 'Leafy & Herbs',
  Onion: 'Onion & Potato',
  Potato: 'Onion & Potato',
  Tomato: 'Fresh Vegetables',
};

async function main() {
  let total = 0;
  for (const [name, subcategory] of Object.entries(EXACT)) {
    const res = await prisma.product.updateMany({ where: { name, subcategory: null }, data: { subcategory } });
    total += res.count;
  }
  const stillNull = await prisma.product.count({ where: { subcategory: null } });
  console.log(`Patched ${total} products. Still unmatched: ${stillNull}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
