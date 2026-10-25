const INK = '#1B1A17';

export type ArtKey =
  | 'potato' | 'onion' | 'tomato' | 'chilli' | 'ginger' | 'leaf' | 'milk' | 'butter'
  | 'bread' | 'jar' | 'biscuit' | 'chips' | 'screwdriver' | 'meter' | 'bottle' | 'charger'
  | 'pot' | 'carrot' | 'cabbage' | 'cauliflower' | 'capsicum' | 'citrus' | 'round-fruit'
  | 'banana' | 'grapes' | 'watermelon' | 'corn' | 'mushroom' | 'gourd' | 'beetroot'
  | 'notebook' | 'pen' | 'default';

function body(k: ArtKey, label: string): string {
  const st = `stroke="${INK}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"`;
  switch (k) {
    case 'potato':
      return `<path d="M15 44c-2-14 10-25 27-25s25 8 23 20-11 23-27 23S17 56 15 44z" fill="#D3A464" ${st}/><circle cx="33" cy="34" r="2" fill="${INK}"/><circle cx="50" cy="43" r="2" fill="${INK}"/><circle cx="38" cy="52" r="1.6" fill="${INK}"/>`;
    case 'onion':
      return `<path d="M40 12c4 8 23 16 23 34 0 13-10 20-23 20S17 59 17 46c0-18 19-26 23-34z" fill="#B5485E" ${st}/><path d="M40 22c-7 10-10 24-6 43M40 22c7 10 10 24 6 43" fill="none" ${st}/>`;
    case 'tomato':
      return `<circle cx="40" cy="45" r="23" fill="#D7372B" ${st}/><path d="M40 25l-9-7 3 9-10 1 11 3-2 8 7-7 7 7-2-8 11-3-10-1 3-9z" fill="#3E7A47" ${st}/>`;
    case 'chilli':
      return `<path d="M24 22c4 2 6 6 6 10 0 18 12 28 32 30-20 7-40-5-42-27 0-6 1-10 4-13z" fill="#3E8A4A" ${st}/><path d="M24 22l-3-8" fill="none" ${st}/>`;
    case 'ginger':
      return `<path d="M12 46c0-8 8-10 12-8 2-8 10-12 16-8 6-6 17-2 17 6 8 0 10 10 4 14-2 8-12 10-18 6-6 6-16 4-18-2-8 2-13-2-13-8z" fill="#D9B26E" ${st}/>`;
    case 'leaf':
      return `<path d="M40 70V40M40 52l-14-12M40 46l14-10" fill="none" ${st}/><circle cx="26" cy="34" r="10" fill="#4C9A57" ${st}/><circle cx="54" cy="30" r="10" fill="#4C9A57" ${st}/><circle cx="40" cy="24" r="11" fill="#5BAE66" ${st}/>`;
    case 'milk':
      return `<path d="M24 26l6-11h20l6 11v42H24z" fill="#FFFDF8" ${st}/><path d="M24 26h32" ${st}/><rect x="24" y="40" width="32" height="15" fill="#3B6EA8" ${st}/>`;
    case 'butter':
      return `<rect x="12" y="30" width="56" height="26" rx="3" fill="#F2D06B" ${st}/><path d="M12 38h56M24 30v26" fill="none" ${st}/>`;
    case 'bread':
      return `<path d="M13 40c0-10 9-16 27-16s27 6 27 16c0 4-3 6-6 6v14H19V46c-3 0-6-2-6-6z" fill="#D9A35B" ${st}/><path d="M30 33l4 7M43 31l4 7" fill="none" ${st}/>`;
    case 'jar':
      return `<rect x="24" y="13" width="32" height="11" rx="2" fill="${INK}"/><rect x="21" y="24" width="38" height="44" rx="6" fill="#FFFDF8" ${st}/><rect x="21" y="37" width="38" height="17" fill="${label}" ${st}/>`;
    case 'biscuit':
      return `<rect x="13" y="22" width="54" height="36" rx="4" fill="#E2B866" ${st}/><circle cx="26" cy="33" r="2" fill="${INK}"/><circle cx="40" cy="33" r="2" fill="${INK}"/><circle cx="54" cy="33" r="2" fill="${INK}"/><circle cx="33" cy="46" r="2" fill="${INK}"/><circle cx="47" cy="46" r="2" fill="${INK}"/>`;
    case 'chips':
      return `<path d="M22 16h36l-3 48H25z" fill="#D7372B" ${st}/><path d="M22 16l4 4 4-4 4 4 4-4 4 4 4-4 4 4 4-4" fill="none" ${st}/><circle cx="40" cy="42" r="9" fill="#F2B705" ${st}/>`;
    case 'screwdriver':
      return `<rect x="10" y="33" width="30" height="14" rx="6" fill="#F2B705" ${st}/><path d="M40 40h26" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><path d="M18 33v14M26 33v14" ${st}/>`;
    case 'meter':
      return `<rect x="21" y="11" width="38" height="58" rx="7" fill="#F2B705" ${st}/><rect x="27" y="17" width="26" height="14" rx="2" fill="#E3EAD8" ${st}/><circle cx="40" cy="49" r="10" fill="#FFFDF8" ${st}/><path d="M40 49l6-6" ${st}/>`;
    case 'bottle':
      return `<path d="M34 11h12v10l7 8v39H27V29l7-8z" fill="#E7EEF3" ${st}/><rect x="27" y="40" width="26" height="15" fill="#3B6EA8" ${st}/>`;
    case 'charger':
      return `<rect x="10" y="27" width="36" height="26" rx="5" fill="#3A3833" ${st}/><path d="M46 40c10 0 10 14 22 14" fill="none" ${st}/><circle cx="28" cy="40" r="3" fill="#6FA67B"/>`;
    case 'pot':
      return `<path d="M12 36h56l-5 28H17z" fill="#C9714A" ${st}/><path d="M22 36c0-10 8-16 18-16s18 6 18 16" fill="#E3DACB" ${st}/><path d="M32 14c2 3-2 4 0 7M44 12c2 3-2 4 0 7" fill="none" ${st}/>`;
    case 'carrot':
      return `<path d="M26 16c10-4 20 2 18 12L34 70l-14-4 6-46c0-1 0-1 0-2z" fill="#D9792F" ${st}/><path d="M30 16l-4-10M38 16l2-10M24 18l-7-7" fill="none" ${st}/>`;
    case 'cabbage':
      return `<circle cx="40" cy="42" r="23" fill="#BFD8A0" ${st}/><circle cx="27" cy="32" r="10" fill="#BFD8A0" ${st}/><circle cx="53" cy="32" r="10" fill="#BFD8A0" ${st}/><circle cx="40" cy="23" r="10" fill="#BFD8A0" ${st}/>`;
    case 'cauliflower':
      return `<circle cx="40" cy="44" r="21" fill="#F4F1E6" ${st}/><circle cx="28" cy="34" r="9" fill="#F4F1E6" ${st}/><circle cx="52" cy="34" r="9" fill="#F4F1E6" ${st}/><path d="M26 58l-3 9M54 58l3 9" fill="none" ${st}/>`;
    case 'capsicum':
      return `<path d="M40 20c6-8 16-2 14 8-2 10 4 16 4 26 0 12-10 18-18 18s-18-6-18-18c0-10 6-16 4-26-2-10 8-16 14-8z" fill="#3E8A4A" ${st}/><rect x="36" y="9" width="8" height="11" rx="2" fill="#4C9A57" ${st}/>`;
    case 'citrus':
      return `<circle cx="40" cy="42" r="22" fill="#F2C94C" ${st}/><ellipse cx="40" cy="19" rx="4" ry="6" fill="#4C9A57" ${st}/>`;
    case 'round-fruit':
      return `<circle cx="40" cy="44" r="22" fill="#D7372B" ${st}/><path d="M40 22v-9" ${st}/><path d="M40 16c4-5 11-2 8 4" fill="#4C9A57" ${st}/>`;
    case 'banana':
      return `<path d="M18 54c10 10 34 10 44-6 2-3-2-7-5-5-10 12-28 12-36 4-3-3-7 3-3 7z" fill="#F2D33E" ${st}/><path d="M58 44c3-4 6-10 4-16" fill="none" ${st}/>`;
    case 'grapes':
      return `<circle cx="30" cy="30" r="7" fill="#7C5AA8" ${st}/><circle cx="42" cy="28" r="7" fill="#7C5AA8" ${st}/><circle cx="24" cy="42" r="7" fill="#7C5AA8" ${st}/><circle cx="37" cy="42" r="7" fill="#7C5AA8" ${st}/><circle cx="50" cy="40" r="7" fill="#7C5AA8" ${st}/><circle cx="31" cy="54" r="7" fill="#7C5AA8" ${st}/><circle cx="44" cy="54" r="7" fill="#7C5AA8" ${st}/><path d="M34 22l4-8" fill="none" ${st}/>`;
    case 'watermelon':
      return `<path d="M14 40a26 26 0 0152 0z" fill="#3E8A4A" ${st}/><path d="M14 40a26 26 0 0052 0z" fill="#D7372B" ${st}/><circle cx="32" cy="34" r="1.6" fill="${INK}"/><circle cx="40" cy="30" r="1.6" fill="${INK}"/><circle cx="48" cy="34" r="1.6" fill="${INK}"/>`;
    case 'corn':
      return `<path d="M30 14c6-4 14-4 20 0l-4 50c-2 6-10 6-12 0z" fill="#F2C94C" ${st}/><circle cx="36" cy="26" r="1.6" fill="${INK}"/><circle cx="44" cy="26" r="1.6" fill="${INK}"/><circle cx="34" cy="36" r="1.6" fill="${INK}"/><circle cx="42" cy="36" r="1.6" fill="${INK}"/><circle cx="38" cy="46" r="1.6" fill="${INK}"/><circle cx="36" cy="56" r="1.6" fill="${INK}"/>`;
    case 'mushroom':
      return `<path d="M18 36c0-14 44-14 44 0z" fill="#C9714A" ${st}/><rect x="32" y="36" width="16" height="22" rx="4" fill="#FFFDF8" ${st}/>`;
    case 'gourd':
      return `<path d="M30 12c6 0 10 4 10 10v40c0 6-4 10-10 10s-10-4-10-10V22c0-6 4-10 10-10z" fill="#4C9A57" ${st}/><path d="M24 24h12M24 34h12M24 44h12M24 54h12" stroke="${INK}" stroke-width="1.5" opacity=".4"/>`;
    case 'beetroot':
      return `<circle cx="40" cy="46" r="20" fill="#7A2048" ${st}/><path d="M40 26v-10M34 26l-4-9M46 26l4-9" fill="none" ${st}/>`;
    case 'notebook':
      return `<rect x="16" y="12" width="48" height="56" rx="3" fill="#FFFDF8" ${st}/><path d="M16 22h48" stroke="${INK}" stroke-width="1.5"/><path d="M24 34h32M24 42h32M24 50h32" stroke="${INK}" stroke-width="1.2" opacity=".5"/>`;
    case 'pen':
      return `<path d="M20 60l6-16 30-30 10 10-30 30z" fill="#3B6EA8" ${st}/><path d="M26 44l10 10" fill="none" ${st}/>`;
    default:
      return `<circle cx="40" cy="40" r="20" fill="#E3DACB" ${st}/>`;
  }
}

const LABEL: Record<string, string> = { haldi: '#F2B705', clay: '#C9714A', mirchi: '#D7372B', methi: '#4C9A57', dust: '#E3DACB' };

export function ProductArt({ artKey, tint = 'dust', className }: { artKey: ArtKey; tint?: string; className?: string }) {
  return (
    <svg viewBox="0 0 80 80" aria-hidden className={className} dangerouslySetInnerHTML={{ __html: body(artKey, LABEL[tint] ?? LABEL.dust) }} />
  );
}

const RULES: [RegExp, ArtKey][] = [
  [/potato|aloo/i, 'potato'],
  [/onion|pyaz/i, 'onion'],
  [/tomato|tamatar/i, 'tomato'],
  [/chilli|chili|mirch/i, 'chilli'],
  [/ginger|garlic|adrak/i, 'ginger'],
  [/coriander|mint|curry leaves|spinach|leafy|methi leaves|palak/i, 'leaf'],
  [/milk|doodh/i, 'milk'],
  [/butter|makhan|soap\b/i, 'butter'],
  [/bread|pav\b/i, 'bread'],
  [/biscuit|cookie|cornflake|oats/i, 'biscuit'],
  [/chips|namkeen|wafer/i, 'chips'],
  [/carrot/i, 'carrot'],
  [/cabbage/i, 'cabbage'],
  [/cauliflower/i, 'cauliflower'],
  [/capsicum|bell pepper/i, 'capsicum'],
  [/lemon|orange\b/i, 'citrus'],
  [/apple|pear\b|guava|pomegranate|plum|custard apple|chikoo|dragon fruit|strawberry/i, 'round-fruit'],
  [/banana/i, 'banana'],
  [/grapes/i, 'grapes'],
  [/watermelon|papaya|pineapple|muskmelon/i, 'watermelon'],
  [/sweet corn|\bcorn\b/i, 'corn'],
  [/mushroom/i, 'mushroom'],
  [/cucumber|bottle gourd|bitter gourd|pumpkin|ridge gourd|okra|beans\b|green peas|radish|kiwi/i, 'gourd'],
  [/beetroot/i, 'beetroot'],
  [/notebook|diary|graph book|drawing book|chart paper|sticky notes|envelope|file folder|clipboard|a4 sheets/i, 'notebook'],
  [/ball pen|\bpencil\b|marker|highlighter|correction pen|sketch pens|wax crayons|watercolor|poster colors|\bpen\b/i, 'pen'],
  [/screwdriver|wrench|plier|spanner|allen|hacksaw|chisel|hammer|drill|measuring tape|spirit level|tool box|ladder|cycle lock|puncture/i, 'screwdriver'],
  [/multimeter|meter|calculator|speaker|earphone|mic\b|webcam|tripod|selfie stick|smartwatch/i, 'meter'],
  [/charger|cable|power bank|bulb|tube light|switch|mcb|wire|mouse|keyboard|hdmi|extension board|extension cord|torch|battery|screen guard|back case|memory card|pen drive/i, 'charger'],
  [/oil|ghee|honey|vinegar|sauce|ketchup|jam|shampoo|conditioner|wash\b|lotion|moisturizer|sunscreen|mouthwash|cream|sanitizer|cleaner|phenyl|alcohol|perfume|deodorant|detergent|softener|remover|freshener|repellent|degreaser|aftershave/i, 'bottle'],
  [/powder|masala|turmeric|haldi|salt|sugar|dal|rice|atta|besan|sooji|maida|jaggery|tea\b|coffee|pickle|papad|paneer|talcum/i, 'jar'],
  [/pot\b/i, 'pot'],
];

const CATEGORY_DEFAULT: Record<string, ArtKey> = {
  'vegetables-fruits': 'tomato',
  'grocery-staples': 'jar',
  'hardware-tools': 'screwdriver',
  'electronics-accessories': 'charger',
  stationery: 'notebook',
  'cleaning-household': 'bottle',
  'personal-care': 'bottle',
};

export function artKeyFor(name: string, categorySlug?: string): ArtKey {
  for (const [re, key] of RULES) if (re.test(name)) return key;
  if (categorySlug && CATEGORY_DEFAULT[categorySlug]) return CATEGORY_DEFAULT[categorySlug];
  return 'default';
}
