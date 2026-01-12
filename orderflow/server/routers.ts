import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  merchant: router({
    // Get current user's merchant profile
    getMyMerchant: protectedProcedure.query(async ({ ctx }) => {
      return await db.getMerchantByUserId(ctx.user.id);
    }),

    // Get merchant by slug (public)
    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        return await db.getMerchantBySlug(input.slug);
      }),

    // Create merchant profile
    create: protectedProcedure
      .input(z.object({
        shopName: z.string().min(1),
        slug: z.string().min(1),
        whatsappNumber: z.string().optional(),
        currency: z.enum(["SAR", "EGP", "DZD", "USD"]).default("SAR"),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check if merchant already exists
        const existing = await db.getMerchantByUserId(ctx.user.id);
        if (existing) {
          throw new Error("Merchant profile already exists");
        }

        // Check if slug is taken
        const slugTaken = await db.getMerchantBySlug(input.slug);
        if (slugTaken) {
          throw new Error("Slug already taken");
        }

        await db.createMerchant({
          userId: ctx.user.id,
          shopName: input.shopName,
          slug: input.slug,
          whatsappNumber: input.whatsappNumber,
          currency: input.currency,
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
        });

        return { success: true };
      }),

    // Update merchant profile
    update: protectedProcedure
      .input(z.object({
        shopName: z.string().min(1).optional(),
        whatsappNumber: z.string().optional(),
        currency: z.enum(["SAR", "EGP", "DZD", "USD"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const merchant = await db.getMerchantByUserId(ctx.user.id);
        if (!merchant) {
          throw new Error("Merchant not found");
        }

        await db.updateMerchant(merchant.id, input);
        return { success: true };
      }),
  }),

  product: router({
    // Get all products for current merchant
    getMyProducts: protectedProcedure.query(async ({ ctx }) => {
      const merchant = await db.getMerchantByUserId(ctx.user.id);
      if (!merchant) return [];
      
      return await db.getProductsByMerchantId(merchant.id);
    }),

    // Get products by merchant slug (public)
    getByMerchantSlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        const merchant = await db.getMerchantBySlug(input.slug);
        if (!merchant) return [];
        
        return await db.getProductsByMerchantId(merchant.id);
      }),

    // Upload product image
    uploadImage: protectedProcedure
      .input(z.object({
        imageData: z.string(), // base64 encoded image
        mimeType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const merchant = await db.getMerchantByUserId(ctx.user.id);
        if (!merchant) {
          throw new Error("Merchant not found");
        }

        // Convert base64 to buffer
        const base64Data = input.imageData.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");

        // Generate unique file key
        const fileKey = `merchants/${merchant.id}/products/${nanoid()}.${input.mimeType.split('/')[1]}`;

        // Upload to S3
        const { url } = await storagePut(fileKey, buffer, input.mimeType);

        return { url, key: fileKey };
      }),

    // Create product
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        price: z.string(), // decimal as string
        imageUrl: z.string().optional(),
        imageKey: z.string().optional(),
        stock: z.number().default(0),
      }))
      .mutation(async ({ ctx, input }) => {
        const merchant = await db.getMerchantByUserId(ctx.user.id);
        if (!merchant) {
          throw new Error("Merchant not found");
        }

        await db.createProduct({
          merchantId: merchant.id,
          name: input.name,
          description: input.description,
          price: input.price,
          imageUrl: input.imageUrl,
          imageKey: input.imageKey,
          stock: input.stock,
        });

        return { success: true };
      }),

    // Update product
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        price: z.string().optional(),
        imageUrl: z.string().optional(),
        imageKey: z.string().optional(),
        stock: z.number().optional(),
        isAvailable: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const merchant = await db.getMerchantByUserId(ctx.user.id);
        if (!merchant) {
          throw new Error("Merchant not found");
        }

        const product = await db.getProductById(input.id);
        if (!product || product.merchantId !== merchant.id) {
          throw new Error("Product not found");
        }

        const { id, ...updateData } = input;
        await db.updateProduct(id, updateData);

        return { success: true };
      }),

    // Delete product
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const merchant = await db.getMerchantByUserId(ctx.user.id);
        if (!merchant) {
          throw new Error("Merchant not found");
        }

        const product = await db.getProductById(input.id);
        if (!product || product.merchantId !== merchant.id) {
          throw new Error("Product not found");
        }

        await db.deleteProduct(input.id);
        return { success: true };
      }),
  }),

  sales: router({
    // Get reported sales for current merchant
    getMySales: protectedProcedure.query(async ({ ctx }) => {
      const merchant = await db.getMerchantByUserId(ctx.user.id);
      if (!merchant) return [];
      
      return await db.getReportedSalesByMerchantId(merchant.id);
    }),

    // Report sales
    report: protectedProcedure
      .input(z.object({
        salesAmount: z.string(), // decimal as string
        reportMonth: z.string(), // YYYY-MM format
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const merchant = await db.getMerchantByUserId(ctx.user.id);
        if (!merchant) {
          throw new Error("Merchant not found");
        }

        // Calculate 1% commission
        const salesAmount = parseFloat(input.salesAmount);
        const commissionAmount = (salesAmount * 0.01).toFixed(2);

        await db.createReportedSale({
          merchantId: merchant.id,
          salesAmount: input.salesAmount,
          commissionAmount: commissionAmount,
          reportMonth: input.reportMonth,
          notes: input.notes,
        });

        return { success: true, commission: commissionAmount };
      }),
  }),
});

export type AppRouter = typeof appRouter;
