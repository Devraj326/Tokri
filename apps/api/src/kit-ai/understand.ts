export type GoalType = 'recipe' | 'repair' | 'project' | 'occasion' | 'household';

export interface UnderstoodItem {
  name: string;
  hindiAlias?: string;
  qty: number;
  unit: string;
  essential: boolean;
  substitutes?: string[];
}

export interface UnderstoodKit {
  goalType: GoalType;
  servings: number | null;
  clarifyingQuestion: string | null;
  safetyNote: string | null;
  steps: string[] | null;
  items: UnderstoodItem[];
}

function servingsFromPrompt(prompt: string, fallback = 4): number {
  const forMatch = prompt.match(/for\s+(\d+)/i);
  if (forMatch) return Number(forMatch[1]);
  const logonMatch = prompt.match(/(\d+)\s*(logon|log|people|person)/i);
  if (logonMatch) return Number(logonMatch[1]);
  return fallback;
}

function scale(baseQty: number, baseServings: number, servings: number): number {
  return Math.round(((baseQty * servings) / baseServings) * 100) / 100;
}

export function mockUnderstand(prompt: string): UnderstoodKit {
  const p = prompt.toLowerCase();

  if (p.includes('aloo') && (p.includes('sabzi') || p.includes('sabji'))) {
    const servings = servingsFromPrompt(prompt, 4);
    const base = 4;
    return {
      goalType: 'recipe',
      servings,
      clarifyingQuestion: null,
      safetyNote: null,
      steps: [
        'Heat oil, add jeera, then chopped onion. Cook until golden.',
        'Add ginger, green chilli and tomato. Cook until soft.',
        'Add the masala powders with a splash of water.',
        'Add cubed potatoes and salt, cover and cook 15 minutes.',
        'Finish with fresh coriander.',
      ],
      items: [
        { name: 'Potato', hindiAlias: 'आलू', qty: scale(750, base, servings), unit: 'g', essential: true },
        { name: 'Onion', hindiAlias: 'प्याज़', qty: 2, unit: 'medium', essential: true },
        { name: 'Tomato', hindiAlias: 'टमाटर', qty: 2, unit: 'medium', essential: true },
        { name: 'Green Chilli', hindiAlias: 'हरी मिर्च', qty: 3, unit: 'pc', essential: true },
        { name: 'Ginger', hindiAlias: 'अदरक', qty: 1, unit: 'inch', essential: true },
        { name: 'Jeera', hindiAlias: 'जीरा', qty: 1, unit: 'tsp', essential: true, substitutes: ['Jeera Powder'] },
        { name: 'Haldi Powder', hindiAlias: 'हल्दी', qty: 1, unit: 'tsp', essential: true },
        { name: 'Red Chilli Powder', hindiAlias: 'लाल मिर्च पाउडर', qty: 1, unit: 'tsp', essential: true },
        { name: 'Dhaniya Powder', hindiAlias: 'धनिया पाउडर', qty: 1, unit: 'tsp', essential: true },
        { name: 'Fresh Coriander', hindiAlias: 'हरा धनिया', qty: 1, unit: 'bunch', essential: false },
        { name: 'Oil', qty: 2, unit: 'tbsp', essential: true },
        { name: 'Salt', qty: 1, unit: 'tsp', essential: true },
      ],
    };
  }

  if (p.includes('laptop') && (p.includes('charg') || p.includes('repair'))) {
    return {
      goalType: 'repair',
      servings: null,
      clarifyingQuestion: 'Is the charger light on when you plug it in?',
      safetyNote:
        'Unplug the laptop and remove the battery (if removable) before opening it. If the battery looks swollen, stop and take it to a technician instead of continuing.',
      steps: [
        'Check the charger light and try a different socket.',
        'Test the charger output with the multimeter.',
        'Clean the charging port with a little isopropyl alcohol.',
        'If the port is loose, the DC jack needs replacing by a technician.',
      ],
      items: [
        { name: 'Precision Screwdriver Set', qty: 1, unit: 'set', essential: true },
        { name: 'Spudger & Opening Tool Kit', qty: 1, unit: 'set', essential: true },
        { name: 'Anti-Static Wrist Strap', qty: 1, unit: 'pc', essential: true },
        { name: 'Digital Multimeter', qty: 1, unit: 'pc', essential: true },
        { name: 'Isopropyl Alcohol 99%', qty: 1, unit: 'pc', essential: false },
        { name: 'Universal Laptop Charger', qty: 1, unit: 'pc', essential: false },
        { name: 'Model-specific DC jack', qty: 1, unit: 'pc', essential: false },
      ],
    };
  }

  if (p.includes('volcano')) {
    return {
      goalType: 'project',
      servings: null,
      clarifyingQuestion: null,
      safetyNote: 'The baking-soda-and-vinegar reaction fizzes and can overflow quickly — do this on a tray, not on a bare table.',
      steps: [
        'Shape the volcano cone around the cardboard base with air-dry clay and let it dry.',
        'Paint the cone and let it dry fully.',
        'Place a small cup in the crater for the reaction.',
        'Add baking soda and a few drops of food colour, then pour in vinegar to erupt.',
      ],
      items: [
        { name: 'Air-Dry Clay', qty: 1, unit: 'pack', essential: true },
        { name: 'Cardboard Sheet', qty: 1, unit: 'pc', essential: true },
        { name: 'Poster Paint Set', qty: 1, unit: 'set', essential: true },
        { name: 'Baking Soda', qty: 1, unit: 'pack', essential: true },
        { name: 'White Vinegar', qty: 1, unit: 'bottle', essential: true },
        { name: 'Red Food Colour', qty: 1, unit: 'bottle', essential: true },
        { name: 'Scissors', qty: 1, unit: 'pc', essential: false },
        { name: 'Glue Stick', qty: 1, unit: 'pc', essential: false },
      ],
    };
  }

  // Generic fallback: treat the prompt as a loose list of grocery items.
  const parts = prompt
    .split(/,| and |\n/i)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12);

  return {
    goalType: 'household',
    servings: null,
    clarifyingQuestion: null,
    safetyNote: null,
    steps: null,
    items: (parts.length ? parts : [prompt.trim()]).map((name) => ({ name, qty: 1, unit: 'pc', essential: true })),
  };
}
