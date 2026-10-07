"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function SellerStore({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [seller, setSeller] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const { data: sellerData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();
      setSeller(sellerData);

      const { data: productsData } = await supabase
        .from("products")
        .select("*, categories(name)")
        .eq("seller_id", id)
        .order("created_at", { ascending: false });
      setProducts(productsData || []);

      setLoading(false);
    };

    loadData();
  }, [id]);

  const colors = [
    "from-indigo-500 to-purple-600",
    "from-blue-500 to-cyan-500",
    "from-pink-500 to-rose-500",
    "from-emerald-500 to-teal-500",
  ];

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </main>
    );
  }

  if (!seller) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Shop not found.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-16">
      {/* Cover Photo */}
      <div className="relative h-40 sm:h-56 bg-gradient-to-br from-indigo-500 to-purple-600 overflow-hidden">
        {seller.cover_image && (
          <img
            src={seller.cover_image}
            alt="Cover"
            className="w-full h-full object-cover"
          />
        )}
        <Link
          href="/"
          className="absolute top-3 left-3 bg-black/40 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm"
        >
          ← Back
        </Link>
      </div>

      {/* Logo + Shop Info */}
      <div className="px-6">
        <div className="relative -mt-12 flex items-end justify-between">
          <div className="flex items-end gap-4">
            <div className="w-24 h-24 rounded-2xl border-4 border-white bg-gray-100 shadow-lg overflow-hidden flex-shrink-0">
              {seller.shop_logo ? (
                <img
                  src={seller.shop_logo}
                  alt="Logo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl text-gray-300">
                  🏪
                </div>
              )}
            </div>

            <div className="pb-2">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-gray-900">
                  {seller.shop_name || "Shop"}
                </h1>
                <span className="bg-blue-50 text-blue-600 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                  ✓ Verified
                </span>
              </div>
              {seller.bio && (
                <p className="text-sm text-gray-500 mt-1">{seller.bio}</p>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-6 max-w-md">
          <div className="bg-white rounded-xl py-4 text-center shadow-sm border border-gray-100">
            <p className="text-lg font-bold text-gray-900">
              {products.length}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Products</p>
          </div>
          <div className="bg-white rounded-xl py-4 text-center shadow-sm border border-gray-100">
            <p className="text-lg font-bold text-gray-900">0</p>
            <p className="text-xs text-gray-400 mt-0.5">Followers</p>
          </div>
          <div className="bg-white rounded-xl py-4 text-center shadow-sm border border-gray-100">
            <p className="text-lg font-bold text-gray-900">0</p>
            <p className="text-xs text-gray-400 mt-0.5">Sold</p>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="px-6 mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          All Products ({products.length})
        </h2>

        {products.length === 0 ? (
          <p className="text-gray-400 text-sm">
           This shope has no products yet
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {products.map((product, index) => {
              const color = colors[index % colors.length];
              const finalPrice = product.discount_price || product.price;

              return (
                <Link
                  key={product.id}
                  href={`/products/${product.id}`}
                  className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow block"
                >
                  <div
                    className={`h-32 bg-gradient-to-br ${color} flex items-center justify-center overflow-hidden`}
                  >
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white/70 text-sm">
                        {product.categories?.name || "Product"}
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium text-gray-900 text-sm mb-1 line-clamp-2">
                      {product.title}
                    </h3>
                    <p className="text-indigo-600 font-semibold text-sm">
                      Rs {finalPrice}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}