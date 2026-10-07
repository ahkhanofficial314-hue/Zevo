"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { useCart } from "@/lib/CartContext";
import { supabase } from "@/lib/supabaseClient";

export default function WishlistPage() {
  const { user, loading: authLoading } = useAuth();
  const { wishlist, toggleWishlist, addToCart } = useCart();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadProducts = async () => {
      if (wishlist.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("products")
        .select("*, categories(name)")
        .in("id", wishlist);
      setProducts(data || []);
      setLoading(false);
    };

    loadProducts();
  }, [user, wishlist]);

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-[#1C130D] flex items-center justify-center">
        <p className="text-[#8A7461]">Loading...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[#1C130D] flex flex-col items-center justify-center px-4 text-center">
        <p className="text-[#B8A48F] mb-4">Please sign in to view your wishlist</p>
        <Link
          href="/"
          className="bg-gradient-to-r from-[#8B5E2E] to-[#D9A94D] text-[#1C130D] font-medium px-6 py-3 rounded-full"
        >
          Go Home
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#1C130D] pb-16">
      <div className="sticky top-0 z-20 bg-[#241A12]/95 backdrop-blur-md border-b border-[#3D2C1E] px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-[#F3E7D8] text-xl">
          ←
        </Link>
        <h1 className="text-lg font-semibold text-[#F3E7D8]">My Wishlist</h1>
        <div className="w-6" />
      </div>

      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-[#8A7461]">
          <div className="text-5xl mb-4">🤍</div>
          <p>Your wishlist is empty</p>
          <Link href="/" className="mt-4 text-[#C9A15A] font-medium underline">
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 px-4 py-4">
          {products.map((product) => {
            const finalPrice = product.discount_price || product.price;
            return (
              <div
                key={product.id}
                className="bg-[#241A12] border border-[#3D2C1E] rounded-2xl overflow-hidden shadow-sm relative"
              >
                <button
                  onClick={() => toggleWishlist(product.id)}
                  className="absolute top-2 right-2 text-lg z-10"
                >
                  ❤️
                </button>
                <Link href={`/products/${product.id}`}>
                  <div className="h-28 bg-gradient-to-br from-[#8B5E2E] to-[#D9A94D] overflow-hidden">
                    {product.image_url && (
                      <img
                        src={product.image_url}
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium text-[#F3E7D8] text-sm mb-1 line-clamp-2">
                      {product.title}
                    </h3>
                    <p className="text-[#C9A15A] font-semibold text-sm">
                      Rs {finalPrice}
                    </p>
                  </div>
                </Link>
                <button
                  onClick={() => addToCart(product.id)}
                  className="w-full bg-[#1C130D] text-[#B8A48F] text-xs font-medium py-2 border-t border-[#3D2C1E]"
                >
                  Add to Cart
                </button>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}