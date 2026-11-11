// Демо-каталог по макетам docs/design. Названия, происхождение и ноты № 01–05, 07, 09, 11, 12 —
// из home.html, catalog.html и product.html; № 06, 08, 10 и товары для дома придуманы в том же духе.
// Деньги — копейки: 650_000 = 6 500 ₽.

type Density = 'light' | 'medium' | 'high';

export type SeedVariant = { volumeMl: number; priceKopecks: number; stock: number };

export type SeedProduct = {
  slug: string;
  specimenNumber: number;
  name: string;
  material: string;
  collection: string | null;
  categories: string[];
  origin: string;
  density: Density;
  concentration: string;
  longevityHours: number | null;
  description: string;
  story: string | null;
  notes: { top: string[]; heart: string[]; base: string[] };
  layers: { topMinutes: number; heartMinutes: number; baseMinutes: number };
  variants: SeedVariant[];
  /** Дней назад от момента сида; null — черновик, не опубликован. */
  publishedDaysAgo: number | null;
  isBestseller?: boolean;
  isNew?: boolean;
  isFeatured?: boolean;
  popularity: number;
  /** Главный снимок — образ аромата; файл в assets/photos. */
  photo: string;
  photoAlt: string;
};

export const MATERIALS = [
  { slug: 'limestone', name: 'Известняк', swatchColor: '#B8AA96' },
  { slug: 'travertine', name: 'Травертин', swatchColor: '#887D70' },
  { slug: 'basalt', name: 'Базальт', swatchColor: '#292725' },
  { slug: 'walnut', name: 'Орех', swatchColor: '#5A3A28' },
  { slug: 'amber', name: 'Янтарь', swatchColor: '#A85A32' },
];

/** Фактура материала — второй снимок каждого товара и фон «Истории образца». */
export const MATERIAL_PHOTOS: Record<string, { photo: string; alt: string }> = {
  limestone: { photo: 'textures/limestone.jpg', alt: 'Фактура известняка крупным планом' },
  travertine: { photo: 'textures/travertine.jpg', alt: 'Фактура травертина крупным планом' },
  basalt: { photo: 'textures/basalt.jpg', alt: 'Слоистый базальт крупным планом' },
  walnut: { photo: 'textures/walnut.jpg', alt: 'Тёмная древесина ореха крупным планом' },
  amber: { photo: 'textures/amber.jpg', alt: 'Отполированный янтарь с включениями' },
};

export const CATEGORIES = [
  { slug: 'women', name: 'Женские ароматы' },
  { slug: 'men', name: 'Мужские ароматы' },
  { slug: 'home', name: 'Для дома' },
  { slug: 'gift-sets', name: 'Подарочные наборы' },
  { slug: 'samples', name: 'Пробники' },
];

export const COLLECTIONS = [
  {
    slug: 'poroda',
    name: 'Порода',
    description: 'Ароматы, собранные из материалов: камня, дерева и смолы.',
  },
];

export const STORE_SETTINGS = {
  freeDeliveryThresholdKopecks: 1_000_000,
  courierPriceKopecks: 49_000,
  pickupPointPriceKopecks: 29_000,
  courierDays: '1–5',
  pickupPointDays: '2–6',
  lowStockThreshold: 3,
  boutiqueAddress: 'Москва, ул. Большие Каменщики, 9',
  boutiqueHours: 'Ежедневно 11:00–21:00',
};

const PERFUME = 'парфюмерная вода';

// Обычная линейка объёмов. Цена 50 мл задаёт остальные — так проще держать соотношение.
function perfumeVolumes(price50: number, stocks: [number, number, number]): SeedVariant[] {
  return [
    { volumeMl: 30, priceKopecks: price50 - 160_000, stock: stocks[0] },
    { volumeMl: 50, priceKopecks: price50, stock: stocks[1] },
    { volumeMl: 100, priceKopecks: price50 + 330_000, stock: stocks[2] },
  ];
}

const usualLayers = { topMinutes: 15, heartMinutes: 180, baseMinutes: 480 };

export const PRODUCTS: SeedProduct[] = [
  {
    slug: 'limestone',
    specimenNumber: 1,
    name: 'Известняк',
    material: 'limestone',
    collection: 'poroda',
    categories: ['women'],
    origin: 'осадочное плато',
    density: 'light',
    concentration: PERFUME,
    longevityHours: 6,
    description:
      'Светлый камень после дождя: влажная известь, пудровый ирис и чистый мускус. Лёгкий аромат на каждый день.',
    story: null,
    notes: {
      top: ['бергамот', 'известь'],
      heart: ['ирис', 'фиалка'],
      base: ['мускус', 'амбретта'],
    },
    layers: { topMinutes: 20, heartMinutes: 150, baseMinutes: 360 },
    variants: perfumeVolumes(590_000, [8, 12, 5]),
    publishedDaysAgo: 120,
    isBestseller: true,
    popularity: 80,
    photo: 'products/limestone.jpg',
    photoAlt: 'Светлый известняк крупным планом',
  },
  {
    slug: 'travertine',
    specimenNumber: 2,
    name: 'Травертин',
    material: 'travertine',
    collection: 'poroda',
    categories: ['women', 'men'],
    origin: 'горячие источники',
    density: 'medium',
    concentration: PERFUME,
    longevityHours: 7,
    description:
      'Пористая порода из горячих источников: влажная известь и тёплое солнце на фасаде, ирис и минеральные аккорды.',
    story: null,
    notes: {
      top: ['известь', 'инжир'],
      heart: ['ирис', 'минеральный аккорд'],
      base: ['кедр', 'мускус'],
    },
    layers: usualLayers,
    variants: perfumeVolumes(620_000, [6, 9, 4]),
    publishedDaysAgo: 110,
    isBestseller: true,
    popularity: 70,
    photo: 'products/travertine.jpg',
    photoAlt: 'Колонны из травертина в тёплом свете',
  },
  {
    slug: 'basalt',
    specimenNumber: 3,
    name: 'Базальт',
    material: 'basalt',
    collection: 'poroda',
    categories: ['men'],
    origin: 'вулканическое плато',
    density: 'high',
    concentration: PERFUME,
    longevityHours: 10,
    description:
      'Тёмная вулканическая порода, остывшая лава. Дымный, сухой, с перечной искрой сверху и смолистой глубиной, которая держится до утра.',
    story:
      'Мы искали запах камня, который ещё помнит огонь. Первые пробы пахли просто дымом — пока в сердце не появился ирис, а в базе ветивер и кожа.',
    notes: {
      top: ['чёрный перец', 'бергамот'],
      heart: ['ладан', 'ирис'],
      base: ['ветивер', 'кожа', 'смолы'],
    },
    layers: { topMinutes: 15, heartMinutes: 180, baseMinutes: 480 },
    // 50 мл — «Осталось 3 флакона», как в product.html.
    variants: perfumeVolumes(650_000, [10, 3, 6]),
    publishedDaysAgo: 100,
    isBestseller: true,
    isFeatured: true,
    popularity: 120,
    photo: 'products/basalt.jpg',
    photoAlt: 'Тёмные сколы базальта в полутьме',
  },
  {
    slug: 'walnut',
    specimenNumber: 4,
    name: 'Орех',
    material: 'walnut',
    collection: 'poroda',
    categories: ['men'],
    origin: 'старая древесина',
    density: 'high',
    concentration: PERFUME,
    longevityHours: 9,
    description:
      'Старое ореховое дерево: сухой кедр, табачный лист и тёмный лабданум, будто крышка старого стола.',
    story: null,
    notes: { top: ['кедр'], heart: ['табак', 'лабданум'], base: ['сандал', 'бобы тонка'] },
    layers: usualLayers,
    variants: perfumeVolumes(690_000, [5, 7, 4]),
    publishedDaysAgo: 95,
    isBestseller: true,
    popularity: 95,
    photo: 'products/walnut.jpg',
    photoAlt: 'Тёмная древесина ореха с крупным рисунком',
  },
  {
    slug: 'amber',
    specimenNumber: 5,
    name: 'Янтарь',
    material: 'amber',
    collection: 'poroda',
    categories: ['women'],
    origin: 'окаменевшая смола',
    density: 'high',
    concentration: PERFUME,
    longevityHours: 9,
    description:
      'Смола, пролежавшая в земле миллионы лет: тёплая амбра, сладкий бензоин и розовый перец сверху.',
    story: null,
    notes: { top: ['розовый перец'], heart: ['амбра', 'лабданум'], base: ['бензоин', 'ваниль'] },
    layers: { topMinutes: 10, heartMinutes: 200, baseMinutes: 540 },
    variants: perfumeVolumes(710_000, [4, 6, 3]),
    publishedDaysAgo: 90,
    popularity: 60,
    photo: 'products/amber.jpg',
    photoAlt: 'Капля янтарной смолы на коре',
  },
  {
    slug: 'chalk',
    specimenNumber: 6,
    name: 'Мел',
    material: 'limestone',
    collection: 'poroda',
    categories: ['women'],
    origin: 'меловые скалы',
    density: 'light',
    concentration: PERFUME,
    longevityHours: 5,
    description:
      'Белые скалы над морем: альдегиды, груша и рисовая пудра. Самый прозрачный образец коллекции.',
    story: null,
    notes: {
      top: ['альдегиды', 'груша'],
      heart: ['ирис', 'рисовая пудра'],
      base: ['белый мускус'],
    },
    layers: { topMinutes: 20, heartMinutes: 120, baseMinutes: 300 },
    variants: perfumeVolumes(560_000, [9, 11, 6]),
    publishedDaysAgo: 80,
    popularity: 35,
    photo: 'products/chalk.jpg',
    photoAlt: 'Меловые скалы над морем в сумерках',
  },
  {
    slug: 'ash',
    specimenNumber: 7,
    name: 'Пепел',
    material: 'basalt',
    collection: 'poroda',
    categories: ['men'],
    origin: 'остывшая лава',
    density: 'medium',
    concentration: PERFUME,
    longevityHours: 8,
    description: 'Остывшее кострище на склоне вулкана: берёзовый дёготь, мирра и тёплая зола.',
    story: null,
    notes: { top: ['берёзовый дёготь'], heart: ['мирра'], base: ['ладан', 'кожа'] },
    layers: usualLayers,
    variants: perfumeVolumes(640_000, [5, 6, 2]),
    publishedDaysAgo: 70,
    popularity: 50,
    photo: 'products/ash.jpg',
    photoAlt: 'Серая зола и угли на тёмной земле',
  },
  {
    slug: 'spring',
    specimenNumber: 8,
    name: 'Источник',
    material: 'travertine',
    collection: 'poroda',
    categories: ['women', 'men'],
    origin: 'термальные террасы',
    density: 'light',
    concentration: PERFUME,
    longevityHours: 5,
    description:
      'Пар над тёплой водой и мокрый камень террас: грейпфрут, шалфей и минеральная амбра.',
    story: null,
    notes: { top: ['грейпфрут'], heart: ['шалфей'], base: ['амбра', 'мускус'] },
    layers: { topMinutes: 25, heartMinutes: 120, baseMinutes: 300 },
    variants: perfumeVolumes(580_000, [7, 8, 5]),
    publishedDaysAgo: 60,
    popularity: 30,
    photo: 'products/spring.jpg',
    photoAlt: 'Травертиновые террасы горячего источника',
  },
  {
    slug: 'workshop',
    specimenNumber: 9,
    name: 'Мастерская',
    material: 'walnut',
    collection: 'poroda',
    categories: ['women', 'men'],
    origin: 'столярная мастерская',
    density: 'medium',
    concentration: PERFUME,
    longevityHours: 8,
    description: 'Верстак после работы: свежая стружка, пчелиный воск и бензоин.',
    story: null,
    notes: { top: ['стружка'], heart: ['воск'], base: ['бензоин'] },
    layers: usualLayers,
    variants: perfumeVolumes(670_000, [6, 5, 3]),
    publishedDaysAgo: 50,
    popularity: 45,
    photo: 'products/workshop.jpg',
    photoAlt: 'Стружка на старом верстаке',
  },
  {
    // Черновик: в каталоге не виден — проверка фильтра «только опубликованные».
    slug: 'resin',
    specimenNumber: 10,
    name: 'Смола',
    material: 'amber',
    collection: 'poroda',
    categories: ['men'],
    origin: 'сосновый бор',
    density: 'high',
    concentration: PERFUME,
    longevityHours: 9,
    description: 'Сосновая смола на разогретой коре: можжевельник, ладан и тёплая амбра.',
    story: null,
    notes: { top: ['можжевельник'], heart: ['сосновая смола'], base: ['ладан', 'амбра'] },
    layers: usualLayers,
    variants: perfumeVolumes(700_000, [4, 4, 2]),
    publishedDaysAgo: null,
    popularity: 0,
    photo: 'products/resin.jpg',
    photoAlt: 'Капля смолы на тёмной коре',
  },
  {
    // Нет в наличии ни одного объёма — карточка «Сообщить» из catalog.html.
    slug: 'obsidian',
    specimenNumber: 11,
    name: 'Обсидиан',
    material: 'basalt',
    collection: 'poroda',
    categories: ['men'],
    origin: 'вулканическое стекло',
    density: 'high',
    concentration: PERFUME,
    longevityHours: 10,
    description: 'Чёрное вулканическое стекло: дымный уд, холодный кардамон и плотная амбра.',
    story: null,
    notes: { top: ['уд', 'кардамон'], heart: ['амбра'], base: ['пачули', 'кожа'] },
    layers: { topMinutes: 10, heartMinutes: 240, baseMinutes: 600 },
    variants: perfumeVolumes(820_000, [0, 0, 0]),
    publishedDaysAgo: 40,
    isBestseller: true,
    popularity: 85,
    photo: 'products/obsidian.jpg',
    photoAlt: 'Чёрный камень на чёрном фоне',
  },
  {
    slug: 'cut',
    specimenNumber: 12,
    name: 'Срез',
    material: 'walnut',
    collection: 'poroda',
    categories: ['women'],
    origin: 'спил старого ореха',
    density: 'medium',
    concentration: PERFUME,
    longevityHours: 8,
    description: 'Свежий спил ореха: сливочный сандал, ваниль и мягкая кожа.',
    story: null,
    notes: { top: ['сандал'], heart: ['ваниль'], base: ['кожа', 'мускус'] },
    layers: usualLayers,
    // 100 мл закончился — частично доступный товар.
    variants: perfumeVolumes(710_000, [5, 4, 0]),
    publishedDaysAgo: 5,
    isNew: true,
    popularity: 20,
    photo: 'products/cut.jpg',
    photoAlt: 'Спил дерева с годовыми кольцами',
  },
  {
    slug: 'courtyard-after-rain',
    specimenNumber: 13,
    name: 'Двор после грозы',
    material: 'limestone',
    collection: null,
    categories: ['home'],
    origin: 'бетонный двор',
    density: 'light',
    concentration: 'аромат для дома',
    longevityHours: null,
    description: 'Спрей для комнаты: мокрый камень, озон и листья после грозы.',
    story: null,
    notes: { top: ['озон'], heart: ['мокрый камень'], base: ['ветивер'] },
    layers: { topMinutes: 10, heartMinutes: 60, baseMinutes: 180 },
    variants: [
      { volumeMl: 100, priceKopecks: 290_000, stock: 12 },
      { volumeMl: 250, priceKopecks: 520_000, stock: 6 },
    ],
    publishedDaysAgo: 30,
    popularity: 15,
    photo: 'products/courtyard-after-rain.jpg',
    photoAlt: 'Капли дождя на мокром бетоне',
  },
  {
    slug: 'hearth',
    specimenNumber: 14,
    name: 'Очаг',
    material: 'walnut',
    collection: null,
    categories: ['home'],
    origin: 'каменная печь',
    density: 'high',
    concentration: 'диффузор',
    longevityHours: null,
    description: 'Диффузор для дома: тлеющий орех, смола и немного дыма.',
    story: null,
    notes: { top: ['дым'], heart: ['орех'], base: ['смолы', 'ваниль'] },
    layers: { topMinutes: 30, heartMinutes: 600, baseMinutes: 1440 },
    variants: [{ volumeMl: 200, priceKopecks: 480_000, stock: 8 }],
    publishedDaysAgo: 25,
    popularity: 12,
    photo: 'products/hearth.jpg',
    photoAlt: 'Огонь в каменном очаге',
  },
  {
    slug: 'specimen-set',
    specimenNumber: 15,
    name: 'Образцы породы',
    material: 'basalt',
    collection: 'poroda',
    categories: ['gift-sets'],
    origin: 'вся коллекция',
    density: 'medium',
    concentration: 'набор: 5 × 10 мл',
    longevityHours: null,
    description: 'Подарочный набор из пяти образцов: Известняк, Травертин, Базальт, Орех и Янтарь.',
    story: null,
    notes: { top: ['бергамот'], heart: ['ирис', 'ладан'], base: ['кедр', 'амбра'] },
    layers: usualLayers,
    variants: [{ volumeMl: 50, priceKopecks: 890_000, stock: 5 }],
    publishedDaysAgo: 20,
    popularity: 40,
    photo: 'products/specimen-set.jpg',
    photoAlt: 'Тёмная порода с тонкими слоями',
  },
  {
    slug: 'sample-set',
    specimenNumber: 16,
    name: 'Пробники коллекции',
    material: 'limestone',
    collection: 'poroda',
    categories: ['samples'],
    origin: 'вся коллекция',
    density: 'light',
    concentration: 'набор: 6 × 2 мл',
    longevityHours: null,
    description: 'Шесть пробников по 2 мл, чтобы выбрать свой образец.',
    story: null,
    notes: { top: ['бергамот'], heart: ['ирис'], base: ['мускус'] },
    layers: usualLayers,
    variants: [{ volumeMl: 12, priceKopecks: 190_000, stock: 30 }],
    publishedDaysAgo: 15,
    popularity: 25,
    photo: 'products/sample-set.jpg',
    photoAlt: 'Пробирки с янтарной жидкостью',
  },
];

// --- Контент (этап 8): начальные слайды и статьи. Админка правит их в БД; повторный сид не
// перезаписывает отредактированное — слайды создаются только в пустой таблице, статьи — по новому slug.
// Окончательные тексты — этап 11.

export const HERO_SLIDES = [
  {
    label: 'Глубина 0\u00A0м · поверхность',
    title: 'Ароматы, высеченные из\u00A0камня',
    text: 'Запахи материалов: известняка после дождя, старого ореха, дымного базальта. Каждый аромат\u00A0— небольшая архитектура из\u00A0нот.',
    ctaLabel: 'Смотреть образцы',
    ctaHref: '/catalog',
    imageAlt:
      'Флакон из янтарного стекла на базальтовом постаменте, коряга тёмного ореха; снимок в полутьме',
    photo: 'hero/hero-1.jpg',
  },
  {
    label: 'Глубина −120\u00A0м · базальт',
    title: 'Камень, который помнит огонь',
    text: 'Базальт\u00A0— дымный и\u00A0сухой, с\u00A0перечной искрой сверху и\u00A0смолистой глубиной. Самый тёмный образец коллекции.',
    ctaLabel: 'Открыть образец',
    ctaHref: '/catalog/basalt',
    imageAlt: 'Чёрный флакон на срезе базальта в боковом оранжевом свете',
    photo: 'hero/hero-2.jpg',
  },
  {
    label: 'Глубина −180\u00A0м · травертин',
    title: 'Найдём вашу породу',
    text: 'Три вопроса о\u00A0настроении и\u00A0характере\u00A0— и\u00A0мы покажем образцы, которые подойдут именно вам.',
    ctaLabel: 'Подобрать аромат',
    ctaHref: '/fragrance-finder',
    imageAlt: 'Флаконы коллекции на ореховой полке, тёплый свет из глубины бутика',
    photo: 'hero/hero-3.jpg',
  },
];

export const ARTICLES = [
  {
    slug: 'concrete-courtyard',
    tag: 'Архитектура',
    title: 'Как пахнет бетонный двор после\u00A0грозы',
    lead: 'Петрикор, мокрый бетон и\u00A0остывающий асфальт: разбираем запах города после дождя на\u00A0ноты.',
    body: [
      'Запах после грозы рождается не\u00A0в\u00A0воздухе, а\u00A0в\u00A0камне. Пористые материалы\u00A0— бетон, известняк, кирпич\u00A0— за\u00A0сухие дни впитывают масла растений и\u00A0пыль, а\u00A0первые капли выталкивают их наружу.',
      'В\u00A0лаборатории мы собираем этот запах из\u00A0трёх частей: минеральной свежести, едва заметной сладости мокрой листвы и\u00A0тёплой пыльной базы. Убери одну\u00A0— и\u00A0двор превращается в\u00A0аптеку или в\u00A0сад.',
      'Так появился «Двор после дождя»\u00A0— образец для дома, который мы собирали дольше всех.',
    ],
    publishedDaysAgo: 20,
    photo: 'journal/concrete-courtyard.jpg',
    coverAlt: 'Мокрый двор после дождя, мох на камне',
  },
  {
    slug: 'amber-glass',
    tag: 'Мастерская',
    title: 'Янтарное стекло: почему ни\u00A0один флакон не\u00A0повторяется',
    lead: 'Флаконы выдувают вручную небольшими партиями\u00A0— и\u00A0у\u00A0каждого свой оттенок и\u00A0пузырьки воздуха.',
    body: [
      'Янтарное стекло защищает аромат от\u00A0света, но\u00A0для нас важнее другое: в\u00A0нём видно руку мастера. Толщина стенки, оттенок, редкий пузырёк воздуха\u00A0— всё это остаётся во\u00A0флаконе.',
      'Мы не\u00A0отбраковываем такие флаконы. Номер образца на\u00A0этикетке и\u00A0неровность стекла вместе делают каждый экземпляр единственным.',
    ],
    publishedDaysAgo: 35,
    photo: 'journal/amber-glass.jpg',
    coverAlt: 'Стекло в пламени горелки',
  },
  {
    slug: 'perfumer-interview',
    tag: 'Интервью',
    title: 'Парфюмер о\u00A0том, как переводить камень в\u00A0ноты',
    lead: 'Разговор о\u00A0том, почему базальт пахнет дымом, а\u00A0известняк\u00A0— мелом и\u00A0ирисом.',
    body: [
      '\u00A0— С\u00A0чего начинается образец?\u00A0— С\u00A0куска породы на\u00A0столе. Я\u00A0держу его в\u00A0руках неделю, пока не\u00A0пойму, какой у\u00A0него характер: холодный, тёплый, сухой, влажный.',
      '\u00A0— А\u00A0потом?\u00A0— Потом ищу ноты, которые дают тот же характер. Базальту нужен дым и\u00A0перец, известняку\u00A0— мел и\u00A0пудровый ирис. Камень не\u00A0пахнет сам по\u00A0себе\u00A0— он подсказывает настроение.',
    ],
    publishedDaysAgo: 50,
    photo: 'journal/perfumer-interview.jpg',
    coverAlt: 'Пипетка над флаконом с янтарной жидкостью',
  },
];
