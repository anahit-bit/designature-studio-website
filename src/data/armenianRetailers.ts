/**
 * Armenian Retailers — collaboration/partner directory for
 * retail.designature.studio.
 *
 * Sanity (`armenianRetailer` docs, projectId 305mgeeu) is the live source of
 * truth; this file is the OFFLINE FALLBACK + type definition, mirroring the
 * pattern used by src/data/retailers.ts for the Shopping catalog.
 *
 * The seed below is ONE fully-filled, verified sample so the directory renders
 * before the full import lands. The rest of the ~85-shop list from
 * `E:/Business/Claude/Retail/Armenian Retail Shops.xlsm` gets entered in Studio.
 */

export type Budget = 'low' | 'mid' | 'high'
export type CollabClass = 'A' | 'B' | 'C' | 'unsorted'
export type RetailerStatus = 'active' | 'unverified' | 'closed'

export interface ArmenianRetailer {
  id: string
  nameEN: string
  nameAM?: string
  slug: string
  category: string
  tags: string[]
  budget?: Budget
  collabClass?: CollabClass
  description?: string
  deal?: string
  notes?: string
  website?: string
  instagram?: string
  facebook?: string
  contact?: string
  phone?: string
  email?: string
  address?: string
  logo?: string
  status: RetailerStatus
  verifiedAt?: string
  featured?: boolean
  order: number
}

/** Full English category taxonomy (drives the filter chips + Studio list). */
export const RETAILER_CATEGORIES = [
  'Furniture',
  'Lighting',
  'Doors',
  'Windows',
  'Flooring',
  'Tiles & Ceramics',
  'Curtains & Textiles',
  'Stone',
  'Wall Panels & Decor',
  'Electrical & Switches',
  'Sanitaryware',
  'Glass & Mirrors',
  'Paint & Coatings',
  'Building Materials',
  'Heating & HVAC',
  'Kitchen & Bath',
  'Accessories & Decor',
  'Metalwork',
  'Plants & Greenery',
  'Smart Home',
] as const

/** Full directory — 107 shops from the collaboration list + screenshots.
 * The 51 with status==='active' show on the site; the rest await verification in Studio. */
export const FALLBACK_ARMENIAN_RETAILERS: ArmenianRetailer[] = [
  { id: 'profiloporte-armenia', nameEN: 'ProfiloPorte Armenia', slug: 'profiloporte-armenia', category: 'Doors', tags: [], collabClass: 'A', facebook: 'https://www.facebook.com/Profiloportearmenia', contact: 'Vache', status: 'unverified', order: 10 },
  { id: 'classis-d-cor-curtains', nameEN: 'Classis Décor Curtains', slug: 'classis-d-cor-curtains', category: 'Curtains & Textiles', tags: [], collabClass: 'A', deal: '10% cashback', instagram: 'https://www.instagram.com/classis_decor_curtains/', contact: 'Hamlet Sarkissyians', phone: '+374 94 253169 10', status: 'unverified', order: 20 },
  { id: 'parkettavenue', nameEN: 'ParkettAvenue', slug: 'parkettavenue', category: 'Flooring', tags: [], collabClass: 'A', deal: 'Customers get 15% off | designers 5-7% cashback', website: 'https://parkettavenue.am/', phone: '+374 96 542239', status: 'active', verifiedAt: '2026-07-21', featured: true, order: 30 },
  { id: 'mek-furniture', nameEN: 'Mek furniture', slug: 'mek-furniture', category: 'Furniture', tags: [], collabClass: 'A', website: 'https://mekfurniture.net/hy/', contact: 'S', status: 'active', verifiedAt: '2026-07-21', order: 40 },
  { id: 'casa-ricca-by-euroluce', nameEN: 'Casa Ricca by euroluce', slug: 'casa-ricca-by-euroluce', category: 'Furniture', tags: ['italian', 'european', 'furniture', 'lighting', 'sanitary'], collabClass: 'A', description: 'Imports furniture, lighting, sanitary items & accessories from European brands.', website: 'https://euroluceinteriors.com/', instagram: 'https://www.instagram.com/casa_ricca_by_euroluce/', phone: '+374 10 536797', address: 'Leo 1 Street, Yerevan', status: 'active', verifiedAt: '2026-07-21', order: 50 },
  { id: 'niko', nameEN: 'Niko', slug: 'niko', category: 'Electrical & Switches', tags: [], collabClass: 'A', status: 'unverified', order: 60 },
  { id: 'nera-project', nameEN: 'Nera Project', slug: 'nera-project', category: 'Furniture', tags: [], collabClass: 'A', website: 'https://www.nera.am/', contact: 'Margarita Aghasyan-Nurijanyan; Instagram messenger', phone: '077776606', status: 'active', verifiedAt: '2026-07-21', order: 70 },
  { id: 'capital-interiors', nameEN: 'Capital_Interiors', slug: 'capital-interiors', category: 'Furniture', tags: [], collabClass: 'A', deal: '10% cashback', instagram: 'https://www.instagram.com/capital_interiors/', contact: 'Hamlet Sarkissyians', phone: '+374 94 253169 10', status: 'unverified', order: 80 },
  { id: 'jung', nameEN: 'Jung', slug: 'jung', category: 'Electrical & Switches', tags: [], collabClass: 'A', status: 'unverified', order: 90 },
  { id: 'ceramica', nameEN: 'Ceramica', slug: 'ceramica', category: 'Tiles & Ceramics', tags: [], collabClass: 'A', status: 'unverified', order: 100 },
  { id: 'comodo', nameEN: 'Comodo', slug: 'comodo', category: 'Furniture', tags: [], collabClass: 'B', website: 'http://comodo.am/', facebook: 'https://www.facebook.com/comodoarmenia', phone: '+374 33 422434 / +374 77 422424', status: 'active', verifiedAt: '2026-07-21', order: 110 },
  { id: 'd-energy', nameEN: 'D energy', slug: 'd-energy', category: 'Electrical & Switches', tags: [], collabClass: 'B', website: 'https://www.d-energy.am/', contact: 'Artyom, Davit???', phone: '+374 337 00037', status: 'active', verifiedAt: '2026-07-21', order: 120 },
  { id: 'maytoni', nameEN: 'Maytoni', slug: 'maytoni', category: 'Lighting', tags: [], collabClass: 'B', deal: '* Ձեր հիմնական զեղչը սպառողական արժեքի համար (РРЦ)  - 25%, որից վերջնական սպառողը կարող է ստանալ մինչև 10% չափով զեղչ(տարբերությունը փոխանցվում է ձեր հաշվին)։ Գներին կարող եք ծանոթանալ նաև մեր կայքում՝ փոխարժեքը փոխելով դրամի։', website: 'https://maytoni.ru/media/downloads/', phone: '+374 55 115068', status: 'active', verifiedAt: '2026-07-21', order: 130 },
  { id: 'kerama-marazzi', nameEN: 'Kerama Marazzi', slug: 'kerama-marazzi', category: 'Sanitaryware', tags: [], collabClass: 'B', deal: '3% cashback', website: 'https://kerama-marazzi.com/', contact: 'Elmira', phone: '+374 94 766 714 3', status: 'active', verifiedAt: '2026-07-21', order: 140 },
  { id: 'prof-al', nameEN: 'Prof Al', slug: 'prof-al', category: 'Doors', tags: [], collabClass: 'B', status: 'unverified', order: 150 },
  { id: 'stylestudio', nameEN: 'StyleStudio', slug: 'stylestudio', category: '', tags: [], collabClass: 'B', facebook: 'https://www.facebook.com/StyleStudioGA', contact: 'Ալեք Մանուկյան 17-41,', phone: '+374 55 43 33 03 / +374 12 70 77 70', status: 'unverified', order: 160 },
  { id: 'luminaled', nameEN: 'Luminaled', slug: 'luminaled', category: 'Lighting', tags: ['led', 'custom lighting', 'design'], collabClass: 'B', description: 'Premium-quality LED lights, custom/design luminaires.', instagram: 'https://www.instagram.com/__luminaled__/', facebook: 'https://www.facebook.com/profile.php?id=100089747011212&mibextid=LQQJ4d', phone: '00089747011212', status: 'active', verifiedAt: '2026-07-21', order: 170 },
  { id: 'gapex', nameEN: 'Gapex', slug: 'gapex', category: 'Glass & Mirrors', tags: [], collabClass: 'B', website: 'https://www.gapex.am', phone: '+374 91 982400', status: 'active', verifiedAt: '2026-07-21', order: 180 },
  { id: 'ador', nameEN: 'Ador', slug: 'ador', category: 'Doors', tags: [], collabClass: 'B', facebook: 'https://www.facebook.com/adorfactory', contact: 'Մարիամ Ղազանչյան; Instagram messenger; Elen Sahakyan', phone: '043110119', status: 'unverified', order: 190 },
  { id: 'alex-home', nameEN: 'alex home', slug: 'alex-home', category: 'Furniture', tags: [], collabClass: 'B', status: 'unverified', order: 200 },
  { id: 'bespoke-furniture', nameEN: 'Bespoke Furniture', slug: 'bespoke-furniture', category: 'Furniture', tags: [], collabClass: 'B', contact: 'Կահույք պատվերով; Ցանկացած նյութվ, մետաղ, փայտ,․․', phone: '+374 33 909903', status: 'unverified', order: 210 },
  { id: 'lana-edem', nameEN: 'Lana Edem', slug: 'lana-edem', category: 'Doors', tags: [], collabClass: 'B', status: 'unverified', order: 220 },
  { id: 'doornmore', nameEN: 'DoornMore', slug: 'doornmore', category: 'Doors', tags: [], collabClass: 'B', status: 'unverified', order: 230 },
  { id: 'myhomefurniture', nameEN: 'MY Home Furniture & More', slug: 'myhomefurniture', category: 'Furniture', tags: ['european', 'sofas', 'beds', 'italian', 'spanish'], budget: 'mid', collabClass: 'B', description: 'European premium furniture, Yerevan — imports from Italy, Spain, Belgium & France.', notes: 'Reseller — ships/imports furniture from: Kave Home (kavehome.com, Spain), Le Comfort (lecomfort.com, Italy), Connubia (connubia.com, Italy). Per their profile, also imports from Belgium & France.', instagram: 'https://www.instagram.com/myhomefurniture_and_more/', contact: 'Leo 48 (showroom)', phone: '+374 99 11 66 33', email: 'myhomefurniture@mail.ru', address: '48 Leo Street, Yerevan', status: 'active', verifiedAt: '2026-07-21', order: 240 },
  { id: 'arte-4-pat', nameEN: 'Arte 4 pat', slug: 'arte-4-pat', category: 'Furniture', tags: [], collabClass: 'B', website: 'https://www.arte4pat.am', contact: 'Tonikyan Armen', phone: '+374 93 615 786', status: 'unverified', order: 250 },
  { id: 'metrmark', nameEN: 'MetrMark', slug: 'metrmark', category: 'Furniture', tags: [], collabClass: 'B', deal: '5-8% cashback', facebook: 'https://www.facebook.com/metrmarkcom', phone: '+374 91 404212 / +374 96 822822 5-8', status: 'unverified', order: 260 },
  { id: 'derar-furniture', nameEN: 'Derar Furniture', slug: 'derar-furniture', category: 'Furniture', tags: [], collabClass: 'B', deal: '3%-5%', website: 'https://www.derar.am', contact: 'Armine(manager), Adriana', phone: '+374 33 80 60 80 3', status: 'active', verifiedAt: '2026-07-21', order: 270 },
  { id: 'dzzz-studio', nameEN: 'dzzz studio', slug: 'dzzz-studio', category: 'Lighting', tags: [], collabClass: 'B', phone: '+37495691471', status: 'unverified', order: 280 },
  { id: 'scandics', nameEN: 'Scandics', slug: 'scandics', category: 'Lighting', tags: [], collabClass: 'B', deal: '5% cashback < 500.000 | 7% >500000', website: 'https://www.scandics.am/', contact: 'Թագուհի; big projects to discuss', status: 'active', verifiedAt: '2026-07-21', order: 290 },
  { id: 'nur-mosaic', nameEN: 'Nur Mosaic', slug: 'nur-mosaic', category: 'Tiles & Ceramics', tags: [], collabClass: 'B', deal: '<=10%cashback', website: 'https://nurmosaic.am/', status: 'unverified', order: 300 },
  { id: 'bomond-armenia', nameEN: 'Bomond Armenia', slug: 'bomond-armenia', category: 'Tiles & Ceramics', tags: [], collabClass: 'B', status: 'unverified', order: 310 },
  { id: 'dezzign-it', nameEN: 'Dezzign_it', slug: 'dezzign-it', category: 'Wall Panels & Decor', tags: [], collabClass: 'C', deal: '5% cashback 500.000 | 10% cashback 1.000.000', website: 'https://drive.google.com/drive/folders/1YuiiCLa57KA6FWf383BrkN0jUKPyJNu3?usp=sharing', instagram: 'https://www.instagram.com/dezzign__it/?hl=en', phone: '+374 33 67 67 33 5', email: 'dezzignit67@gmail.com +374 33 67 67 33', status: 'unverified', order: 320 },
  { id: 'nor-tun', nameEN: 'Nor Tun', slug: 'nor-tun', category: 'Building Materials', tags: [], collabClass: 'C', website: 'https://www.nortun.am', phone: '+374 94364717', status: 'active', verifiedAt: '2026-07-21', order: 330 },
  { id: 'homer', nameEN: 'Homer', slug: 'homer', category: 'Building Materials', tags: [], collabClass: 'C', description: 'Construction & decorative materials for renovation (rebranded from VAK).', website: 'https://www.homer.am', facebook: 'Homer.am', phone: '+374 91 113441 / +374 33 349500', status: 'active', verifiedAt: '2026-07-21', order: 340 },
  { id: 'domus', nameEN: 'Domus', slug: 'domus', category: 'Building Materials', tags: [], collabClass: 'C', website: 'https://www.domus.am', contact: 'Karine, Nune', phone: '+374 91 007 955 / 077454079 / +374 77 313050', status: 'active', verifiedAt: '2026-07-21', order: 350 },
  { id: 'mox-armenia', nameEN: 'Mox_armenia', slug: 'mox-armenia', category: 'Wall Panels & Decor', tags: [], collabClass: 'C', facebook: 'https://www.facebook.com/mox_armenia-100684291786956', phone: '00684291786956 / +374 94 660068', status: 'unverified', order: 360 },
  { id: 'electrica', nameEN: 'electrica', slug: 'electrica', category: 'Lighting', tags: [], collabClass: 'C', deal: 'Designer 10% customer 5%, can be divided as wish the designer', website: 'https://electricagroup.am/', status: 'active', verifiedAt: '2026-07-21', order: 370 },
  { id: 'gesso-art-design', nameEN: 'Gesso Art Design', slug: 'gesso-art-design', category: 'Wall Panels & Decor', tags: [], collabClass: 'C', phone: '+374 33 331232', status: 'unverified', order: 380 },
  { id: 'dextone', nameEN: 'Dextone', slug: 'dextone', category: 'Stone', tags: ['travertine', 'granite', 'marble', 'decorative mosaics', 'stone sinks'], collabClass: 'C', website: 'https://dextone.am', instagram: 'https://www.instagram.com/dextone.am', facebook: 'https://www.facebook.com/DExtoneArmenia', phone: '+374 33 10 30 50', address: 'Komitas 49, Yerevan', status: 'active', verifiedAt: '2026-07-21', order: 390 },
  { id: 'petro-stone', nameEN: 'Petro Stone', slug: 'petro-stone', category: 'Stone', tags: [], collabClass: 'C', website: 'https://petro-stone.am', status: 'active', verifiedAt: '2026-07-21', order: 400 },
  { id: 'any-tuff', nameEN: 'any.tuff', slug: 'any-tuff', category: 'Stone', tags: [], collabClass: 'C', description: 'High-quality tuff tiles for facade & construction.', facebook: 'AnyTuff', phone: '096055855', status: 'active', verifiedAt: '2026-07-21', order: 410 },
  { id: 'stone-park', nameEN: 'Stone Park', slug: 'stone-park', category: 'Stone', tags: [], collabClass: 'C', instagram: 'https://www.instagram.com/stone.park__/', status: 'unverified', order: 420 },
  { id: 'madison-avenue', nameEN: 'Madison Avenue', slug: 'madison-avenue', category: 'Doors', tags: [], collabClass: 'unsorted', website: 'https://madison-brands.com/en/?utm_source=ig&utm_medium=social&utm_content=link_in_bio&fbclid=PAZXh0bgNhZW0CMTEAc3J0YwZhcHBfaWQMMjU2MjgxMDQwNTU4AAGncYR10GpeKZ9CRWOX6MMiQvcynRRAWUy1KSgbql_-URgmsoOuedNpTZAULr0_aem_fRbhDNl7YFUymuNh9J2wRQ&brid=CjF1lvbo3MDxXPFygZuDuA', instagram: 'https://www.instagram.com/madison_avenue_agency/?hl=en', facebook: 'https://www.facebook.com/karin.doors', phone: '+374 77 966833', status: 'unverified', order: 430 },
  { id: 'doss', nameEN: 'Doss', slug: 'doss', category: 'Furniture', tags: [], collabClass: 'unsorted', website: 'https://www.doss.am', contact: 'Davit Mikayelyan (Telegram)', status: 'unverified', order: 440 },
  { id: 'asko', nameEN: 'ASKO', slug: 'asko', category: 'Furniture', tags: [], collabClass: 'unsorted', website: 'https://www.asko.am', status: 'active', verifiedAt: '2026-07-21', order: 450 },
  { id: 'loft-furniture', nameEN: 'Loft Furniture', slug: 'loft-furniture', category: 'Furniture', tags: [], collabClass: 'unsorted', facebook: 'https://www.facebook.com/FurnitureLoftArmenia', status: 'unverified', order: 460 },
  { id: 'madera', nameEN: 'Madera', slug: 'madera', category: 'Furniture', tags: [], collabClass: 'unsorted', website: 'https://madera.am/', facebook: 'https://www.facebook.com/madera.furniture.factory', phone: '(091) 626283 / (055) 286010', status: 'active', verifiedAt: '2026-07-21', order: 470 },
  { id: 'faldi', nameEN: 'Faldi', slug: 'faldi', category: 'Lighting', tags: [], collabClass: 'unsorted', deal: 'նախագծի ծավալից կախված  5-9%։', website: 'https://faldi.ru/', contact: 'Faldi, 9 Չարենցի փողոց; Artashes; Siranush Mkrtchyan', phone: '+374 44 355504', email: 'Faldi, 9 Չարենցի փողոց +374 44 355504 (WA) Artashes Siranush Mkrtchyan armenia@faldi.ru', status: 'active', verifiedAt: '2026-07-21', order: 480 },
  { id: 'aneon', nameEN: 'Aneon', slug: 'aneon', category: 'Lighting', tags: [], collabClass: 'unsorted', website: 'https://www.aneon.co/', contact: 'Ani Makhsudyan (Linkedin)', phone: '+37493191499', status: 'active', verifiedAt: '2026-07-21', order: 490 },
  { id: 'ac-lights', nameEN: 'AC Lights', slug: 'ac-lights', category: 'Lighting', tags: [], collabClass: 'unsorted', contact: 'Iren', phone: '+374 94 001149', status: 'unverified', order: 500 },
  { id: 'light', nameEN: 'Լույս Light', nameAM: 'Լույս Light', slug: 'light', category: 'Lighting', tags: [], collabClass: 'unsorted', deal: '15% զեղչ հաճ․ +15% cahback', phone: '+37455408010 / +374 93 363530 15', status: 'unverified', order: 510 },
  { id: 'mashe-living', nameEN: 'Mashe Living', slug: 'mashe-living', category: 'Lighting', tags: [], collabClass: 'unsorted', contact: 'counte; Mariam  Papyan; փափազյան 17 ա 1 ին մուտք կոդ 57B', phone: '099576312', status: 'unverified', order: 520 },
  { id: 'wallcraft', nameEN: 'WallCraft', slug: 'wallcraft', category: 'Wall Panels & Decor', tags: [], collabClass: 'unsorted', instagram: 'https://www.instagram.com/wallcraft_am', address: 'Yerevan 0020', status: 'active', verifiedAt: '2026-07-21', order: 530 },
  { id: 'wall-deco', nameEN: 'Wall deco', slug: 'wall-deco', category: 'Wall Panels & Decor', tags: [], collabClass: 'unsorted', website: 'http://www.walldeco.am', facebook: 'https://www.facebook.com/walldecoproduct', phone: '+374 93 979770', status: 'active', verifiedAt: '2026-07-21', order: 540 },
  { id: 'darb-river', nameEN: 'Darb River', slug: 'darb-river', category: 'Curtains & Textiles', tags: [], collabClass: 'unsorted', description: 'Own-production wallpaper + interior design services. 100% recommended (12 reviews).', deal: '<=10%cashback', facebook: 'Darb River', contact: 'Alyona', status: 'active', verifiedAt: '2026-07-21', order: 550 },
  { id: 'ceramica-2', nameEN: 'Ceramica', slug: 'ceramica-2', category: 'Tiles & Ceramics', tags: [], collabClass: 'unsorted', deal: '10% cashback | 15% cashback > 5mln | 20% cashback > 10mln', website: 'https://ceramica.am/soon/', contact: 'Davit Balayan; Չարենց 7; (IE AMD Account)', phone: '041500740', status: 'active', verifiedAt: '2026-07-21', order: 560 },
  { id: 'kelvin', nameEN: 'Kelvin', slug: 'kelvin', category: 'Heating & HVAC', tags: [], collabClass: 'unsorted', deal: '10% cash cashback', website: 'https://www.kelvin.am', phone: '044327773', status: 'active', verifiedAt: '2026-07-21', order: 570 },
  { id: 'intext-group', nameEN: 'intext.group', slug: 'intext-group', category: 'Flooring', tags: [], collabClass: 'unsorted', description: 'Epoxy floors, microcement, stone carpet — German product.', website: 'https://www.epodex.com/am/', instagram: 'https://www.instagram.com/intext.group', facebook: 'Intext Group', address: 'Paruyr Sevak 8, Yerevan', status: 'active', verifiedAt: '2026-07-21', order: 580 },
  { id: 'muzeum-glass', nameEN: 'Muzeum Glass', slug: 'muzeum-glass', category: 'Glass & Mirrors', tags: [], collabClass: 'unsorted', instagram: 'https://www.instagram.com/muzeum_glass?igsh=M3Q2eWI4bDk1cDJm', contact: 'Ապակիներ; Հայելիներ; Լոգախցիկներ', status: 'unverified', order: 590 },
  { id: 'mesh-metal', nameEN: 'Mesh Metal', slug: 'mesh-metal', category: 'Metalwork', tags: [], collabClass: 'unsorted', facebook: 'https://www.facebook.com/profile.php?id=61575200940979', phone: '00940979', status: 'unverified', order: 600 },
  { id: 'martirosyanner-father-sons', nameEN: 'Martirosyanner Father & Sons', slug: 'martirosyanner-father-sons', category: 'Stone', tags: [], collabClass: 'unsorted', website: 'https://www.martirosyanner.am/', status: 'unverified', order: 610 },
  { id: 'viar', nameEN: 'Viar', slug: 'viar', category: 'Metalwork', tags: [], collabClass: 'unsorted', facebook: 'https://www.facebook.com/profile.php?id=100063755282244', contact: 'Մետաղական կոնստրուկցիաների պատրաստում և տեղադրում; (աստիչան, բազրիք)', phone: '00063755282244', status: 'unverified', order: 620 },
  { id: 'detal', nameEN: 'Detal', slug: 'detal', category: 'Doors', tags: [], collabClass: 'unsorted', facebook: 'https://www.facebook.com/profile.php?id=61574698048477', contact: 'Դռներ և մետաղական կոնստրուկցիաներ; Փոշեներկում և կահույքի արտադրություն', status: 'unverified', order: 630 },
  { id: 'oprint', nameEN: 'Oprint', slug: 'oprint', category: 'Curtains & Textiles', tags: [], collabClass: 'unsorted', facebook: 'https://www.facebook.com/oprint.am', status: 'unverified', order: 640 },
  { id: 'doym', nameEN: 'Doym', slug: 'doym', category: 'Furniture', tags: [], collabClass: 'unsorted', facebook: 'https://www.facebook.com/DoymKahuyq', status: 'unverified', order: 650 },
  { id: 'woodeco', nameEN: 'Woodeco', slug: 'woodeco', category: 'Building Materials', tags: [], collabClass: 'unsorted', website: 'https://www.woodeco.am', status: 'active', verifiedAt: '2026-07-21', order: 660 },
  { id: 'termo', nameEN: 'Termo', slug: 'termo', category: 'Heating & HVAC', tags: [], collabClass: 'unsorted', deal: 'https://termo.am/product-category/bio-stuffa/%D5%A2%D5%AB%D6%85%D5%A7%D5%BF%D5%A1%D5%AC%D5%B8%D5%B6%D5%A1%D5%B5%D5%AB%D5%B6-%D5%AF%D6%80%D5%A1%D5%AF%D5%A1%D6%80%D5%A1%D5%B6%D5%B6%D5%A5%D6%80/', website: 'https://termo.am/product-category/bio-stuffa/%D5%A2%D5%AB%D6%85%D5%A7%D5%BF%D5%A1%D5%AC%D5%B8%D5%B6%D5%A1%D5%B5%D5%AB%D5%B6-%D5%AF%D6%80%D5%A1%D5%AF%D5%A1%D6%80%D5%A1%D5%B6%D5%B6%D5%A5%D6%80/', status: 'active', verifiedAt: '2026-07-21', order: 670 },
  { id: 'shtigen', nameEN: 'Shtigen', slug: 'shtigen', category: 'Heating & HVAC', tags: [], collabClass: 'unsorted', website: 'https://shtigen.com/en/', status: 'active', verifiedAt: '2026-07-21', order: 680 },
  { id: 'bticino', nameEN: 'bticino', slug: 'bticino', category: 'Electrical & Switches', tags: [], collabClass: 'unsorted', description: 'Official Bticino (Italian sockets & switches) dealer in Armenia.', website: 'https://www.bticino.com/?fbclid=PAZXh0bgNhZW0CMTEAAaZUM56C8Mmx8YdTzbads614oi9jT6HVRURjeE8oPdsScOd6wyCX9lEcRGQ_aem_MWXv8m0EI_rkq4ll0TMKzg', instagram: 'https://www.instagram.com/bticino_armenia/', facebook: 'Bticino Armenia', contact: 'Սայաթ Նովա 25', phone: '+374 93 06 86 08', address: 'Vardanants, Yerevan', status: 'active', verifiedAt: '2026-07-21', order: 690 },
  { id: 'ismart', nameEN: 'iSmart', slug: 'ismart', category: 'Smart Home', tags: [], collabClass: 'unsorted', description: 'RECATEGORIZE? Aluminium shadow-gap / reveal profiles for interiors (not smart-home).', website: 'https://ismart.am/hy/', phone: '37433272821', address: 'Lvovyan 22, Yerevan', status: 'active', verifiedAt: '2026-07-21', order: 700 },
  { id: 'asedl', nameEN: 'Asedl', slug: 'asedl', category: 'Doors', tags: [], collabClass: 'unsorted', website: 'https://www.asedl.am/am/pages/index/home/', status: 'active', verifiedAt: '2026-07-21', order: 710 },
  { id: 'design-avenue', nameEN: 'Design Avenue', slug: 'design-avenue', category: 'Furniture', tags: ['italian', 'furniture', 'lighting'], collabClass: 'unsorted', description: 'Italian furniture, lighting & accessories for full interiors.', website: 'https://www.designavenue.am', instagram: 'https://www.instagram.com/design_avenue_yerevan/', status: 'active', verifiedAt: '2026-07-21', order: 720 },
  { id: 'the-main-design-store', nameEN: 'The main design store', slug: 'the-main-design-store', category: 'Accessories & Decor', tags: [], collabClass: 'unsorted', description: 'Items from major Armenian designers & brands. Open daily 13:00–21:00.', instagram: 'https://www.instagram.com/themaindesignstore', address: '10 Mher Mkrtchyan St (Mirzoyan Library), Yerevan', status: 'active', verifiedAt: '2026-07-21', order: 730 },
  { id: 'schloss-armenia', nameEN: 'Schloss Armenia', slug: 'schloss-armenia', category: 'Doors', tags: [], collabClass: 'unsorted', description: 'Doors, handles, locks — official ORO & ORO dealer.', instagram: 'https://www.instagram.com/schloss_armenia/', facebook: 'Schloss Armenia', phone: '095 21 07 20', address: 'Hovhannes Shiraz 36/1, Yerevan', status: 'active', verifiedAt: '2026-07-21', order: 740 },
  { id: 'r-v-comfort', nameEN: 'R&V Comfort', slug: 'r-v-comfort', category: '', tags: [], collabClass: 'unsorted', status: 'unverified', order: 750 },
  { id: 'sard', nameEN: 'Sard', slug: 'sard', category: 'Paint & Coatings', tags: [], collabClass: 'unsorted', status: 'unverified', order: 760 },
  { id: 'led-life', nameEN: 'LED Life', slug: 'led-life', category: 'Lighting', tags: [], collabClass: 'unsorted', status: 'unverified', order: 770 },
  { id: 'dekora', nameEN: 'Dekora', slug: 'dekora', category: 'Tiles & Ceramics', tags: [], collabClass: 'unsorted', status: 'unverified', order: 780 },
  { id: 'mane-tiles', nameEN: 'Mane Tiles', slug: 'mane-tiles', category: 'Tiles & Ceramics', tags: [], collabClass: 'unsorted', status: 'unverified', order: 790 },
  { id: 'ideal-system', nameEN: 'Ideal System', slug: 'ideal-system', category: '', tags: [], collabClass: 'unsorted', status: 'unverified', order: 800 },
  { id: 'jysk', nameEN: 'Jysk', slug: 'jysk', category: 'Furniture', tags: [], collabClass: 'unsorted', website: 'http://jysk.am/', status: 'active', verifiedAt: '2026-07-21', order: 810 },
  { id: 'muy-mucho', nameEN: 'Muy Mucho', slug: 'muy-mucho', category: 'Accessories & Decor', tags: [], collabClass: 'unsorted', facebook: 'https://www.facebook.com/muymuchoam/', status: 'unverified', order: 820 },
  { id: 'klaik', nameEN: 'Klaik', slug: 'klaik', category: 'Furniture', tags: [], collabClass: 'unsorted', status: 'unverified', order: 830 },
  { id: 'fortuna-home', nameEN: 'Fortuna Home', slug: 'fortuna-home', category: '', tags: [], collabClass: 'unsorted', status: 'unverified', order: 840 },
  { id: 'woolic', nameEN: 'Woolic', slug: 'woolic', category: '', tags: [], collabClass: 'unsorted', status: 'unverified', order: 850 },
  { id: 'eurobaza', nameEN: 'Eurobaza', slug: 'eurobaza', category: '', tags: [], collabClass: 'unsorted', status: 'unverified', order: 860 },
  { id: 'platinium', nameEN: 'Platinium', slug: 'platinium', category: '', tags: [], collabClass: 'unsorted', status: 'unverified', order: 870 },
  { id: 'living-s', nameEN: 'Living\'s', slug: 'living-s', category: 'Furniture', tags: [], collabClass: 'unsorted', website: 'https://livings.am/', status: 'active', verifiedAt: '2026-07-21', order: 880 },
  { id: 'ecohome', nameEN: 'Ecohome', slug: 'ecohome', category: 'Kitchen & Bath', tags: [], collabClass: 'unsorted', facebook: 'https://www.facebook.com/ecohomecucine/', contact: 'Sayat-Nova 40', phone: '094 010204', status: 'unverified', order: 890 },
  { id: 'ohanyan-s', nameEN: 'Ohanyan\'S', slug: 'ohanyan-s', category: 'Furniture', tags: [], collabClass: 'unsorted', facebook: 'https://www.facebook.com/OHANYANS.YEREVAN/posts/259011349258531', phone: '011349258531 / 033334475 / 093416412', status: 'unverified', order: 900 },
  { id: 'grossmeister', nameEN: 'Grossmeister', slug: 'grossmeister', category: 'Furniture', tags: [], collabClass: 'unsorted', status: 'unverified', order: 910 },
  { id: 'eco-glass', nameEN: 'Eco Glass', slug: 'eco-glass', category: 'Glass & Mirrors', tags: [], collabClass: 'unsorted', facebook: 'https://www.facebook.com/EcoGlassErevan/posts/2562479367397072', phone: '072 37495239960', status: 'unverified', order: 920 },
  { id: 'green-paradise', nameEN: 'Green Paradise', slug: 'green-paradise', category: 'Plants & Greenery', tags: [], collabClass: 'unsorted', status: 'unverified', order: 930 },
  { id: 'shen-textile', nameEN: 'Shen Textile', slug: 'shen-textile', category: 'Curtains & Textiles', tags: [], collabClass: 'unsorted', status: 'unverified', order: 940 },
  { id: 'green-point-armenia', nameEN: 'Green Point Armenia', slug: 'green-point-armenia', category: 'Plants & Greenery', tags: [], collabClass: 'unsorted', facebook: 'https://www.facebook.com/Green-Point-Armenia-105876520774495', phone: '05876520774495 / +374 98 919519', status: 'unverified', order: 950 },
  { id: 'la-imagine-avetisyanwoodenart', nameEN: 'La Imagine @AvetisyanWoodenArt', slug: 'la-imagine-avetisyanwoodenart', category: 'Accessories & Decor', tags: [], collabClass: 'unsorted', facebook: 'https://www.facebook.com/AvetisyanWoodenArt', phone: '+374 77 553338', email: 'La Imagine @AvetisyanWoodenArt', status: 'unverified', order: 960 },
  { id: 'wood-steel-arm', nameEN: 'Wood&steel.arm', slug: 'wood-steel-arm', category: 'Furniture', tags: [], collabClass: 'unsorted', facebook: 'https://www.facebook.com/WoodSteelarm-333301523953523', phone: '01523953523 / +374 77 978094', status: 'unverified', order: 970 },
  { id: 'marble-world', nameEN: 'Marble World', nameAM: 'Մարմարի Աշխարհ', slug: 'marble-world', category: 'Stone', tags: ['marble', 'natural stone', 'travertine', 'fireplace'], collabClass: 'unsorted', description: 'Natural stone / marble supplier, 30 years. Stones, fireplaces, plants.', instagram: 'https://www.instagram.com/marmariashkharh', status: 'active', verifiedAt: '2026-07-21', order: 980 },
  { id: 'tunstories', nameEN: 'TunStories', slug: 'tunstories', category: 'Curtains & Textiles', tags: ['rugs', 'kilim', 'textile', 'home decor'], collabClass: 'unsorted', description: 'Rugs & home decor textiles, Yerevan. Delivers across Armenia.', instagram: 'https://www.instagram.com/tun_store_am', facebook: 'Tun Stories', status: 'active', verifiedAt: '2026-07-21', order: 990 },
  { id: 'planka', nameEN: 'Planka', slug: 'planka', category: 'Furniture', tags: ['outdoor', 'wood', 'metal', 'custom'], collabClass: 'unsorted', description: 'Outdoor & indoor furniture and decor made from wood and metal.', phone: '055 500051', status: 'active', verifiedAt: '2026-07-21', order: 1000 },
  { id: 'lamp-factory', nameEN: 'LAMP factory', slug: 'lamp-factory', category: 'Lighting', tags: ['custom lighting', 'chandelier', 'made in armenia'], collabClass: 'unsorted', description: 'Individuum lighting factory — custom / individual lighting, made in Armenia, affordable.', status: 'active', verifiedAt: '2026-07-21', order: 1010 },
  { id: 'art-deco', nameEN: 'Art Deco', slug: 'art-deco', category: 'Paint & Coatings', tags: ['paint', 'varnish', 'coatings'], collabClass: 'unsorted', description: 'Varnish and paint materials, 45 colours.', status: 'active', verifiedAt: '2026-07-21', order: 1020 },
  { id: 'italon-armenia', nameEN: 'Italon Armenia', slug: 'italon-armenia', category: 'Tiles & Ceramics', tags: ['porcelain', 'tiles', 'italon', 'large format'], collabClass: 'unsorted', description: 'Official Italon porcelain-tile dealer in Armenia; specialized tile showroom.', website: 'https://shop-italonceramica.am', instagram: 'https://www.instagram.com/italonarmenia', status: 'active', verifiedAt: '2026-07-21', order: 1030 },
  { id: 'erebuni-corp', nameEN: 'Erebuni Corp', slug: 'erebuni-corp', category: 'Furniture', tags: ['wood slab', 'tables', 'furniture'], collabClass: 'unsorted', description: 'Furniture store — wood slab tables and more.', website: 'https://erebuni.net', facebook: 'erebuni.net', status: 'active', verifiedAt: '2026-07-21', order: 1040 },
  { id: 'scandihome', nameEN: 'ScandiHome', slug: 'scandihome', category: 'Furniture', tags: ['scandinavian', 'oak', 'minimalist'], collabClass: 'unsorted', description: 'Scandinavian-style oak furniture — tables, sideboards, shelves.', website: 'https://scandihome.am', instagram: 'https://www.instagram.com/scandihome.am', status: 'active', verifiedAt: '2026-07-21', order: 1050 },
  { id: 'vs-metal', nameEN: 'Vs_metal', slug: 'vs-metal', category: 'Metalwork', tags: ['stainless steel', 'kitchen', 'custom', 'metal'], collabClass: 'unsorted', description: 'Stainless-steel furniture (kitchen, custom). "Furniture for a lifetime."', instagram: 'https://www.instagram.com/vs_metalcompany', address: 'Tbilisyan Highway 3/10, Yerevan', status: 'active', verifiedAt: '2026-07-21', order: 1060 },
  { id: 'euroaccess', nameEN: 'Euroaccess', nameAM: 'Եվրոաքսես', slug: 'euroaccess', category: 'Building Materials', tags: ['attic ladder', 'loft stairs', 'keylite'], collabClass: 'unsorted', description: 'Attic ladders / loft stairs — Keylite dealer. Compact folding attic staircases.', status: 'active', verifiedAt: '2026-07-21', order: 1070 },
]
