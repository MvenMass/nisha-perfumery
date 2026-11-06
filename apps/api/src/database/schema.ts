import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

// Имена колонок — snake_case автоматически (casing в клиенте и drizzle.config).
// Деньги — integer в копейках (D-003). PK — uuidv7(): встроен в PostgreSQL 18 и упорядочен по времени.

const id = () =>
  uuid()
    .primaryKey()
    .default(sql`uuidv7()`);
const createdAt = () => timestamp({ withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

// --- Enum-ы ---

export const userRole = pgEnum('user_role', ['user', 'admin']);
export const density = pgEnum('density', ['light', 'medium', 'high']);
export const noteLevel = pgEnum('note_level', ['top', 'heart', 'base']);
// Переходы между статусами проверяет сервер (D-043).
export const orderStatus = pgEnum('order_status', [
  'pending',
  'paid',
  'shipped',
  'ready_for_pickup',
  'delivered',
  'cancelled',
]);
export const paymentStatus = pgEnum('payment_status', [
  'pending',
  'succeeded',
  'failed',
  'refunded',
]);
export const deliveryMethod = pgEnum('delivery_method', ['courier', 'pickup_point', 'boutique']);

// --- Пользователи ---

export const users = pgTable(
  'users',
  {
    id: id(),
    // Email хранится уже в нижнем регистре: уникальность без учёта регистра без citext.
    email: text().notNull(),
    name: text().notNull(),
    phone: text(),
    // NULL — гостевой аккаунт, созданный при оформлении заказа (D-022).
    passwordHash: text(),
    role: userRole().notNull().default('user'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('users_email_unique').on(t.email),
    check('users_email_lowercase', sql`${t.email} = lower(${t.email})`),
  ],
);

export const sessions = pgTable(
  'sessions',
  {
    // SHA-256 от токена из cookie: утечка таблицы не даёт рабочих cookie.
    id: text().primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
    lastSeenAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
  },
  (t) => [
    index('sessions_user_id_idx').on(t.userId),
    index('sessions_expires_at_idx').on(t.expiresAt),
  ],
);

// Одноразовые ссылки «установить пароль» для гостевых аккаунтов.
export const passwordTokens = pgTable(
  'password_tokens',
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    usedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('password_tokens_token_hash_unique').on(t.tokenHash),
    index('password_tokens_user_id_idx').on(t.userId),
  ],
);

export const addresses = pgTable(
  'addresses',
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    label: text().notNull(),
    city: text().notNull(),
    // Улица и дом одной строкой — как в checkout.html.
    street: text().notNull(),
    apartment: text(),
    comment: text(),
    isDefault: boolean().notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    index('addresses_user_id_idx').on(t.userId),
    uniqueIndex('addresses_one_default_per_user')
      .on(t.userId)
      .where(sql`${t.isDefault}`),
  ],
);

// --- Каталог ---

export const collections = pgTable('collections', {
  id: id(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  description: text(),
  position: integer().notNull().default(0),
});

export const materials = pgTable(
  'materials',
  {
    id: id(),
    slug: text().notNull().unique(),
    name: text().notNull(),
    // Цвет свотча в фильтрах — данные материала, а не токен дизайна (CONVENTIONS.md).
    swatchColor: text().notNull(),
    position: integer().notNull().default(0),
  },
  (t) => [check('materials_swatch_color_hex', sql`${t.swatchColor} ~ '^#[0-9A-F]{6}$'`)],
);

export const categories = pgTable('categories', {
  id: id(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  position: integer().notNull().default(0),
});

export const products = pgTable(
  'products',
  {
    id: id(),
    slug: text().notNull().unique(),
    // На экране — «№ 03».
    specimenNumber: integer().notNull().unique(),
    name: text().notNull(),
    collectionId: uuid().references(() => collections.id, { onDelete: 'set null' }),
    // Нельзя удалить материал, пока из него есть ароматы.
    materialId: uuid()
      .notNull()
      .references(() => materials.id, { onDelete: 'restrict' }),
    origin: text().notNull(),
    density: density().notNull(),
    concentration: text().notNull(),
    longevityHours: integer(),
    description: text().notNull(),
    story: text(),
    // Длительность слоёв пирамиды: толщина слоя и шкала времени на странице товара.
    topMinutes: integer().notNull(),
    heartMinutes: integer().notNull(),
    baseMinutes: integer().notNull(),
    isPublished: boolean().notNull().default(false),
    publishedAt: timestamp({ withTimezone: true }),
    // Бейджи ставятся вручную в админке (D-025).
    isBestseller: boolean().notNull().default(false),
    isNew: boolean().notNull().default(false),
    // Аромат для «Среза» на главной — не больше одного.
    isFeatured: boolean().notNull().default(false),
    // Сортировка «популярные»; растёт при оплате заказов.
    popularity: integer().notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check('products_specimen_number_positive', sql`${t.specimenNumber} > 0`),
    check(
      'products_longevity_positive',
      sql`${t.longevityHours} IS NULL OR ${t.longevityHours} > 0`,
    ),
    check(
      'products_layer_minutes_positive',
      sql`${t.topMinutes} > 0 AND ${t.heartMinutes} > 0 AND ${t.baseMinutes} > 0`,
    ),
    check('products_popularity_non_negative', sql`${t.popularity} >= 0`),
    check('products_published_has_date', sql`NOT ${t.isPublished} OR ${t.publishedAt} IS NOT NULL`),
    uniqueIndex('products_one_featured')
      .on(t.isFeatured)
      .where(sql`${t.isFeatured}`),
    index('products_material_idx')
      .on(t.materialId)
      .where(sql`${t.isPublished}`),
    index('products_collection_idx')
      .on(t.collectionId)
      .where(sql`${t.isPublished}`),
    index('products_published_at_idx')
      .on(t.publishedAt.desc())
      .where(sql`${t.isPublished}`),
    index('products_popularity_idx')
      .on(t.popularity.desc())
      .where(sql`${t.isPublished}`),
  ],
);

export const productVariants = pgTable(
  'product_variants',
  {
    id: id(),
    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    volumeMl: integer().notNull(),
    sku: text().notNull().unique(),
    priceKopecks: integer().notNull(),
    stock: integer().notNull().default(0),
    isActive: boolean().notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique('product_variants_product_volume_unique').on(t.productId, t.volumeMl),
    check('product_variants_volume_positive', sql`${t.volumeMl} > 0`),
    check('product_variants_price_positive', sql`${t.priceKopecks} > 0`),
    check('product_variants_stock_non_negative', sql`${t.stock} >= 0`),
    // Фильтры объёма и цены применяются к одному варианту (D-025).
    index('product_variants_filter_idx')
      .on(t.volumeMl, t.priceKopecks, t.productId)
      .where(sql`${t.isActive}`),
    index('product_variants_product_idx').on(t.productId),
  ],
);

export const productImages = pgTable(
  'product_images',
  {
    id: id(),
    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    url: text().notNull(),
    alt: text().notNull(),
    position: integer().notNull(),
  },
  (t) => [
    unique('product_images_product_position_unique').on(t.productId, t.position),
    check('product_images_position_non_negative', sql`${t.position} >= 0`),
  ],
);

export const fragranceNotes = pgTable(
  'fragrance_notes',
  {
    id: id(),
    name: text().notNull().unique(),
  },
  (t) => [check('fragrance_notes_name_lowercase', sql`${t.name} = lower(${t.name})`)],
);

export const productNotes = pgTable(
  'product_notes',
  {
    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    // Ноту из справочника не удалить, пока она есть в чьей-то пирамиде.
    noteId: uuid()
      .notNull()
      .references(() => fragranceNotes.id, { onDelete: 'restrict' }),
    level: noteLevel().notNull(),
    position: integer().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.productId, t.level, t.position] }),
    unique('product_notes_product_note_unique').on(t.productId, t.noteId),
    check('product_notes_position_non_negative', sql`${t.position} >= 0`),
    index('product_notes_note_idx').on(t.noteId),
  ],
);

export const productCategories = pgTable(
  'product_categories',
  {
    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    categoryId: uuid()
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
  },
  (t) => [
    primaryKey({ columns: [t.productId, t.categoryId] }),
    index('product_categories_category_idx').on(t.categoryId),
  ],
);

// --- Покупатель ---

export const favorites = pgTable(
  'favorites',
  {
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.productId] })],
);

// Серверная корзина только у пользователя; гостевая живёт в localStorage (D-015).
export const carts = pgTable('carts', {
  id: id(),
  userId: uuid()
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  updatedAt: updatedAt(),
});

export const cartItems = pgTable(
  'cart_items',
  {
    cartId: uuid()
      .notNull()
      .references(() => carts.id, { onDelete: 'cascade' }),
    variantId: uuid()
      .notNull()
      .references(() => productVariants.id, { onDelete: 'cascade' }),
    quantity: integer().notNull(),
    addedAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.cartId, t.variantId] }),
    check('cart_items_quantity_positive', sql`${t.quantity} > 0`),
  ],
);

// «Сообщить о поступлении» — подписка на товар целиком (D-029).
export const stockNotifications = pgTable(
  'stock_notifications',
  {
    id: id(),
    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    email: text().notNull(),
    userId: uuid().references(() => users.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    notifiedAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    check('stock_notifications_email_lowercase', sql`${t.email} = lower(${t.email})`),
    // Один активный запрос на пару; после письма можно подписаться снова.
    uniqueIndex('stock_notifications_active_unique')
      .on(t.productId, t.email)
      .where(sql`${t.notifiedAt} IS NULL`),
  ],
);

// --- Заказы ---

/** Снимок адреса доставки в заказе: адрес мог измениться или быть удалён позже. */
export type DeliveryAddressSnapshot =
  | { kind: 'courier'; city: string; street: string; apartment: string | null }
  | { kind: 'pickup_point'; pointId: string; address: string };

export const orders = pgTable(
  'orders',
  {
    id: id(),
    // Номер для людей: «Заказ № 0042».
    number: integer().notNull().unique().generatedAlwaysAsIdentity(),
    // Заказ всегда принадлежит аккаунту — у гостя гостевому (D-022); историю заказов не теряем.
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    status: orderStatus().notNull().default('pending'),
    paymentStatus: paymentStatus().notNull().default('pending'),
    contactName: text().notNull(),
    contactPhone: text().notNull(),
    contactEmail: text().notNull(),
    deliveryMethod: deliveryMethod().notNull(),
    deliveryAddress: jsonb().$type<DeliveryAddressSnapshot>(),
    deliveryComment: text(),
    itemsTotalKopecks: integer().notNull(),
    deliveryPriceKopecks: integer().notNull(),
    totalKopecks: integer().notNull(),
    // Повторная отправка формы с тем же ключом не создаёт второй заказ.
    idempotencyKey: text().notNull(),
    // Неоплаченный заказ отменяется по истечении срока, остатки возвращаются (D-016).
    paymentExpiresAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique('orders_user_idempotency_unique').on(t.userId, t.idempotencyKey),
    check('orders_items_total_positive', sql`${t.itemsTotalKopecks} > 0`),
    check('orders_delivery_price_non_negative', sql`${t.deliveryPriceKopecks} >= 0`),
    check(
      'orders_total_matches',
      sql`${t.totalKopecks} = ${t.itemsTotalKopecks} + ${t.deliveryPriceKopecks}`,
    ),
    check(
      'orders_address_required',
      sql`${t.deliveryMethod} = 'boutique' OR ${t.deliveryAddress} IS NOT NULL`,
    ),
    index('orders_user_created_idx').on(t.userId, t.createdAt.desc()),
    index('orders_status_idx').on(t.status),
    index('orders_payment_expires_idx')
      .on(t.paymentExpiresAt)
      .where(sql`${t.status} = 'pending'`),
  ],
);

export const orderItems = pgTable(
  'order_items',
  {
    id: id(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    // Вариант можно удалить: снимок ниже остаётся, повтор заказа пометит позицию недоступной.
    variantId: uuid().references(() => productVariants.id, { onDelete: 'set null' }),
    productSlug: text().notNull(),
    productName: text().notNull(),
    specimenNumber: integer().notNull(),
    volumeMl: integer().notNull(),
    priceKopecks: integer().notNull(),
    quantity: integer().notNull(),
  },
  (t) => [
    check('order_items_price_positive', sql`${t.priceKopecks} > 0`),
    check('order_items_quantity_positive', sql`${t.quantity} > 0`),
    index('order_items_order_idx').on(t.orderId),
  ],
);

// Даты на шкале статуса в кабинете берутся отсюда.
export const orderStatusHistory = pgTable(
  'order_status_history',
  {
    id: id(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    status: orderStatus().notNull(),
    changedBy: uuid().references(() => users.id, { onDelete: 'set null' }),
    comment: text(),
    createdAt: createdAt(),
  },
  (t) => [index('order_status_history_order_idx').on(t.orderId, t.createdAt)],
);

export const payments = pgTable(
  'payments',
  {
    id: id(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    // «mock» сейчас, позже — «yookassa».
    provider: text().notNull(),
    externalId: text().unique(),
    amountKopecks: integer().notNull(),
    status: paymentStatus().notNull().default('pending'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check('payments_amount_positive', sql`${t.amountKopecks} > 0`),
    index('payments_order_idx').on(t.orderId),
  ],
);

// --- Настройки магазина: одна строка ---

export const storeSettings = pgTable(
  'store_settings',
  {
    id: integer().primaryKey().default(1),
    freeDeliveryThresholdKopecks: integer().notNull(),
    courierPriceKopecks: integer().notNull(),
    pickupPointPriceKopecks: integer().notNull(),
    courierDays: text().notNull(),
    pickupPointDays: text().notNull(),
    // Порог подсказки «Осталось N флаконов».
    lowStockThreshold: integer().notNull(),
    boutiqueAddress: text().notNull(),
    boutiqueHours: text().notNull(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check('store_settings_single_row', sql`${t.id} = 1`),
    check(
      'store_settings_prices_non_negative',
      sql`${t.freeDeliveryThresholdKopecks} >= 0 AND ${t.courierPriceKopecks} >= 0 AND ${t.pickupPointPriceKopecks} >= 0`,
    ),
    check('store_settings_low_stock_positive', sql`${t.lowStockThreshold} > 0`),
  ],
);
