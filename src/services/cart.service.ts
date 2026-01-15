import { prisma } from "../config/db.js";

export interface AddToCartInput {
  userId: number;
  reportId: number;
  companyId: number;
  quantity?: number;
  language?: string;
}

export interface CartItemResponse {
  id: number;
  reportId: number;
  report: {
    id: number;
    name: string;
    description: string;
    turnaround: string;
  };
  companyId: number;
  company: {
    id: number;
    nameEn: string;
    nameAr: string | null;
  };
  quantity: number;
  price: number;
  language: string | null;
  createdAt: Date;
}

export interface CartResponse {
  id: number;
  items: CartItemResponse[];
  subtotal: number;
  tax: number;
  total: number;
  itemCount: number;
}

/**
 * Get or create cart for user
 */
async function getOrCreateCart(userId: number) {
  let cart = await prisma.cart.findUnique({
    where: { userId },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId },
    });
  }

  return cart;
}

/**
 * Get user's cart with all items
 */
export async function getCart(userId: number): Promise<CartResponse> {
  const cart = await getOrCreateCart(userId);

  const items = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    include: {
      report: {
        select: {
          id: true,
          name: true,
          description: true,
          turnaround: true,
        },
      },
      company: {
        select: {
          id: true,
          nameEn: true,
          nameAr: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const TAX_RATE = 0.05;
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  return {
    id: cart.id,
    items: items.map((item) => ({
      id: item.id,
      reportId: item.reportId,
      report: item.report,
      companyId: item.companyId,
      company: item.company,
      quantity: item.quantity,
      price: item.price,
      language: item.language,
      createdAt: item.createdAt,
    })),
    subtotal,
    tax,
    total,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}

/**
 * Add item to cart
 */
export async function addToCart(
  input: AddToCartInput
): Promise<CartItemResponse> {
  const cart = await getOrCreateCart(input.userId);

  // Get report to get current price
  const report = await prisma.report.findUnique({
    where: { id: input.reportId },
  });

  if (!report) {
    throw new Error("Report not found");
  }

  // Check if item already exists in cart
  const existingItem = await prisma.cartItem.findUnique({
    where: {
      cartId_reportId_companyId: {
        cartId: cart.id,
        reportId: input.reportId,
        companyId: input.companyId,
      },
    },
  });

  if (existingItem) {
    // Update quantity
    const updatedItem = await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: {
        quantity: existingItem.quantity + (input.quantity || 1),
        price: report.price, // Update to current price
        language: input.language || existingItem.language,
      },
      include: {
        report: {
          select: {
            id: true,
            name: true,
            description: true,
            turnaround: true,
          },
        },
        company: {
          select: {
            id: true,
            nameEn: true,
            nameAr: true,
          },
        },
      },
    });

    return {
      id: updatedItem.id,
      reportId: updatedItem.reportId,
      report: updatedItem.report,
      companyId: updatedItem.companyId,
      company: updatedItem.company,
      quantity: updatedItem.quantity,
      price: updatedItem.price,
      language: updatedItem.language,
      createdAt: updatedItem.createdAt,
    };
  }

  // Create new cart item
  const cartItem = await prisma.cartItem.create({
    data: {
      cartId: cart.id,
      reportId: input.reportId,
      companyId: input.companyId,
      quantity: input.quantity || 1,
      price: report.price,
      language: input.language,
    },
    include: {
      report: {
        select: {
          id: true,
          name: true,
          description: true,
          turnaround: true,
        },
      },
      company: {
        select: {
          id: true,
          nameEn: true,
          nameAr: true,
        },
      },
    },
  });

  return {
    id: cartItem.id,
    reportId: cartItem.reportId,
    report: cartItem.report,
    companyId: cartItem.companyId,
    company: cartItem.company,
    quantity: cartItem.quantity,
    price: cartItem.price,
    language: cartItem.language,
    createdAt: cartItem.createdAt,
  };
}

/**
 * Update cart item quantity
 */
export async function updateCartItem(
  userId: number,
  itemId: number,
  quantity: number
): Promise<CartItemResponse> {
  if (quantity <= 0) {
    throw new Error("Quantity must be greater than 0");
  }

  const cart = await getOrCreateCart(userId);

  const cartItem = await prisma.cartItem.findFirst({
    where: {
      id: itemId,
      cartId: cart.id,
    },
  });

  if (!cartItem) {
    throw new Error("Cart item not found");
  }

  // Get current report price
  const report = await prisma.report.findUnique({
    where: { id: cartItem.reportId },
  });

  if (!report) {
    throw new Error("Report not found");
  }

  const updatedItem = await prisma.cartItem.update({
    where: { id: itemId },
    data: {
      quantity,
      price: report.price, // Update to current price
    },
    include: {
      report: {
        select: {
          id: true,
          name: true,
          description: true,
          turnaround: true,
        },
      },
      company: {
        select: {
          id: true,
          nameEn: true,
          nameAr: true,
        },
      },
    },
  });

  return {
    id: updatedItem.id,
    reportId: updatedItem.reportId,
    report: updatedItem.report,
    companyId: updatedItem.companyId,
    company: updatedItem.company,
    quantity: updatedItem.quantity,
    price: updatedItem.price,
    language: updatedItem.language,
    createdAt: updatedItem.createdAt,
  };
}

/**
 * Remove item from cart
 */
export async function removeFromCart(
  userId: number,
  itemId: number
): Promise<void> {
  const cart = await getOrCreateCart(userId);

  const cartItem = await prisma.cartItem.findFirst({
    where: {
      id: itemId,
      cartId: cart.id,
    },
  });

  if (!cartItem) {
    throw new Error("Cart item not found");
  }

  await prisma.cartItem.delete({
    where: { id: itemId },
  });
}

/**
 * Clear cart
 */
export async function clearCart(userId: number): Promise<void> {
  const cart = await getOrCreateCart(userId);

  await prisma.cartItem.deleteMany({
    where: { cartId: cart.id },
  });
}
