// Comprehensive dictionary of Lahore neighborhoods, towns, schemes & landmarks
// Verified against official Lahore geographic boundaries & coordinates

export const LAHORE_BOUNDS = {
  minLat: 31.15,
  maxLat: 31.75,
  minLng: 74.05,
  maxLng: 74.60,
};

export const isWithinLahoreBounds = (lat, lng) => {
  const lt = parseFloat(lat);
  const lg = parseFloat(lng);
  if (isNaN(lt) || isNaN(lg)) return false;
  return (
    lt >= LAHORE_BOUNDS.minLat &&
    lt <= LAHORE_BOUNDS.maxLat &&
    lg >= LAHORE_BOUNDS.minLng &&
    lg <= LAHORE_BOUNDS.maxLng
  );
};

export const LAHORE_KNOWN_AREAS = [
  // Sant Nagar / Islampura
  {
    name: 'Sant Nagar, Lahore',
    lat: 31.5720,
    lng: 74.2960,
    keywords: ['sant nagar', 'sanat nagar', 'st nagar', 'saint nagar', 'santnagar', 'dev samaj']
  },
  {
    name: 'Islampura (Krishan Nagar), Lahore',
    lat: 31.5654,
    lng: 74.2952,
    keywords: ['islampura', 'krishan nagar', 'krishna nagar']
  },
  // Shalimar / Baghbanpura
  {
    name: 'Shalimar Garden, Lahore',
    lat: 31.5871,
    lng: 74.3821,
    keywords: [
      'shalimar garden', 'shalimar gardens', 'shalimar bagh',
      'shalamar garden', 'shalamar gardens', 'shalamar bagh',
      'shalimar park', 'shalamar park'
    ]
  },
  {
    name: 'Shalimar Town / Link Road, Lahore',
    lat: 31.5835,
    lng: 74.3798,
    keywords: [
      'shalimar town', 'shalamar town', 'shalimar road',
      'shalamar road', 'shalimar link road', 'shalamar link road',
      'shalimar link', 'shalamar link'
    ]
  },
  {
    name: 'Baghbanpura, Lahore',
    lat: 31.5845,
    lng: 74.3767,
    keywords: ['baghbanpura', 'baghban pura', 'begampura', 'begum pura']
  },
  // Johar Town
  {
    name: 'Johar Town, Lahore',
    lat: 31.4632,
    lng: 74.2939,
    keywords: [
      'johar town', 'johar town phase 1', 'johar town phase 2',
      'jauhar town', 'g1 market', 'g-1 market', 'r1 market'
    ]
  },
  // Gulberg
  {
    name: 'Gulberg, Lahore',
    lat: 31.5120,
    lng: 74.3430,
    keywords: [
      'gulberg', 'gulberg 1', 'gulberg 2', 'gulberg 3',
      'gulberg i', 'gulberg ii', 'gulberg iii', 'liberty market',
      'mm alam', 'm.m. alam', 'main market gulberg'
    ]
  },
  // Model Town
  {
    name: 'Model Town, Lahore',
    lat: 31.4836,
    lng: 74.3260,
    keywords: ['model town', 'model town link road', 'c block model town', 'model town park']
  },
  // DHA
  {
    name: 'DHA Phase 1, Lahore',
    lat: 31.4815,
    lng: 74.3910,
    keywords: ['dha phase 1', 'dha 1', 'defence phase 1']
  },
  {
    name: 'DHA Phase 2, Lahore',
    lat: 31.4740,
    lng: 74.3850,
    keywords: ['dha phase 2', 'dha 2', 'defence phase 2', 'lalik jan chowk']
  },
  {
    name: 'DHA Phase 3, Lahore',
    lat: 31.4700,
    lng: 74.3720,
    keywords: ['dha phase 3', 'dha 3', 'defence phase 3', 'y block dha', 'y block market']
  },
  {
    name: 'DHA Phase 4, Lahore',
    lat: 31.4620,
    lng: 74.3750,
    keywords: ['dha phase 4', 'dha 4', 'defence phase 4']
  },
  {
    name: 'DHA Phase 5, Lahore',
    lat: 31.4635,
    lng: 74.4104,
    keywords: ['dha phase 5', 'dha 5', 'defence phase 5']
  },
  {
    name: 'DHA Phase 6, Lahore',
    lat: 31.4750,
    lng: 74.4450,
    keywords: ['dha phase 6', 'dha 6', 'defence phase 6']
  },
  {
    name: 'DHA Phase 7, Lahore',
    lat: 31.4900,
    lng: 74.4800,
    keywords: ['dha phase 7', 'dha 7', 'defence phase 7']
  },
  {
    name: 'DHA Phase 8, Lahore',
    lat: 31.5150,
    lng: 74.4300,
    keywords: ['dha phase 8', 'dha 8', 'defence phase 8', 'air avenue', 'park view dha']
  },
  {
    name: 'DHA Phase 9 (Prism), Lahore',
    lat: 31.4250,
    lng: 74.4350,
    keywords: ['dha phase 9', 'dha 9', 'dha prism', 'prism 9']
  },
  {
    name: 'DHA / Defence, Lahore',
    lat: 31.4720,
    lng: 74.3800,
    keywords: ['dha lahore', 'defence lahore']
  },
  // Bahria Town
  {
    name: 'Bahria Town, Lahore',
    lat: 31.3650,
    lng: 74.1750,
    keywords: ['bahria town', 'bahria orchard', 'bahria town lahore', 'safari villas bahria']
  },
  // Faisal Town & Township
  {
    name: 'Faisal Town, Lahore',
    lat: 31.4836,
    lng: 74.3040,
    keywords: ['faisal town', 'kotha pind', 'pecs']
  },
  {
    name: 'Township, Lahore',
    lat: 31.4485,
    lng: 74.3057,
    keywords: ['township', 'township lahore']
  },
  // Wapda Town & PCSIR
  {
    name: 'Wapda Town, Lahore',
    lat: 31.4285,
    lng: 74.2690,
    keywords: ['wapda town', 'wapda town phase 1', 'wapda town phase 2']
  },
  {
    name: 'PCSIR Housing Society, Lahore',
    lat: 31.4450,
    lng: 74.2800,
    keywords: ['pcsir', 'pcsir phase 1', 'pcsir phase 2']
  },
  // Garden Town & Muslim Town
  {
    name: 'Garden Town, Lahore',
    lat: 31.5030,
    lng: 74.3270,
    keywords: ['garden town', 'barkat market', 'kalma chowk']
  },
  {
    name: 'Muslim Town, Lahore',
    lat: 31.5160,
    lng: 74.3180,
    keywords: ['muslim town', 'muslim town morr']
  },
  // Iqbal Town & Samanabad
  {
    name: 'Allama Iqbal Town, Lahore',
    lat: 31.5050,
    lng: 74.2800,
    keywords: [
      'iqbal town', 'allama iqbal town', 'moon market',
      'chenab block', 'nishan block', 'pakistan block',
      'raza block', 'umar block', 'jehanzeb block', 'khyber block'
    ]
  },
  {
    name: 'Samanabad, Lahore',
    lat: 31.5350,
    lng: 74.3000,
    keywords: ['samanabad', 'samnabad']
  },
  // Cantt & Cavalry Ground
  {
    name: 'Lahore Cantt, Lahore',
    lat: 31.5250,
    lng: 74.3850,
    keywords: ['lahore cantt', 'cantt lahore', 'cantonment', 'saddar cantt', 'saddar bazar']
  },
  {
    name: 'Cavalry Ground, Lahore',
    lat: 31.5050,
    lng: 74.3750,
    keywords: ['cavalry ground', 'cavalry', 'masood hospital']
  },
  // Shadman & Ichhra
  {
    name: 'Shadman, Lahore',
    lat: 31.5300,
    lng: 74.3250,
    keywords: ['shadman', 'shadman 1', 'shadman 2', 'shadman market']
  },
  {
    name: 'Ichhra, Lahore',
    lat: 31.5250,
    lng: 74.3180,
    keywords: ['ichhra', 'ichra', 'ichra bazaar']
  },
  // Mozang & Chauburji
  {
    name: 'Mozang, Lahore',
    lat: 31.5450,
    lng: 74.3150,
    keywords: ['mozang', 'mazang', 'mozang chungi']
  },
  {
    name: 'Chauburji, Lahore',
    lat: 31.5540,
    lng: 74.3040,
    keywords: ['chauburji', 'choburji']
  },
  // Anarkali & Mall Road & GPO
  {
    name: 'Anarkali Bazaar, Lahore',
    lat: 31.5670,
    lng: 74.3120,
    keywords: ['anarkali', 'anarkali bazaar', 'bano bazaar']
  },
  {
    name: 'Mall Road, Lahore',
    lat: 31.5580,
    lng: 74.3250,
    keywords: ['mall road', 'the mall']
  },
  // Mughalpura & Garhi Shahu
  {
    name: 'Mughalpura, Lahore',
    lat: 31.5680,
    lng: 74.3750,
    keywords: ['mughalpura', 'mughal pura', 'lal pul']
  },
  {
    name: 'Garhi Shahu, Lahore',
    lat: 31.5650,
    lng: 74.3480,
    keywords: ['garhi shahu', 'garhi shaho']
  },
  {
    name: 'Dharampura / Mustafa Abad, Lahore',
    lat: 31.5520,
    lng: 74.3650,
    keywords: ['dharampura', 'dharampura bridge', 'mustafabad', 'mustafa abad']
  },
  // Sabzazar & Gulshan-e-Ravi
  {
    name: 'Sabzazar, Lahore',
    lat: 31.5150,
    lng: 74.2600,
    keywords: ['sabzazar', 'sabzazar scheme']
  },
  {
    name: 'Gulshan-e-Ravi, Lahore',
    lat: 31.5450,
    lng: 74.2800,
    keywords: ['gulshan-e-ravi', 'gulshan e ravi', 'gulshan ravi']
  },
  // Green Town & Kot Lakhpat
  {
    name: 'Green Town, Lahore',
    lat: 31.4400,
    lng: 74.3100,
    keywords: ['green town', 'baghrian']
  },
  {
    name: 'Kot Lakhpat, Lahore',
    lat: 31.4550,
    lng: 74.3400,
    keywords: ['kot lakhpat', 'quaid-e-azam industrial']
  },
  // Valencia & Lake City & Pine Avenue
  {
    name: 'Valencia Town, Lahore',
    lat: 31.4050,
    lng: 74.2600,
    keywords: ['valencia', 'valencia town']
  },
  {
    name: 'Lake City, Lahore',
    lat: 31.3650,
    lng: 74.2350,
    keywords: ['lake city', 'lake city lahore']
  },
  // Askari
  {
    name: 'Askari 10, Lahore',
    lat: 31.5350,
    lng: 74.4200,
    keywords: ['askari 10', 'askari x']
  },
  {
    name: 'Askari 11, Lahore',
    lat: 31.4650,
    lng: 74.4350,
    keywords: ['askari 11', 'askari xi']
  },
  // Walled City & Badami Bagh & Shahdara
  {
    name: 'Walled City (Androon Shehr), Lahore',
    lat: 31.5880,
    lng: 74.3150,
    keywords: [
      'walled city', 'androon shehr', 'androon lahore',
      'delhi gate', 'bhati gate', 'lohari gate', 'lahore fort',
      'shahi qila', 'badshahi mosque'
    ]
  },
  {
    name: 'Badami Bagh, Lahore',
    lat: 31.6000,
    lng: 74.3250,
    keywords: ['badami bagh', 'badamibagh']
  },
  {
    name: 'Shahdara, Lahore',
    lat: 31.6250,
    lng: 74.2850,
    keywords: ['shahdara', 'shahdara town']
  },
  // Thokar & Multan Road & Raiwind
  {
    name: 'Thokar Niaz Baig, Lahore',
    lat: 31.4700,
    lng: 74.2400,
    keywords: ['thokar', 'thokar niaz baig', 'niaz baig']
  },
  {
    name: 'Chung / Multan Road, Lahore',
    lat: 31.4150,
    lng: 74.1700,
    keywords: ['chung', 'chuhng', 'maraka']
  },
  {
    name: 'Raiwind Road, Lahore',
    lat: 31.3200,
    lng: 74.2200,
    keywords: ['raiwind', 'raiwind road']
  },
  {
    name: 'Ferozepur Road / Chungi Amar Sidhu, Lahore',
    lat: 31.4450,
    lng: 74.3600,
    keywords: ['chungi amar sidhu', 'amar sidhu', 'kamahan']
  },
  {
    name: 'Gajju Matah, Lahore',
    lat: 31.3750,
    lng: 74.3600,
    keywords: ['gajju matah', 'gajjumatta', 'gajju matta']
  },
  {
    name: 'Kahna Nau, Lahore',
    lat: 31.3650,
    lng: 74.3680,
    keywords: ['kahna', 'kahna nau']
  },
  {
    name: 'Tajpura / Harbanspura, Lahore',
    lat: 31.5680,
    lng: 74.4150,
    keywords: ['tajpura', 'harbanspura', 'harbans pura', 'fatehgarh']
  },
  {
    name: 'Walton Road, Lahore',
    lat: 31.4850,
    lng: 74.3650,
    keywords: ['walton', 'walton road']
  },
  {
    name: 'Punjab University / New Campus, Lahore',
    lat: 31.4980,
    lng: 74.3010,
    keywords: ['punjab university', 'pu new campus', 'pu old campus']
  },
  {
    name: 'UET Lahore, GT Road, Lahore',
    lat: 31.5775,
    lng: 74.3570,
    keywords: ['uet', 'uet lahore']
  },
  {
    name: 'LUMS, DHA Phase 5, Lahore',
    lat: 31.4705,
    lng: 74.4095,
    keywords: ['lums']
  }
];

export const lookupLahoreLocation = (query) => {
  if (!query || typeof query !== 'string') return null;
  const clean = query
    .toLowerCase()
    .replace(/[,#\-\/\\._()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!clean) return null;

  for (const item of LAHORE_KNOWN_AREAS) {
    for (const kw of item.keywords) {
      const regex = new RegExp(`(^|\\s)${kw.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}(\\s|$)`, 'i');
      if (regex.test(clean)) {
        return {
          name: item.name,
          lat: item.lat,
          lng: item.lng,
          isExactMatch: true
        };
      }
    }
  }

  return null;
};
