import { Router } from "express";
import {
  getCartHandler,
  addToCartHandler,
  updateCartItemHandler,
  removeFromCartHandler,
  clearCartHandler,
} from "../controllers/cart.controller";
import { authenticate } from "../middleware/auth";

const router = Router();

// All cart routes require authentication
router.use(authenticate);

// GET /api/cart - Get user's cart
router.get("/", getCartHandler);

// POST /api/cart - Add item to cart
router.post("/", addToCartHandler);

// PUT /api/cart/items/:itemId - Update cart item quantity
router.put("/items/:itemId", updateCartItemHandler);

// DELETE /api/cart/items/:itemId - Remove item from cart
router.delete("/items/:itemId", removeFromCartHandler);

// DELETE /api/cart - Clear cart
router.delete("/", clearCartHandler);

export default router;
