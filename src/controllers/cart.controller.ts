import { Request, Response } from "express";
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} from "../services/cart.service";

/**
 * Get user's cart
 * Requires authentication
 */
export async function getCartHandler(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const cart = await getCart(req.user.id);

    res.json({
      success: true,
      data: cart,
    });
  } catch (error: any) {
    console.error("Get cart error:", error);
    res.status(500).json({ msg: "Failed to get cart" });
  }
}

/**
 * Add item to cart
 * Requires authentication
 */
export async function addToCartHandler(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ msg: "Unauthorized" });
    }

    const { reportId, companyId, quantity, language } = req.body;

    if (!reportId || !companyId) {
      return res.status(400).json({
        msg: "reportId and companyId are required",
      });
    }

    const item = await addToCart({
      userId: req.user.id,
      reportId: parseInt(reportId),
      companyId: parseInt(companyId),
      quantity: quantity ? parseInt(quantity) : undefined,
      language,
    });

    res.json({
      success: true,
      data: item,
    });
  } catch (error: any) {
    console.error("Add to cart error:", error);
    res.status(500).json({
      msg: error.message || "Failed to add item to cart",
    });
  }
}

/**
 * Update cart item quantity
 * Requires authentication
 */
export async function updateCartItemHandler(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const itemId = parseInt(req.params.itemId);
    const { quantity } = req.body;

    if (isNaN(itemId)) {
      return res.status(400).json({ error: "Invalid item ID" });
    }

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ error: "Quantity must be greater than 0" });
    }

    const item = await updateCartItem(req.user.id, itemId, quantity);

    res.json({
      success: true,
      data: item,
    });
  } catch (error: any) {
    console.error("Update cart item error:", error);
    res.status(500).json({
      msg: error.message || "Failed to update cart item",
    });
  }
}

/**
 * Remove item from cart
 * Requires authentication
 */
export async function removeFromCartHandler(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const itemId = parseInt(req.params.itemId);

    if (isNaN(itemId)) {
      return res.status(400).json({ error: "Invalid item ID" });
    }

    await removeFromCart(req.user.id, itemId);

    res.json({
      success: true,
      message: "Item removed from cart",
    });
  } catch (error: any) {
    console.error("Remove from cart error:", error);
    res.status(500).json({
      msg: error.message || "Failed to remove item from cart",
    });
  }
}

/**
 * Clear cart
 * Requires authentication
 */
export async function clearCartHandler(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    await clearCart(req.user.id);

    res.json({
      success: true,
      message: "Cart cleared",
    });
  } catch (error: any) {
    console.error("Clear cart error:", error);
    res.status(500).json({ error: "Failed to clear cart" });
  }
}
