import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

const prisma = new PrismaClient();

const STORE_ID = '00000000-0000-0000-0000-000000000001';

type CategorySpec = {
  slug: string;
  tileColor: 'haldi' | 'clay' | 'methi' | 'mirchi' | 'dust';
  items: string[];
  brands: string[];
  sizes: { size: string; unit: string }[];
  priceRange: [number, number];
  isVeg?: boolean;
};

const CATEGORIES: CategorySpec[] = [
  {
    slug: 'vegetables-fruits',
    tileColor: 'methi',
    isVeg: true,
    brands: [
      'Farm Fresh', "Nature's Basket", 'Organic Valley', 'Local Harvest', 'Daily Fresh',
      'Green Valley', 'Fresho', 'Farm2Home', 'Pure Harvest', 'Sunrise Farms', 'Village Fresh', 'EcoGrown',
    ],
    items: [
      'Potato', 'Onion', 'Tomato', 'Carrot', 'Cabbage', 'Cauliflower', 'Spinach', 'Beans',
      'Green Peas', 'Brinjal', 'Okra', 'Cucumber', 'Capsicum', 'Pumpkin', 'Radish', 'Beetroot',
      'Garlic', 'Ginger', 'Green Chilli', 'Coriander Leaves', 'Mint Leaves', 'Curry Leaves',
      'Lemon', 'Apple', 'Banana', 'Orange', 'Mango', 'Grapes', 'Watermelon', 'Papaya', 'Guava',
      'Pomegranate', 'Pineapple', 'Kiwi', 'Strawberry', 'Pear', 'Plum', 'Chikoo', 'Custard Apple',
      'Dragon Fruit', 'Sweet Corn', 'Broccoli', 'Mushroom', 'Bottle Gourd', 'Bitter Gourd',
    ],
    sizes: [
      { size: '250 g', unit: 'g' }, { size: '500 g', unit: 'g' }, { size: '1 kg', unit: 'kg' },
      { size: '2 kg', unit: 'kg' },
    ],
    priceRange: [15, 180],
  },
  {
    slug: 'grocery-staples',
    tileColor: 'haldi',
    brands: [
      'Tata', 'Fortune', 'Aashirvaad', 'Patanjali', 'MDH', 'Everest', 'Amul', 'Britannia',
      'Nestle', 'ITC', "Haldiram's", 'Dabur', 'Catch', 'Saffola',
    ],
    items: [
      'Toor Dal', 'Chana Dal', 'Moong Dal', 'Masoor Dal', 'Urad Dal', 'Rajma', 'Chickpeas',
      'Basmati Rice', 'Sona Masoori Rice', 'Brown Rice', 'Poha', 'Sooji', 'Maida', 'Wheat Atta',
      'Besan', 'Sugar', 'Jaggery', 'Table Salt', 'Sunflower Oil', 'Mustard Oil', 'Ghee', 'Honey',
      'Tea Powder', 'Coffee Powder', 'Glucose Biscuits', 'Instant Noodles', 'Pasta', 'Tomato Ketchup',
      'Mixed Fruit Jam', 'Peanut Butter', 'Rolled Oats', 'Cornflakes', 'Papad', 'Mango Pickle',
      'White Vinegar', 'Soy Sauce', 'Garam Masala', 'Turmeric Powder', 'Chilli Powder',
      'Coriander Powder', 'Cumin Powder', 'Baking Soda',
    ],
    sizes: [
      { size: '100 g', unit: 'g' }, { size: '200 g', unit: 'g' }, { size: '500 g', unit: 'g' },
      { size: '1 kg', unit: 'kg' }, { size: '500 ml', unit: 'ml' }, { size: '1 L', unit: 'L' },
    ],
    priceRange: [20, 350],
  },
  {
    slug: 'hardware-tools',
    tileColor: 'clay',
    brands: [
      'Stanley', 'Bosch', 'Taparia', 'Philips', 'Havells', 'Crompton', 'Asian Paints',
      'Pidilite', 'Godrej', 'Anchor', 'Bajaj', 'Usha',
    ],
    items: [
      'Screwdriver Set', 'Claw Hammer', 'Adjustable Wrench', 'Combination Pliers', 'Measuring Tape',
      'Spirit Level', 'Cordless Drill', 'Drill Bit Set', 'Hacksaw', 'Wood Chisel', 'Allen Key Set',
      'Spanner Set', 'Nails Pack', 'Screws Pack', 'Bolts Pack', 'Cable Tie Pack', 'Duct Tape',
      'Super Glue', 'Paint Brush', 'Sandpaper Sheets', 'Safety Gloves', 'Safety Goggles',
      'Extension Cord', 'LED Bulb', 'LED Tube Light', 'Modular Switch Board', 'MCB Switch',
      'Electrical Wire Roll', 'Door Lock', 'Door Hinge', 'Tool Box', 'Folding Ladder', 'Plastic Bucket',
      'Floor Mop', 'Broom', 'Cycle Puncture Kit', 'Cycle Lock', 'Safety Helmet', 'LED Torch', 'Battery Pack',
    ],
    sizes: [
      { size: 'Small', unit: 'pc' }, { size: 'Medium', unit: 'pc' }, { size: 'Standard', unit: 'pc' },
      { size: 'Set of 5', unit: 'set' }, { size: 'Set of 10', unit: 'set' },
    ],
    priceRange: [25, 1500],
  },
  {
    slug: 'electronics-accessories',
    tileColor: 'haldi',
    brands: [
      'boAt', 'Mi', 'Samsung', 'Sony', 'JBL', 'Realme', 'Portronics', 'Ambrane',
      'Zebronics', 'HP', 'Logitech', 'Noise',
    ],
    items: [
      'USB Cable', 'Type-C Cable', 'Lightning Cable', 'Charger Adapter', 'Power Bank', 'Wired Earphones',
      'Bluetooth Speaker', 'Mobile Stand', 'Tempered Glass Screen Guard', 'Phone Back Case',
      'Memory Card', 'USB Pen Drive', 'HDMI Cable', 'Extension Board', 'Wireless Mouse',
      'Mechanical Keyboard', 'Webcam', 'Collar Mic', 'Mini Tripod', 'Selfie Stick', 'Smartwatch Strap',
      'Car Charger', 'Multi-Plug Adapter', 'LED Torch Light', 'Scientific Calculator',
    ],
    sizes: [
      { size: '1 m', unit: 'm' }, { size: '1.5 m', unit: 'm' }, { size: '2 m', unit: 'm' },
      { size: '10000 mAh', unit: 'pc' }, { size: '20000 mAh', unit: 'pc' }, { size: 'Standard', unit: 'pc' },
    ],
    priceRange: [49, 2200],
  },
  {
    slug: 'stationery',
    tileColor: 'clay',
    brands: [
      'Classmate', 'Camlin', 'Natraj', 'Reynolds', 'Cello', 'Faber-Castell', 'Doms',
      'Apsara', 'Luxor', 'Navneet', 'Flair', 'Parker',
    ],
    items: [
      'Ruled Notebook', 'Hardbound Diary', 'Ball Pen', 'Pencil', 'Eraser', 'Sharpener', 'Plastic Ruler',
      'Geometry Box', 'Sketch Pens', 'Wax Crayons', 'Watercolor Set', 'Poster Colors', 'Chart Paper',
      'A4 Sheets Ream', 'File Folder', 'Stapler', 'Stapler Pins', 'Glue Stick', 'Scissors',
      'Highlighter', 'Permanent Marker', 'Whiteboard Marker', 'Sticky Notes', 'Envelope Pack',
      'Graph Book', 'Drawing Book', 'Clipboard', 'Correction Pen', 'Cellotape Dispenser', 'Calculator',
    ],
    sizes: [
      { size: '1 pc', unit: 'pc' }, { size: 'Pack of 5', unit: 'pack' }, { size: 'Pack of 10', unit: 'pack' },
      { size: '100 pages', unit: 'pc' }, { size: '200 pages', unit: 'pc' }, { size: 'A4', unit: 'pc' },
    ],
    priceRange: [10, 450],
  },
  {
    slug: 'cleaning-household',
    tileColor: 'methi',
    brands: [
      'Vim', 'Surf Excel', 'Harpic', 'Lizol', 'Colin', 'Ariel', 'Tide', 'Dettol',
      'Lysol', 'Scotch-Brite', 'Exo', 'Domex',
    ],
    items: [
      'Dish Wash Liquid', 'Dish Wash Bar', 'Floor Cleaner', 'Toilet Cleaner', 'Glass Cleaner',
      'Detergent Powder', 'Detergent Liquid', 'Fabric Softener', 'Stain Remover', 'Room Freshener',
      'Mosquito Repellent', 'Garbage Bags', 'Scrub Pad', 'Floor Mop', 'Broom', 'Toilet Brush',
      'Rubber Gloves', 'Microfiber Cloth', 'White Phenyl', 'Naphthalene Balls', 'Car Air Freshener',
      'Bathroom Cleaner', 'Kitchen Degreaser', 'Tissue Paper Box', 'Paper Towel Roll',
      'Aluminium Foil', 'Cling Wrap', 'Plastic Trash Can',
    ],
    sizes: [
      { size: '200 ml', unit: 'ml' }, { size: '500 ml', unit: 'ml' }, { size: '1 L', unit: 'L' },
      { size: '2 L', unit: 'L' }, { size: 'Pack of 2', unit: 'pack' }, { size: 'Pack of 4', unit: 'pack' },
    ],
    priceRange: [25, 400],
  },
  {
    slug: 'personal-care',
    tileColor: 'mirchi',
    brands: [
      'Dove', 'Pantene', 'Himalaya', 'Lakme', 'Nivea', 'Garnier', 'Colgate',
      'Sensodyne', 'Gillette', "Johnson's", 'Clinic Plus', 'Fiama',
    ],
    items: [
      'Shampoo', 'Hair Conditioner', 'Hair Oil', 'Face Wash', 'Bath Soap', 'Body Wash', 'Body Lotion',
      'Face Moisturizer', 'Sunscreen Lotion', 'Toothpaste', 'Toothbrush', 'Mouthwash', 'Deodorant',
      'Perfume Spray', 'Talcum Powder', 'Shaving Cream', 'Razor', 'Aftershave Lotion', 'Sanitary Pads',
      'Baby Diapers', 'Baby Wipes', 'Baby Powder', 'Baby Oil', 'Hand Wash', 'Hand Sanitizer',
      'Face Mask Sheet', 'Lip Balm', 'Nail Polish', 'Cotton Balls', 'Cotton Buds',
    ],
    sizes: [
      { size: '50 ml', unit: 'ml' }, { size: '100 ml', unit: 'ml' }, { size: '200 ml', unit: 'ml' },
      { size: '250 ml', unit: 'ml' }, { size: '500 ml', unit: 'ml' }, { size: 'Pack of 2', unit: 'pack' },
    ],
    priceRange: [29, 600],
  },
];

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

function priceFor(range: [number, number], seed: number): { mrp: number; price: number } {
  const [lo, hi] = range;
  const mrp = Math.round((lo + (seed % 997) * ((hi - lo) / 997)) / 1) ;
  const discount = 0.05 + (seed % 23) / 100; // 5%-27% off
  const price = Math.max(lo, Math.round(mrp * (1 - discount)));
  return { mrp, price };
}

async function chunkedCreateMany<T>(name: string, rows: T[], fn: (batch: T[]) => Promise<unknown>) {
  const BATCH = 1000;
  for (let i = 0; i < rows.length; i += BATCH) {
    await fn(rows.slice(i, i + BATCH));
    process.stdout.write(`\r${name}: ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
  }
  process.stdout.write('\n');
}

async function main() {
  const categoryRows = await prisma.category.findMany({ where: { slug: { in: CATEGORIES.map((c) => c.slug) } } });
  const categoryIdBySlug = new Map(categoryRows.map((c) => [c.slug, c.id]));

  const products: {
    id: string; name: string; categoryId: string; brand: string; unit: string; tileColor: string; isVeg: boolean | null; images: string[]; aliases: string[];
  }[] = [];
  const variants: { id: string; productId: string; size: string; mrp: number; price: number }[] = [];
  const inventory: { storeId: string; variantId: string; qtyAvailable: number; qtyReserved: number }[] = [];

  let seed = 0;
  for (const cat of CATEGORIES) {
    const categoryId = categoryIdBySlug.get(cat.slug);
    if (!categoryId) {
      console.warn(`Skipping unknown category ${cat.slug} — run the main seed first.`);
      continue;
    }

    for (const item of cat.items) {
      for (const brand of cat.brands) {
        seed += 1;
        const productId = randomUUID();
        products.push({
          id: productId,
          name: `${brand} ${item}`,
          categoryId,
          brand,
          unit: cat.sizes[0].unit,
          tileColor: cat.tileColor,
          isVeg: cat.isVeg ?? null,
          images: [],
          aliases: [],
        });

        const variantCount = 1 + (seed % 2); // 1 or 2 variants per product
        for (let v = 0; v < variantCount; v++) {
          const sizeSpec = pick(cat.sizes, seed + v);
          const { mrp, price } = priceFor(cat.priceRange, seed * 7 + v * 13);
          const variantId = randomUUID();
          variants.push({ id: variantId, productId, size: sizeSpec.size, mrp, price });
          inventory.push({
            storeId: STORE_ID,
            variantId,
            qtyAvailable: 10 + (seed % 190),
            qtyReserved: 0,
          });
        }
      }
    }
  }

  console.log(`Generated ${products.length} products, ${variants.length} variants, ${inventory.length} inventory rows.`);

  await chunkedCreateMany('products', products, (batch) => prisma.product.createMany({ data: batch, skipDuplicates: true }));
  await chunkedCreateMany('variants', variants, (batch) => prisma.variant.createMany({ data: batch, skipDuplicates: true }));
  await chunkedCreateMany('inventory', inventory, (batch) => prisma.inventory.createMany({ data: batch, skipDuplicates: true }));

  console.log('Bulk sample data seeded.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
