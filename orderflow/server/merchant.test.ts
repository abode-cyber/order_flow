import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-merchant-user",
    email: "merchant@example.com",
    name: "Test Merchant",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return ctx;
}

describe("merchant procedures", () => {
  it("should create a new merchant profile", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.merchant.create({
      shopName: "Test Shop",
      slug: "test-shop",
      whatsappNumber: "+966501234567",
      currency: "SAR",
    });

    expect(result).toEqual({ success: true });
  });

  it("should get merchant by user id", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const merchant = await caller.merchant.getMyMerchant();
    expect(merchant).toBeDefined();
    if (merchant) {
      expect(merchant.userId).toBe(ctx.user!.id);
    }
  });

  it("should update merchant settings", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.merchant.update({
      shopName: "Updated Shop Name",
      currency: "USD",
    });

    expect(result).toEqual({ success: true });
  });
});

describe("product procedures", () => {
  it("should create a new product", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.product.create({
      name: "Test Product",
      description: "Test Description",
      price: "99.99",
      stock: 10,
    });

    expect(result).toEqual({ success: true });
  });

  it("should get merchant products", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const products = await caller.product.getMyProducts();
    expect(Array.isArray(products)).toBe(true);
  });

  it("should update product", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // First create a product
    await caller.product.create({
      name: "Product to Update",
      price: "50.00",
      stock: 5,
    });

    const products = await caller.product.getMyProducts();
    const productId = products[0]?.id;

    if (productId) {
      const result = await caller.product.update({
        id: productId,
        name: "Updated Product Name",
        price: "75.00",
      });

      expect(result).toEqual({ success: true });
    }
  });
});

describe("sales procedures", () => {
  it("should report sales and calculate commission", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.sales.report({
      salesAmount: "10000.00",
      reportMonth: "2025-01",
      notes: "Test sales report",
    });

    expect(result.success).toBe(true);
    expect(result.commission).toBe("100.00"); // 1% of 10000
  });

  it("should get merchant sales history", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const sales = await caller.sales.getMySales();
    expect(Array.isArray(sales)).toBe(true);
  });
});
