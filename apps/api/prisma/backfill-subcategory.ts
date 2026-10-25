import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Maps each known seed item name (products are named `${brand} ${item}`) to a
// subcategory label, grouped per category slug. Built from the exact item
// lists in seed-bulk.ts.
const SUBCATS: Record<string, [string, string[]][]> = {
  'vegetables-fruits': [
    ['Onion & Potato', ['Potato', 'Onion']],
    ['Leafy & Herbs', ['Spinach', 'Coriander Leaves', 'Mint Leaves', 'Curry Leaves', 'Garlic', 'Ginger', 'Green Chilli']],
    ['Fresh Fruits', ['Apple', 'Banana', 'Orange', 'Mango', 'Grapes', 'Watermelon', 'Papaya', 'Guava', 'Pomegranate', 'Pineapple', 'Pear', 'Plum']],
    ['Exotic', ['Kiwi', 'Strawberry', 'Chikoo', 'Custard Apple', 'Dragon Fruit']],
    ['Fresh Vegetables', ['Tomato', 'Carrot', 'Cabbage', 'Cauliflower', 'Beans', 'Green Peas', 'Brinjal', 'Okra', 'Cucumber', 'Capsicum', 'Pumpkin', 'Radish', 'Beetroot', 'Sweet Corn', 'Broccoli', 'Mushroom', 'Bottle Gourd', 'Bitter Gourd', 'Lemon']],
  ],
  'grocery-staples': [
    ['Dals & Pulses', ['Toor Dal', 'Chana Dal', 'Moong Dal', 'Masoor Dal', 'Urad Dal', 'Rajma', 'Chickpeas']],
    ['Rice & Atta', ['Basmati Rice', 'Sona Masoori Rice', 'Brown Rice', 'Poha', 'Sooji', 'Maida', 'Wheat Atta', 'Besan']],
    ['Oil & Ghee', ['Sunflower Oil', 'Mustard Oil', 'Ghee', 'Honey']],
    ['Masala & Spices', ['Garam Masala', 'Turmeric Powder', 'Chilli Powder', 'Coriander Powder', 'Cumin Powder']],
    ['Sugar & Salt', ['Sugar', 'Jaggery', 'Table Salt', 'Baking Soda']],
    ['Sauces & Pickles', ['Tomato Ketchup', 'Mixed Fruit Jam', 'Peanut Butter', 'Mango Pickle', 'White Vinegar', 'Soy Sauce']],
    ['Breakfast & Snacks', ['Glucose Biscuits', 'Instant Noodles', 'Pasta', 'Rolled Oats', 'Cornflakes', 'Papad', 'Tea Powder', 'Coffee Powder']],
  ],
  'hardware-tools': [
    ['Hand Tools', ['Screwdriver Set', 'Claw Hammer', 'Adjustable Wrench', 'Combination Pliers', 'Measuring Tape', 'Spirit Level', 'Hacksaw', 'Wood Chisel', 'Allen Key Set', 'Spanner Set', 'Tool Box']],
    ['Fasteners & Adhesives', ['Nails Pack', 'Screws Pack', 'Bolts Pack', 'Cable Tie Pack', 'Duct Tape', 'Super Glue']],
    ['Electrical', ['Cordless Drill', 'Drill Bit Set', 'Extension Cord', 'LED Bulb', 'LED Tube Light', 'Modular Switch Board', 'MCB Switch', 'Electrical Wire Roll', 'LED Torch', 'Battery Pack']],
    ['Cycle Care', ['Cycle Puncture Kit', 'Cycle Lock']],
    ['Home & Safety', ['Paint Brush', 'Sandpaper Sheets', 'Safety Gloves', 'Safety Goggles', 'Door Lock', 'Door Hinge', 'Folding Ladder', 'Plastic Bucket', 'Floor Mop', 'Broom', 'Safety Helmet']],
  ],
  'electronics-accessories': [
    ['Cables & Chargers', ['USB Cable', 'Type-C Cable', 'Lightning Cable', 'Charger Adapter', 'Power Bank', 'Car Charger', 'Multi-Plug Adapter', 'HDMI Cable', 'Extension Board']],
    ['Audio', ['Wired Earphones', 'Bluetooth Speaker', 'Collar Mic']],
    ['Phone Accessories', ['Mobile Stand', 'Tempered Glass Screen Guard', 'Phone Back Case', 'Selfie Stick', 'Smartwatch Strap', 'Mini Tripod']],
    ['Computer Accessories', ['Wireless Mouse', 'Mechanical Keyboard', 'Webcam', 'Memory Card', 'USB Pen Drive']],
    ['Everyday Electronics', ['LED Torch Light', 'Scientific Calculator']],
  ],
  stationery: [
    ['Notebooks & Paper', ['Ruled Notebook', 'Hardbound Diary', 'Chart Paper', 'A4 Sheets Ream', 'Graph Book', 'Drawing Book', 'Sticky Notes', 'Envelope Pack']],
    ['Pens & Writing', ['Ball Pen', 'Pencil', 'Eraser', 'Sharpener', 'Highlighter', 'Permanent Marker', 'Whiteboard Marker', 'Correction Pen']],
    ['Art Supplies', ['Sketch Pens', 'Wax Crayons', 'Watercolor Set', 'Poster Colors']],
    ['Office Supplies', ['Plastic Ruler', 'Geometry Box', 'File Folder', 'Stapler Pins', 'Stapler', 'Glue Stick', 'Scissors', 'Clipboard', 'Cellotape Dispenser', 'Calculator']],
  ],
  'cleaning-household': [
    ['Laundry', ['Detergent Powder', 'Detergent Liquid', 'Fabric Softener', 'Stain Remover']],
    ['Kitchen Cleaning', ['Dish Wash Liquid', 'Dish Wash Bar', 'Scrub Pad', 'Kitchen Degreaser', 'Aluminium Foil', 'Cling Wrap']],
    ['Bath & Toilet', ['Toilet Cleaner', 'Toilet Brush', 'Bathroom Cleaner', 'White Phenyl']],
    ['Fresheners & Repellents', ['Room Freshener', 'Mosquito Repellent', 'Naphthalene Balls', 'Car Air Freshener']],
    ['Paper & Trash', ['Garbage Bags', 'Tissue Paper Box', 'Paper Towel Roll', 'Plastic Trash Can', 'Rubber Gloves']],
    ['Floor & Surface', ['Floor Cleaner', 'Glass Cleaner', 'Floor Mop', 'Broom', 'Microfiber Cloth']],
  ],
  'personal-care': [
    ['Hair Care', ['Shampoo', 'Hair Conditioner', 'Hair Oil']],
    ['Skin Care', ['Face Wash', 'Bath Soap', 'Body Wash', 'Body Lotion', 'Face Moisturizer', 'Sunscreen Lotion', 'Face Mask Sheet', 'Lip Balm']],
    ['Oral Care', ['Toothpaste', 'Toothbrush', 'Mouthwash']],
    ["Men's Grooming", ['Shaving Cream', 'Razor', 'Aftershave Lotion', 'Deodorant', 'Perfume Spray', 'Talcum Powder']],
    ['Baby Care', ['Baby Diapers', 'Baby Wipes', 'Baby Powder', 'Baby Oil']],
    ['Health & Hygiene', ['Sanitary Pads', 'Hand Wash', 'Hand Sanitizer', 'Cotton Balls', 'Cotton Buds', 'Nail Polish']],
  ],
};

async function main() {
  let total = 0;
  for (const [slug, groups] of Object.entries(SUBCATS)) {
    const category = await prisma.category.findUnique({ where: { slug } });
    if (!category) {
      console.warn(`Category ${slug} not found, skipping`);
      continue;
    }
    for (const [subcategory, items] of groups) {
      for (const item of items) {
        const res = await prisma.product.updateMany({
          where: { categoryId: category.id, name: { endsWith: ` ${item}` } },
          data: { subcategory },
        });
        total += res.count;
      }
    }
    const unmatched = await prisma.product.count({ where: { categoryId: category.id, subcategory: null } });
    console.log(`${slug}: tagged, ${unmatched} unmatched`);
  }
  console.log(`Backfilled subcategory on ${total} products.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
