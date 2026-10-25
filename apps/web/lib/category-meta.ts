import type { ArtKey } from '../components/ui/product-art';

export const CATEGORY_TINT: Record<string, string> = {
  'vegetables-fruits': 'methi',
  'grocery-staples': 'haldi',
  'hardware-tools': 'clay',
  'electronics-accessories': 'haldi',
  stationery: 'clay',
  'cleaning-household': 'methi',
  'personal-care': 'mirchi',
};

export const CATEGORY_NOTE: Record<string, string> = {
  'vegetables-fruits': 'Picked from the mandi at 5 am',
  'grocery-staples': 'Pantry staples, always in stock',
  'hardware-tools': '7-day replacement if it arrives damaged',
  'electronics-accessories': 'Tested before dispatch, 7-day replacement',
  stationery: 'For school, office and everything between',
  'cleaning-household': 'For a spotless home, delivered fast',
  'personal-care': 'Dermat-tested, delivered discreetly',
};

// Display order for each category's subcategory rail. Matches the taxonomy
// used to backfill products.subcategory (see api/prisma/backfill-subcategory.ts).
export const CATEGORY_SUBCATS: Record<string, string[]> = {
  'vegetables-fruits': ['Onion & Potato', 'Fresh Vegetables', 'Leafy & Herbs', 'Fresh Fruits', 'Exotic'],
  'grocery-staples': ['Dals & Pulses', 'Rice & Atta', 'Dairy & Bread', 'Oil & Ghee', 'Masala & Spices', 'Sugar & Salt', 'Sauces & Pickles', 'Breakfast & Snacks'],
  'hardware-tools': ['Hand Tools', 'Fasteners & Adhesives', 'Electrical', 'Home & Safety', 'Cycle Care'],
  'electronics-accessories': ['Cables & Chargers', 'Audio', 'Phone Accessories', 'Computer Accessories', 'Everyday Electronics'],
  stationery: ['Notebooks & Paper', 'Pens & Writing', 'Art Supplies', 'Office Supplies'],
  'cleaning-household': ['Laundry', 'Kitchen Cleaning', 'Bath & Toilet', 'Floor & Surface', 'Fresheners & Repellents', 'Paper & Trash'],
  'personal-care': ['Hair Care', 'Skin Care', 'Oral Care', "Men's Grooming", 'Baby Care', 'Health & Hygiene'],
};

const DEFAULT_CHEAP_CAP = 100;
export const CATEGORY_CHEAP_CAP: Record<string, number> = {
  'hardware-tools': 500,
  'electronics-accessories': 500,
};

export function cheapCapFor(slug: string): number {
  return CATEGORY_CHEAP_CAP[slug] ?? DEFAULT_CHEAP_CAP;
}

export interface CategoryXsell {
  q: string;
  t: string;
  sub: string;
  prompt: string;
  art: ArtKey;
}

export const CATEGORY_XSELL: Record<string, CategoryXsell> = {
  'vegetables-fruits': { q: 'Cooking tonight?', t: 'Everything for aloo ki sabzi', sub: 'We’ll check what’s in stock', prompt: 'Aloo ki sabzi for 4', art: 'pot' },
  'grocery-staples': { q: 'Running low on staples?', t: 'Weekly grocery run', sub: 'Dal, atta, rice and more', prompt: 'Weekly grocery for 2', art: 'jar' },
  'hardware-tools': { q: 'Laptop not charging?', t: 'The charging fix kit', sub: 'Tools plus a safety guide', prompt: 'Laptop not charging', art: 'screwdriver' },
  'electronics-accessories': { q: 'Setting up a desk?', t: 'Work from home kit', sub: 'Cables, charger and more', prompt: 'Work from home desk setup', art: 'charger' },
  stationery: { q: 'Back to school?', t: 'School supplies kit', sub: 'Notebooks, pens and more', prompt: 'School supplies for a 10 year old', art: 'notebook' },
  'cleaning-household': { q: 'Deep clean day?', t: 'Full house cleaning kit', sub: 'Everything to clean top to bottom', prompt: 'Deep cleaning the whole house', art: 'bottle' },
  'personal-care': { q: 'Self-care Sunday?', t: 'Personal care essentials', sub: 'Shampoo, lotion and more', prompt: 'Self-care Sunday essentials', art: 'bottle' },
};

// Categories treated as perishable/consumable for messaging (fresh-guarantee
// copy, vegetarian mark, nutrition panel) vs. durable goods (replacement
// guarantee, warranty info).
export const FOOD_CATEGORIES = new Set(['vegetables-fruits', 'grocery-staples']);

export const CATEGORY_DESC: Record<string, string> = {
  'vegetables-fruits': 'Hand-picked and sorted for size and freshness, kept cool at your store until it leaves with your order.',
  'grocery-staples': 'Sourced from trusted brands and stored in a controlled pantry environment until dispatch.',
  'hardware-tools': 'Built for everyday home fixes. Comes with what you see in the pictures.',
  'electronics-accessories': 'Tested for quality before it reaches our shelves.',
  stationery: 'For school, office and everyday use.',
  'cleaning-household': 'Formulated for everyday home cleaning, sealed until it reaches you.',
  'personal-care': 'Dermatologically appropriate formulas, sealed and stored correctly.',
};

export const CATEGORY_INFO: Record<string, [string, string][]> = {
  'vegetables-fruits': [['Shelf life', '3 to 5 days'], ['Storage', 'Cool, dry place. Refrigerate after cutting'], ['Country of origin', 'India']],
  'grocery-staples': [['Shelf life', '6 to 12 months'], ['Storage', 'Airtight, away from moisture'], ['Country of origin', 'India']],
  'hardware-tools': [['Warranty', '6 months'], ['Returns', '7-day replacement'], ['Country of origin', 'India']],
  'electronics-accessories': [['Warranty', '6 months'], ['Returns', '7-day replacement'], ['Country of origin', 'India']],
  stationery: [['Returns', '7-day replacement'], ['Country of origin', 'India']],
  'cleaning-household': [['Shelf life', '24 months'], ['Storage', 'Cool, dry place'], ['Country of origin', 'India']],
  'personal-care': [['Shelf life', '24 to 36 months'], ['Storage', 'Cool, dry place'], ['Country of origin', 'India']],
};

export const CATEGORY_NUTRI: Record<string, [string, string][] | undefined> = {
  'vegetables-fruits': [['Energy', '42 kcal'], ['Protein', '1.8 g'], ['Carbohydrate', '8.5 g'], ['Total fat', '0.3 g']],
  'grocery-staples': [['Energy', '350 kcal'], ['Protein', '9 g'], ['Carbohydrate', '62 g'], ['Total fat', '5 g']],
};

export const CATEGORY_REVIEWS: Record<string, [string, string, string, string][]> = {
  'vegetables-fruits': [
    ['Priya', '5', 'Fresh and firm, nothing sprouting. Better than my local market.', '2 days ago'],
    ['Rahul', '4', 'Good quality overall. One piece was a little soft.', '1 week ago'],
  ],
  'grocery-staples': [
    ['Neha', '5', 'Came well within date and sealed properly.', '3 days ago'],
    ['Arjun', '4', 'Good value for the price. Packaging could be sturdier.', '2 weeks ago'],
  ],
  'hardware-tools': [
    ['Manoj', '5', 'Fixed what I needed with this. Build feels solid.', '4 days ago'],
    ['Ananya', '4', 'Does the job. Case could be sturdier.', '1 month ago'],
  ],
  'electronics-accessories': [
    ['Kabir', '5', 'Works exactly as described, good build quality.', '1 day ago'],
    ['Isha', '4', 'Decent for the price, gets the job done.', '1 week ago'],
  ],
  stationery: [
    ['Sana', '5', 'Good quality, kids love it.', '5 days ago'],
    ['Vikram', '4', 'Value for money. Nothing fancy, works fine.', '3 weeks ago'],
  ],
  'cleaning-household': [
    ['Divya', '5', 'Strong and effective, a little goes a long way.', '6 days ago'],
    ['Rohan', '4', 'Works well, smell is a bit strong.', '2 weeks ago'],
  ],
  'personal-care': [
    ['Meera', '5', 'Gentle and suits my skin well.', '3 days ago'],
    ['Aditya', '4', 'Good product, packaging was slightly dented.', '1 week ago'],
  ],
};

export function hashN(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

export function ratingFor(id: string): { rating: string; count: number; dist: number[] } {
  const h = hashN(id);
  const rating = (4.1 + (h % 7) / 10).toFixed(1);
  const count = 180 + (h % 4800);
  const dist = parseFloat(rating) >= 4.5 ? [71, 18, 6, 3, 2] : [58, 24, 10, 5, 3];
  return { rating, count, dist };
}

export function unitPrice(size: string, price: number): string | null {
  const m = size.match(/^([\d.]+)\s*(kg|g|ml|l)$/i);
  if (!m) return null;
  let qty = parseFloat(m[1]);
  let unit = m[2].toLowerCase();
  if (unit === 'g') {
    qty /= 1000;
    unit = 'kg';
  }
  if (unit === 'ml') {
    qty /= 1000;
    unit = 'l';
  }
  if (qty === 1) return null;
  return `₹${Math.round(price / qty)}/${unit === 'l' ? 'L' : 'kg'}`;
}
