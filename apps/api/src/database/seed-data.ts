// Демо-каталог. Материалы и ноты — по макетам docs/design, названия, тексты и новинки № 17–19 —
// по контент-брифу docs/CONTENT.md (этап 10).
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
    name: 'Известняк после дождя',
    material: 'limestone',
    collection: 'poroda',
    categories: ['women'],
    origin: 'осадочное плато',
    density: 'light',
    concentration: PERFUME,
    longevityHours: 6,
    description:
      'Светлый камень после короткого дождя: мокрая известь, пудровый ирис и чистый мускус. Лёгкий аромат, который не спорит с днём.',
    story:
      'Я принёс в мастерскую обломок известняка с обочины и полил его водой из стакана. Запах продержался секунд двадцать — весь образец построен вокруг этих двадцати секунд.',
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
    name: 'Тёплый травертин',
    material: 'travertine',
    collection: 'poroda',
    categories: ['women', 'men'],
    origin: 'горячие источники',
    density: 'medium',
    concentration: PERFUME,
    longevityHours: 7,
    description:
      'Пористая порода тёплых источников, нагретая солнцем: спелый инжир, ирис и минеральная пыль старого фасада.',
    story:
      'Травертин тёплый на ощупь даже в тени. Мы добавили инжир, чтобы аромат был таким же — тёплым без единой сладкой ноты сверху.',
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
    name: 'Дым базальта',
    material: 'basalt',
    collection: 'poroda',
    categories: ['men'],
    origin: 'вулканическое плато',
    density: 'high',
    concentration: PERFUME,
    longevityHours: 10,
    description:
      'Остывшая лава, в которой ещё живёт огонь. Сухой дым, перечная искра сверху и смолистая глубина, которая держится до утра.',
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
    name: 'Старый орех',
    material: 'walnut',
    collection: 'poroda',
    categories: ['men'],
    origin: 'старая древесина',
    density: 'high',
    concentration: PERFUME,
    longevityHours: 9,
    description:
      'Крышка старого орехового стола, отполированная руками: сухой кедр, табачный лист и тёмный лабданум.',
    story:
      'В мастерской стоит стол, за которым работал ещё прежний хозяин. Его крышка пахнет табаком и воском — этот запах мы и старались не испортить.',
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
    name: 'Свет янтаря',
    material: 'amber',
    collection: 'poroda',
    categories: ['women'],
    origin: 'окаменевшая смола',
    density: 'high',
    concentration: PERFUME,
    longevityHours: 9,
    description:
      'Смола, пролежавшая в земле миллионы лет: тёплая амбра, сладкий бензоин и щепотка розового перца, чтобы не было тяжело.',
    story:
      'Если потереть янтарь о шерсть, он нагревается и начинает пахнуть сосной. Мы хотели аромат, который так же теплеет на коже.',
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
    name: 'Меловые скалы',
    material: 'limestone',
    collection: 'poroda',
    categories: ['women'],
    origin: 'меловые скалы',
    density: 'light',
    concentration: PERFUME,
    longevityHours: 5,
    description:
      'Белые скалы над холодным морем: альдегиды, хрусткая груша и рисовая пудра. Самый прозрачный образец коллекции.',
    story:
      'Мел пачкает руки и почти ничем не пахнет. Задача была передать именно эту белизну — сухую, светлую, без единого цветка.',
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
    name: 'Пепел костра',
    material: 'basalt',
    collection: 'poroda',
    categories: ['men'],
    origin: 'остывшая лава',
    density: 'medium',
    concentration: PERFUME,
    longevityHours: 8,
    description:
      'Остывшее кострище на склоне вулкана ранним утром: берёзовый дёготь, мирра и тёплая зола.',
    story:
      'Утром после костра пахнет не дымом, а золой — мягче и тише. Дёготь мы оставили на самом верху, чтобы он ушёл первым.',
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
    name: 'Пар источника',
    material: 'travertine',
    collection: 'poroda',
    categories: ['women', 'men'],
    origin: 'термальные террасы',
    density: 'light',
    concentration: PERFUME,
    longevityHours: 5,
    description:
      'Пар над тёплой водой и мокрый камень террас: грейпфрут, шалфей и минеральная амбра.',
    story:
      'На террасах горячих источников холодный воздух и тёплая вода пахнут одновременно. Грейпфрут здесь — холод, шалфей и амбра — тепло.',
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
    name: 'Воск и стружка',
    material: 'walnut',
    collection: 'poroda',
    categories: ['women', 'men'],
    origin: 'столярная мастерская',
    density: 'medium',
    concentration: PERFUME,
    longevityHours: 8,
    description: 'Верстак после долгого дня: свежая стружка, пчелиный воск и бензоин.',
    story:
      'Самый домашний образец коллекции. Его придумал не парфюмер, а столяр, который заходил к нам чинить полки и всегда приносил с собой этот запах.',
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
    name: 'Сосновая смола',
    material: 'amber',
    collection: 'poroda',
    categories: ['men'],
    origin: 'сосновый бор',
    density: 'high',
    concentration: PERFUME,
    longevityHours: 9,
    description: 'Сосновая смола на разогретой коре: можжевельник, ладан и тёплая амбра.',
    story: 'Образец ещё в работе: смола пока перекрывает всё остальное.',
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
    name: 'Чёрное стекло',
    material: 'basalt',
    collection: 'poroda',
    categories: ['men'],
    origin: 'вулканическое стекло',
    density: 'high',
    concentration: PERFUME,
    longevityHours: 10,
    description: 'Обсидиан, вулканическое стекло: дымный уд, холодный кардамон и плотная амбра.',
    story:
      'Обсидиан режет как стекло и блестит как вода. Этот образец закончился быстрее всех — следующая партия ещё выдерживается.',
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
    name: 'Спил ореха',
    material: 'walnut',
    collection: 'poroda',
    categories: ['women'],
    origin: 'спил старого ореха',
    density: 'medium',
    concentration: PERFUME,
    longevityHours: 8,
    description: 'Свежий спил старого ореха: сливочный сандал, ваниль и мягкая кожа.',
    story:
      'Когда пилят орех, в воздухе стоит сладкий, почти молочный запах. Он держится минуту — во флаконе мы продлили её до вечера.',
    notes: { top: ['сандал'], heart: ['ваниль'], base: ['кожа', 'мускус'] },
    layers: usualLayers,
    // 100 мл закончился — частично доступный товар.
    variants: perfumeVolumes(710_000, [5, 4, 0]),
    publishedDaysAgo: 12,
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
    description:
      'Спрей для комнаты: мокрый камень, озон и листья после грозы. Два нажатия — и в комнате будто открыли окно во двор.',
    story:
      'Этот запах мы собирали дольше всех: одиннадцать версий и почти год. Как это было — в статье журнала о бетонном дворе.',
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
    name: 'Тепло очага',
    material: 'walnut',
    collection: null,
    categories: ['home'],
    origin: 'каменная печь',
    density: 'high',
    concentration: 'диффузор',
    longevityHours: null,
    description:
      'Диффузор для дома: тлеющий орех, смола и совсем немного дыма. Для вечеров, когда никуда не нужно.',
    story:
      'Очаг — первое, что складывали в доме из камня. Одного флакона хватает примерно на три месяца, палочки можно переворачивать, когда запах станет тише.',
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
    name: 'Керн',
    material: 'basalt',
    collection: 'poroda',
    categories: ['gift-sets'],
    origin: 'вся коллекция',
    density: 'medium',
    concentration: 'набор: 5 × 10 мл',
    longevityHours: null,
    description:
      'Набор пяти образцов по 10 мл: Известняк после дождя, Тёплый травертин, Дым базальта, Старый орех и Свет янтаря. Срез всей коллекции.',
    story:
      'Керн — столбик породы, который геологи поднимают из скважины, чтобы увидеть все слои сразу. Набор устроен так же: пять пород коллекции в одной коробке.',
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
    description: 'Шесть пробников по 2 мл, чтобы выбрать свой образец дома, без спешки.',
    story:
      'Аромат нужно поносить хотя бы день: утром он один, вечером другой. Пробники — самый честный способ выбрать.',
    notes: { top: ['бергамот'], heart: ['ирис'], base: ['мускус'] },
    layers: usualLayers,
    variants: [{ volumeMl: 12, priceKopecks: 190_000, stock: 30 }],
    publishedDaysAgo: 15,
    popularity: 25,
    photo: 'products/sample-set.jpg',
    photoAlt: 'Пробирки с янтарной жидкостью',
  },
  {
    slug: 'slate',
    specimenNumber: 17,
    name: 'Сланец под дождём',
    material: 'basalt',
    collection: 'poroda',
    categories: ['men', 'women'],
    origin: 'горный карьер после дождя',
    density: 'medium',
    concentration: PERFUME,
    longevityHours: 8,
    description:
      'Мокрый сланец в старом карьере: зелёный мандарин, кардамон, фиалковый лист и холодная база из ветивера и кедра.',
    story:
      'Сланец после дождя становится почти чёрным и пахнет железом и травой. Мандарин здесь зелёный, ещё не спелый — как воздух в карьере.',
    notes: {
      top: ['зелёный мандарин', 'кардамон'],
      heart: ['минеральный аккорд', 'фиалковый лист'],
      base: ['ветивер', 'кедр'],
    },
    layers: usualLayers,
    variants: perfumeVolumes(640_000, [7, 8, 4]),
    publishedDaysAgo: 3,
    isNew: true,
    popularity: 28,
    photo: 'products/slate.jpg',
    photoAlt: 'Мокрые плиты сланца',
  },
  {
    slug: 'pumice',
    specimenNumber: 18,
    name: 'Лёгкость пемзы',
    material: 'travertine',
    collection: 'poroda',
    categories: ['women', 'men'],
    origin: 'берег вулканического озера',
    density: 'light',
    concentration: PERFUME,
    longevityHours: 5,
    description:
      'Пемза на берегу вулканического озера: морская соль, лимон, нероли и светлые древесины. Самый лёгкий образец.',
    story:
      'Пемза плавает — это первое, что удивляет. Хотелось аромата такого же лёгкого, чтобы он держался на коже и не тонул.',
    notes: {
      top: ['морская соль', 'лимон'],
      heart: ['нероли'],
      base: ['амбретта', 'светлые древесины'],
    },
    layers: { topMinutes: 25, heartMinutes: 120, baseMinutes: 300 },
    variants: perfumeVolumes(580_000, [9, 10, 6]),
    publishedDaysAgo: 2,
    isNew: true,
    popularity: 26,
    photo: 'products/pumice.jpg',
    photoAlt: 'Пористая пемза на прибрежном камне',
  },
  {
    slug: 'oak-bark',
    specimenNumber: 19,
    name: 'Дубовая кора',
    material: 'walnut',
    collection: 'poroda',
    categories: ['men'],
    origin: 'дубовая роща в октябре',
    density: 'high',
    concentration: PERFUME,
    longevityHours: 9,
    description:
      'Дубовая роща в октябре: лист чёрной смородины, дубовый мох, влажная кора и гваяк.',
    story:
      'Октябрьский лес пахнет не листьями, а корой — тёмной и мокрой. Дубовый мох мы взяли из старых шипровых рецептур и сделали суше.',
    notes: {
      top: ['лист чёрной смородины'],
      heart: ['дубовый мох'],
      base: ['кора дуба', 'гваяк'],
    },
    layers: { topMinutes: 15, heartMinutes: 200, baseMinutes: 540 },
    // 30 мл закончился — новинка, которую уже разобрали в маленьком объёме.
    variants: perfumeVolumes(700_000, [0, 6, 4]),
    publishedDaysAgo: 1,
    isNew: true,
    popularity: 24,
    photo: 'products/oak-bark.jpg',
    photoAlt: 'Глубокие борозды дубовой коры',
  },
];

// --- Контент: начальные слайды и статьи. Админка правит их в БД; повторный сид не
// перезаписывает отредактированное — слайды создаются только в пустой таблице, статьи — по новому slug.
// Чтобы получить новые тексты в уже засеянной базе — pnpm db:reset -- --yes. Голос — docs/CONTENT.md.

export const HERO_SLIDES = [
  {
    label: 'Глубина 0\u00A0м · поверхность',
    title: 'Ароматы, высеченные из\u00A0камня',
    text: 'Запахи материалов: известняк после дождя, старый орех, дымный базальт. Каждый образец\u00A0— небольшая архитектура из\u00A0нот.',
    ctaLabel: 'Смотреть образцы',
    ctaHref: '/catalog',
    imageAlt: 'Пипетка над флаконом с янтарной жидкостью, в глубине — полки с образцами',
    photo: 'hero/hero-1.jpg',
  },
  {
    label: 'Глубина −120\u00A0м · базальт',
    title: 'Камень, который помнит огонь',
    text: '«Дым базальта»\u00A0— сухой дым, перечная искра и\u00A0смолистая глубина. Самый тёмный образец коллекции.',
    ctaLabel: 'Открыть образец',
    ctaHref: '/catalog/basalt',
    imageAlt: 'Тёмные сколы базальта в полутьме',
    photo: 'hero/hero-2.jpg',
  },
  {
    label: 'Новинки · сезон',
    title: 'Три новые породы',
    text: '«Сланец под дождём», «Лёгкость пемзы» и\u00A0«Дубовая кора»\u00A0— карьер после дождя, берег вулканического озера и\u00A0роща в\u00A0октябре.',
    ctaLabel: 'Смотреть новинки',
    ctaHref: '/catalog?sort=new',
    imageAlt: 'Ряды флаконов из янтарного стекла',
    photo: 'hero/hero-3.jpg',
  },
];

// Тексты статей выводятся через typograph: неразрывные пробелы расставляются при показе.
export const ARTICLES = [
  {
    slug: 'concrete-courtyard',
    tag: 'Архитектура',
    title: 'Как пахнет бетонный двор после грозы',
    lead: 'Петрикор, мокрый бетон и остывающий асфальт: разбираем запах города после дождя на ноты.',
    body: [
      'Запах после грозы рождается не в воздухе, а в камне. Пористые материалы — бетон, известняк, кирпич — за сухие дни впитывают масла растений и пыль, а первые капли выталкивают их наружу. У этого запаха даже есть имя — петрикор.',
      'В лаборатории мы собираем его из трёх частей: минеральной свежести, едва заметной сладости мокрой листвы и тёплой пыльной базы. Убери одну — и двор превращается в аптеку или в сад.',
      'Так появился «Двор после грозы» — спрей для комнаты, который мы собирали дольше всех: одиннадцать версий и почти год. Два нажатия — и в комнате будто открыли окно во двор.',
    ],
    publishedDaysAgo: 20,
    photo: 'journal/concrete-courtyard.jpg',
    coverAlt: 'Мокрый двор после дождя, мох на камне',
  },
  {
    slug: 'amber-glass',
    tag: 'Мастерская',
    title: 'Янтарное стекло: почему ни один флакон не повторяется',
    lead: 'Флаконы выдувают вручную небольшими партиями — и у каждого свой оттенок и пузырьки воздуха.',
    body: [
      'Янтарное стекло защищает аромат от света, но для нас важнее другое: в нём видно руку мастера. Толщина стенки, оттенок, редкий пузырёк воздуха — всё это остаётся во флаконе.',
      'Флаконы выдувают партиями по сорок–пятьдесят штук. Мастер набирает каплю расплава на трубку, и дальше всё решают дыхание и время: лишняя секунда в огне — и стекло темнее.',
      'Мы не отбраковываем такие флаконы. Номер образца на этикетке и неровность стекла вместе делают каждый экземпляр единственным.',
    ],
    publishedDaysAgo: 35,
    photo: 'journal/amber-glass.jpg',
    coverAlt: 'Стекло в пламени горелки',
  },
  {
    slug: 'perfumer-interview',
    tag: 'Интервью',
    title: 'Парфюмер о том, как переводить камень в ноты',
    lead: 'Разговор о том, почему базальт пахнет дымом, а известняк — мелом и ирисом.',
    body: [
      '— С чего начинается образец? — С куска породы на столе. Я держу его в руках неделю, пока не пойму, какой у него характер: холодный, тёплый, сухой, влажный.',
      '— А потом? — Потом ищу ноты, которые дают тот же характер. Базальту нужен дым и перец, известняку — мел и пудровый ирис. Камень не пахнет сам по себе — он подсказывает настроение.',
      '— Какой образец дался труднее всех? — «Дым базальта». Первые пробы пахли просто костром. Камень появился, только когда в сердце встал ирис: он холодный и сухой, как остывшая лава.',
    ],
    publishedDaysAgo: 50,
    photo: 'journal/perfumer-interview.jpg',
    coverAlt: 'Пипетка над флаконом с янтарной жидкостью',
  },
  {
    slug: 'reading-the-pyramid',
    tag: 'Гид',
    title: 'Как читать пирамиду нот',
    lead: 'Верх, сердце и база — не список ингредиентов, а время: что вы услышите через минуту, через час и вечером.',
    body: [
      'Аромат раскрывается слоями, как порода в керне. Сверху — лёгкие летучие ноты: цитрусы, специи, свежая зелень. Они звучат первые пятнадцать–двадцать минут и уходят.',
      'Под ними — сердце: цветы, смолы, минеральные аккорды. Это характер образца, его слышно несколько часов. Выбирать стоит по сердцу, а не по первому вдоху на блоттере.',
      'Глубже всего — база: древесины, мускус, амбра. Она держится до вечера, а иногда до утра. На странице каждого образца пирамида нарисована как срез породы: толщина слоя — время звучания.',
    ],
    publishedDaysAgo: 8,
    photo: 'journal/reading-the-pyramid.jpg',
    coverAlt: 'Слоистая скала в тёплом свете',
  },
  {
    slug: 'five-rocks',
    tag: 'Материалы',
    title: 'Пять пород коллекции: откуда материалы',
    lead: 'Известняк, травертин, базальт, орех и янтарь — где мы их нашли и зачем они в мастерской.',
    body: [
      'Каждый образец начинается с настоящего материала. Известняк мы подобрали на обочине после дождя, травертин — у старого фасада, который реставрировали напротив мастерской.',
      'Базальт привезли с вулканического плато, орех — это спил старого стола, янтарь — небольшой кусок с балтийского берега. Они лежат на полке у парфюмера и не продаются.',
      'Материал не пахнет так, как аромат. Но рядом с ним легче проверить главное: похоже ли то, что во флаконе, на то, что лежит в руке.',
    ],
    publishedDaysAgo: 4,
    photo: 'journal/five-rocks.jpg',
    coverAlt: 'Образцы минералов на светлом столе',
  },
];
