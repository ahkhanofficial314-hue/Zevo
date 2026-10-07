"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useCart } from "@/lib/CartContext";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabaseClient";

export default function Home() {
  const { addToCart, wishlist, toggleWishlist, isWishlisted, cartCount } = useCart();
  const { user, signInWithGoogle, signOut } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    const loadProducts = async () => {
      const { data } = await supabase
        .from("products")
        .select("*, categories(name), profiles(shop_name)")
        .eq("status", "active");

      if (!data) {
        setDbProducts([]);
        return;
      }

      const { data: reviewsData } = await supabase
        .from("reviews")
        .select("product_id, rating");

      const ratingMap: Record<string, { sum: number; count: number }> = {};
      (reviewsData || []).forEach((r) => {
        if (!ratingMap[r.product_id]) ratingMap[r.product_id] = { sum: 0, count: 0 };
        ratingMap[r.product_id].sum += r.rating;
        ratingMap[r.product_id].count += 1;
      });

      const withScore = data.map((p) => {
        const ratingInfo = ratingMap[p.id];
        const avgRating = ratingInfo ? ratingInfo.sum / ratingInfo.count : 0;
        const sold = p.downloads || 0;
        const score = avgRating * 10 + sold;
        return { ...p, avgRating, score };
      });

      withScore.sort((a, b) => b.score - a.score);

      setDbProducts(withScore);
    };
    loadProducts();
    const loadCategories = async () => {
      const { data } = await supabase.from("categories").select("id, name");
      setCategories(data || []);
    };
    loadCategories();
  }, []);

  const colors = [
    "from-[#8B5E2E] to-[#D9A94D]",
    "from-[#6E4A2A] to-[#C9A15A]",
    "from-[#7A4E1E] to-[#E0B25E]",
    "from-[#5C3B22] to-[#B8863E]",
  ];

  return (
    <main className="min-h-screen bg-[#1C130D] pb-16 md:pb-0">
      {/* Top promo bar */}
      <div className="bg-[#140D08] border-b border-[#3D2C1E]">
        <div className="max-w-7xl mx-auto px-6 py-2 flex items-center justify-between text-xs text-[#B8A48F]">
          <span className="hidden sm:inline">✨ Premium digital products, verified sellers</span>
          <span>Fast delivery · Secure payments</span>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#241A12]/95 backdrop-blur-md border-b border-[#3D2C1E]">
        <div className="max-w-7xl mx-auto flex items-center gap-4 px-6 py-3">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <img src="/logo.png" alt="Zevo" className="w-9 h-9 object-contain" />
            <span className="text-lg font-bold text-[#F3E7D8] hidden sm:inline">
              Zevo
            </span>
          </Link>

          {/* Search bar */}
          <div className="flex-1 max-w-xl mx-auto">
            <div className="flex items-center bg-[#1C130D] border border-[#3D2C1E] rounded-full px-4 py-2">
              <span className="text-[#8A7461] mr-2">🔍</span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products..."
                className="bg-transparent text-sm text-[#F3E7D8] placeholder-[#8A7461] outline-none flex-1"
              />
            </div>
          </div>

          {/* Icons */}
          <div className="flex items-center gap-4 flex-shrink-0">
<Link
              href="/seller/onboarding"
              className="text-sm font-medium text-[#C9A15A] hover:text-[#E8C275] whitespace-nowrap hidden sm:inline"
            >
              Become a Seller
            </Link>

            {user?.email === "AHkhan.official314@gmail.com" && (
              <Link
                href="/admin"
                className="text-sm font-medium text-[#C9A15A] hover:text-[#E8C275] whitespace-nowrap hidden sm:inline"
              >
                Admin Panel
              </Link>
            )}

            <button
              onClick={() => toggleWishlist("global")}
              className="hidden"
            />
            <Link href="/wishlist" className="relative text-[#F3E7D8]">
              <span className="text-lg">{wishlist.length > 0 ? "❤️" : "🤍"}</span>
              {wishlist.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-[#C9A15A] text-[#1C130D] text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {wishlist.length}
                </span>
              )}
            </Link>

            <Link href="/cart" className="relative text-[#F3E7D8]">
              <span className="text-lg">🛒</span>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-[#C9A15A] text-[#1C130D] text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-2"
                >
                  <img
                    src={user.user_metadata?.avatar_url}
                    alt="Profile"
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-full object-cover border border-[#3D2C1E]"
                  />
                  <span className="text-sm font-medium text-[#F3E7D8] hidden md:inline">
                    {user.user_metadata?.full_name || user.email}
                  </span>
                </button>

                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-[#241A12] rounded-xl shadow-xl border border-[#3D2C1E] overflow-hidden z-50">
                    <a
                      href="/profile"
                      className="block px-4 py-3 text-sm text-[#F3E7D8] hover:bg-[#2E2015]"
                    >
                      My Profile
                    </a>
                    <a
                      href="/orders"
                      className="block px-4 py-3 text-sm text-[#F3E7D8] hover:bg-[#2E2015]"
                    >
                      My Orders
                    </a>
                    <button
                      onClick={signOut}
                      className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-[#2E2015]"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={signInWithGoogle}
                className="bg-gradient-to-r from-[#8B5E2E] to-[#D9A94D] text-[#1C130D] text-sm font-semibold px-4 py-2 rounded-full shadow-md hover:shadow-lg transition-shadow whitespace-nowrap"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Category tabs */}
      <section className="max-w-7xl mx-auto px-6 pt-6">
       <div className="flex gap-3 overflow-x-auto pb-4">
  <button
    onClick={() => setSelectedCategory(null)}
    className={`text-sm font-semibold px-5 py-2 rounded-full whitespace-nowrap ${
      selectedCategory === null
        ? "bg-gradient-to-r from-[#8B5E2E] to-[#D9A94D] text-[#1C130D]"
        : "bg-[#241A12] border border-[#3D2C1E] text-[#B8A48F]"
    }`}
  >
    All Products
  </button>
  {categories.map((cat) => (
    <button
      key={cat.id}
      onClick={() => setSelectedCategory(cat.id)}
      className={`text-sm font-semibold px-5 py-2 rounded-full whitespace-nowrap ${
        selectedCategory === cat.id
          ? "bg-gradient-to-r from-[#8B5E2E] to-[#D9A94D] text-[#1C130D]"
          : "bg-[#241A12] border border-[#3D2C1E] text-[#B8A48F]"
      }`}
    >
      {cat.name}
    </button>
  ))}
</div>

        {/* Products */}
        {dbProducts.length === 0 ? (
  <p className="text-[#8A7461] text-sm text-center py-16">
    No products available yet
  </p>
) : dbProducts.filter((p) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      p.title.toLowerCase().includes(term) ||
      (p.description && p.description.toLowerCase().includes(term));
    const matchesCategory =
      !selectedCategory || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  }).length === 0 ? (
  <p className="text-[#8A7461] text-sm text-center py-16">
    No products match "{searchTerm}"
  </p>
) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 pb-10">
            {dbProducts
              .filter((p) => {
  const term = searchTerm.toLowerCase();
  const matchesSearch =
      p.title.toLowerCase().includes(term) ||
      (p.description && p.description.toLowerCase().includes(term));
    const matchesCategory =
      !selectedCategory || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
})
              .map((product, index) => {
                const color = colors[index % colors.length];
                const discountPercent =
                  product.discount_price && product.price
                    ? Math.round(
                        ((product.price - product.discount_price) /
                          product.price) *
                          100
                      )
                    : 0;

                return (
                  <Link
                    key={product.id}
                    href={`/products/${product.id}`}
                    className="bg-[#241A12] border border-[#3D2C1E] rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:border-[#C9A15A]/40 transition-all group block"
                  >
                    <div
                      className={`relative h-40 bg-gradient-to-br ${color} flex items-center justify-center overflow-hidden`}
                    >
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          toggleWishlist(product.id);
                        }}
                        className="absolute top-3 right-3 text-lg z-10"
                      >
                        {isWishlisted(product.id) ? "❤️" : "🤍"}
                      </button>

                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-white/80 text-sm">
                          {product.categories?.name || "Product"}
                        </span>
                      )}
                      {product.is_premium && (
                        <span className="absolute top-3 left-3 bg-[#1C130D]/80 text-[#C9A15A] text-[11px] font-semibold px-2.5 py-1 rounded-full">
                          Premium
                        </span>
                      )}
                      {discountPercent > 0 && (
                        <span className="absolute bottom-3 left-3 bg-red-500 text-white text-[11px] font-bold px-2 py-1 rounded-full">
                          -{discountPercent}%
                        </span>
                      )}
                    </div>

                    <div className="p-4">
                      <p className="text-[11px] text-[#8A7461] font-medium uppercase mb-1">
                        {product.categories?.name || "General"}
                      </p>
                      {product.profiles?.shop_name && (
                        <p className="text-[10px] text-[#6E5B49] mb-1">
                          by {product.profiles.shop_name}
                        </p>
                      )}
                      <h3 className="font-semibold text-[#F3E7D8] text-sm mb-2 line-clamp-2">
                        {product.title}
                      </h3>

                      <div className="flex items-center gap-2 text-xs text-[#8A7461] mb-3">
                        <span>⭐ {product.avgRating ? product.avgRating.toFixed(1) : 0}</span>
                        <span>·</span>
                        <span>{product.downloads || 0} sold</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-lg font-bold text-[#C9A15A]">
                            Rs {product.discount_price || product.price}
                          </span>
                          {product.discount_price && (
                            <span className="text-xs text-[#6E5B49] line-through ml-2">
                              Rs {product.price}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            addToCart(product.id);
                          }}
                          className="bg-gradient-to-r from-[#8B5E2E] to-[#D9A94D] text-[#1C130D] p-2.5 rounded-lg hover:shadow-md transition-shadow"
                        >
                          🛒
                        </button>
                      </div>
                    </div>
                  </Link>
                );
              })}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="bg-[#140D08] border-t border-[#3D2C1E] mt-6 px-6 py-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h4 className="font-semibold text-[#F3E7D8] mb-3">Zevo</h4>
            <p className="text-sm text-[#8A7461]">
              A premium marketplace for digital products and web services.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-[#F3E7D8] mb-3">Quick Links</h4>
            <div className="flex flex-col gap-2 text-sm text-[#8A7461]">
              <Link href="/">Home</Link>
              <Link href="/cart">Cart</Link>
              <Link href="/orders">My Orders</Link>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-[#F3E7D8] mb-3">Support</h4>
            <a
              href="https://wa.me/"
              className="inline-block bg-gradient-to-r from-[#8B5E2E] to-[#D9A94D] text-[#1C130D] text-sm font-semibold px-5 py-2.5 rounded-full"
            >
              WhatsApp Support
            </a>
          </div>
        </div>
      </footer>

      {/* Mobile bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#241A12] border-t border-[#3D2C1E] flex md:hidden items-center justify-around py-3 z-40">
        <Link href="/" className="flex flex-col items-center text-xs text-[#B8A48F]">
          <span className="text-lg">🏠</span>
          Home
        </Link>
        <Link href="/" className="flex flex-col items-center text-xs text-[#B8A48F]">
          <span className="text-lg">🛍️</span>
          Products
        </Link>
        <Link href="/cart" className="flex flex-col items-center text-xs text-[#B8A48F]">
          <span className="text-lg">🛒</span>
          Cart
        </Link>
        <Link href="/wishlist" className="flex flex-col items-center text-xs text-[#B8A48F]">
          <span className="text-lg">{wishlist.length > 0 ? "❤️" : "🤍"}</span>
          Wishlist
        </Link>
        <Link
          href={user ? "/profile" : "#"}
          onClick={!user ? signInWithGoogle : undefined}
          className="flex flex-col items-center text-xs text-[#B8A48F]"
        >
          <span className="text-lg">👤</span>
          Account
        </Link>
      </div>
    </main>
  );
}