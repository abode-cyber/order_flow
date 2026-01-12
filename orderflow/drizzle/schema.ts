import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Merchants table - stores merchant/shop information
 */
export const merchants = mysqlTable("merchants", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // Reference to users table
  shopName: varchar("shopName", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(), // URL slug for public store
  whatsappNumber: varchar("whatsappNumber", { length: 20 }),
  currency: mysqlEnum("currency", ["SAR", "EGP", "DZD", "USD"]).default("SAR").notNull(),
  expiryDate: timestamp("expiryDate"), // Subscription expiry date
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Merchant = typeof merchants.$inferSelect;
export type InsertMerchant = typeof merchants.$inferInsert;

/**
 * Products table - stores merchant products
 */
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  merchantId: int("merchantId").notNull(), // Reference to merchants table
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  imageUrl: text("imageUrl"), // S3 URL for product image
  imageKey: text("imageKey"), // S3 key for product image
  stock: int("stock").default(0),
  isAvailable: boolean("isAvailable").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

/**
 * Reported Sales table - stores merchant-reported sales for commission calculation
 */
export const reportedSales = mysqlTable("reportedSales", {
  id: int("id").autoincrement().primaryKey(),
  merchantId: int("merchantId").notNull(), // Reference to merchants table
  salesAmount: decimal("salesAmount", { precision: 10, scale: 2 }).notNull(),
  commissionAmount: decimal("commissionAmount", { precision: 10, scale: 2 }).notNull(), // 1% of sales
  reportMonth: varchar("reportMonth", { length: 7 }).notNull(), // Format: YYYY-MM
  notes: text("notes"),
  isPaid: boolean("isPaid").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ReportedSale = typeof reportedSales.$inferSelect;
export type InsertReportedSale = typeof reportedSales.$inferInsert;
