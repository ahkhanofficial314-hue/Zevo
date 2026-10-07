"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "./supabaseClient";
import { useAuth } from "./AuthContext";

type CartItem = {
  id: string;
  productId: string;
  title: string;
  price: number;
  color: string;
  quantity: number;
};

type CartContextType = {
  cart: CartItem[];
  wishlist: string[];
  addToCart: (productId: string) => void;
  removeFromCart: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  toggleWishlist: (productId: string) => void;
  isWishlisted: (productId: string) => boolean;
  cartCount: number;
  cartTotal: number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      setCart([]);
      setWishlist([]);
      return;
    }

    const loadCart = async () => {
      const { data, error } = await supabase
        .from("cart")
        .select("*")
        .eq("user_id", user.id);

      if (error) {
        console.error("Cart load error:", error);
        return;
      }

      const productIds = (data || []).map((row) => row.product_id);
      let productsMap: Record<string, any> = {};

      if (productIds.length > 0) {
        const { data: productsData } = await supabase
          .from("products")
.select("id, title, price, discount_price, image_url")
           .in("id", productIds);

        (productsData || []).forEach((p) => {
          productsMap[p.id] = p;
        });
      }

      const mapped: CartItem[] = (data || []).map((row) => {
        const product = productsMap[row.product_id];
        return {
          id: row.id,
          productId: row.product_id,
         title: product?.title || "Unknown Product",
          price: product?.discount_price || product?.price || 0,
          color: "from-indigo-500 to-purple-600",
          quantity: row.quantity,
        };
      });

      setCart(mapped);
    };

    const loadWishlist = async () => {
      const { data, error } = await supabase
        .from("wishlist")
        .select("product_id")
        .eq("user_id", user.id);

      if (error) {
        console.error("Wishlist load error:", error);
        return;
      }

      setWishlist((data || []).map((row) => row.product_id));
    };

    loadCart();
    loadWishlist();
  }, [user]);

  const addToCart = async (productId: string) => {
    if (!user) {
      alert("Please sign in to add items to your cart");
      return;
    }

    const existing = cart.find((item) => item.productId === productId);

    if (existing) {
      await updateQuantity(existing.id, existing.quantity + 1);
      return;
    }

    const { data, error } = await supabase
      .from("cart")
      .insert({ user_id: user.id, product_id: productId, quantity: 1 })
      .select()
      .single();

    if (error) {
      console.error("Add to cart error:", error);
      return;
    }

    const { data: product } = await supabase
      .from("products")
.select("id, title, price, discount_price, image_url")
      .eq("id", productId)
      .single();

    setCart((prev) => [
      ...prev,
      {
        id: data.id,
        productId,
        title: product?.title || "Unknown Product",
          price: product?.discount_price || product?.price || 0,
        color: "from-indigo-500 to-purple-600",
        quantity: 1,
      },
    ]);
  };

  const removeFromCart = async (cartItemId: string) => {
    const { error } = await supabase.from("cart").delete().eq("id", cartItemId);
    if (error) {
      console.error("Remove error:", error);
      return;
    }
    setCart((prev) => prev.filter((item) => item.id !== cartItemId));
  };

  const updateQuantity = async (cartItemId: string, quantity: number) => {
    if (quantity < 1) return;

    const { error } = await supabase
      .from("cart")
      .update({ quantity })
      .eq("id", cartItemId);

    if (error) {
      console.error("Update quantity error:", error);
      return;
    }

    setCart((prev) =>
      prev.map((item) => (item.id === cartItemId ? { ...item, quantity } : item))
    );
  };

  const isWishlisted = (productId: string) => wishlist.includes(productId);

  const toggleWishlist = async (productId: string) => {
    if (!user) {
      alert("Please sign in to use your wishlist");
      return;
    }

    if (isWishlisted(productId)) {
      const { error } = await supabase
        .from("wishlist")
        .delete()
        .eq("user_id", user.id)
        .eq("product_id", productId);

      if (error) {
        console.error("Wishlist remove error:", error);
        return;
      }
      setWishlist((prev) => prev.filter((id) => id !== productId));
    } else {
      const { error } = await supabase
        .from("wishlist")
        .insert({ user_id: user.id, product_id: productId });

      if (error) {
        console.error("Wishlist add error:", error);
        return;
      }
      setWishlist((prev) => [...prev, productId]);
    }
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        wishlist,
        addToCart,
        removeFromCart,
        updateQuantity,
        toggleWishlist,
        isWishlisted,
        cartCount,
        cartTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}