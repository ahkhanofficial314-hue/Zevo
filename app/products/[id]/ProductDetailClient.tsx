"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useCart } from "@/lib/CartContext";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function ProductDetailClient({
  product,
  images,
  reviews,
}: {
  product: any;
  images: any[];
  reviews: any[];
}) {
  const { addToCart, toggleWishlist, isWishlisted } = useCart();
  const { user } = useAuth();
  const router = useRouter();

  const categoryName = product.categories?.name || "General";
  const shopName = product.profiles?.shop_name || "ZEVO";
  const sellerId = product.profiles?.id;
  const finalPrice = product.discount_price || product.price;
  const discountPercent =
    product.discount_price && product.price
      ? Math.round(
          ((product.price - product.discount_price) / product.price) * 100
        )
      : 0;

  const galleryImages =
    images && images.length > 0
      ? images
      : product.image_url
      ? [{ image_url: product.image_url, is_main: true }]
      : [];

  const mainIndex = galleryImages.findIndex((img) => img.is_main);
  const [activeIndex, setActiveIndex] = useState(mainIndex >= 0 ? mainIndex : 0);

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : null;

  const [canReview, setCanReview] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [localReviews, setLocalReviews] = useState(reviews);

  useEffect(() => {
    if (!user) return;

    const checkReviewEligibility = async () => {
      const alreadyDid = reviews.some((r) => r.buyer_id === user.id);
      setAlreadyReviewed(alreadyDid);

      if (alreadyDid) return;

      const { data } = await supabase.rpc("can_review_product", {
        p_product_id: product.id,
        p_buyer_id: user.id,
      });
      setCanReview(!!data);
    };

    checkReviewEligibility();
  }, [user, product.id]);

  const handleSubmitReview = async () => {
    if (!user) return;
    setSubmittingReview(true);

    const { data, error } = await supabase
      .from("reviews")
      .insert({
        product_id: product.id,
        buyer_id: user.id,
        rating: reviewRating,
        comment: reviewComment || null,
      })
      .select("*, profiles(full_name)")
      .single();

    setSubmittingReview(false);

    if (error) {
      alert("Could not submit your review");
      return;
    }

    setLocalReviews((prev) => [data, ...prev]);
    setAlreadyReviewed(true);
    setShowReviewForm(false);
  };

  return (
    <main className="min-h-screen bg-[#1C130D]">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center gap-2 text-sm text-[#8A7461] mb-6">
          <Link href="/" className="hover:text-[#C9A15A]">
            Home
          </Link>
          <span>/</span>
          <span className="text-[#B8A48F]">{categoryName}</span>
          <span>/</span>
          <span className="text-[#C9A15A] truncate max-w-[200px]">{product.title}</span>
        </div>

        <div className="grid md:grid-cols-2 gap-10">
          <div>
            <div className="h-80 rounded-2xl bg-gradient-to-br from-[#8B5E2E] to-[#D9A94D] flex items-center justify-center text-[#1C130D] text-lg font-medium overflow-hidden">
              {galleryImages.length > 0 ? (
                <img
                  src={galleryImages[activeIndex].image_url}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                categoryName
              )}
            </div>

            {galleryImages.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto">
                {galleryImages.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveIndex(index)}
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 flex-shrink-0 ${
                      index === activeIndex ? "border-[#C9A15A]" : "border-[#3D2C1E]"
                    }`}
                  >
                    <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Description moved here, below images */}
            <p className="text-[#B8A48F] mt-5">{product.description}</p>

            {/* Reviews section */}
            <div className="mt-8 border-t border-[#3D2C1E] pt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[#F3E7D8]">
                  Reviews ({localReviews.length})
                </h2>
                {canReview && !alreadyReviewed && (
                  <button
                    onClick={() => setShowReviewForm(true)}
                    className="text-sm text-[#C9A15A] font-medium"
                  >
                    Write a review
                  </button>
                )}
              </div>

              {showReviewForm && (
                <div className="bg-[#241A12] border border-[#3D2C1E] rounded-xl p-4 mb-5">
                  <p className="text-sm text-[#B8A48F] mb-2">Your rating</p>
                  <div className="flex gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setReviewRating(star)}
                        className="text-2xl"
                      >
                        {star <= reviewRating ? "⭐" : "☆"}
                      </button>
                    ))}
                  </div>
                  <textarea
                    placeholder="Share your experience with this product (optional)"
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    rows={3}
                    className="w-full bg-[#1C130D] border border-[#3D2C1E] rounded-lg px-4 py-2.5 text-sm text-[#F3E7D8] placeholder-[#6E5B49]"
                  />
                  <div className="flex gap-3 mt-3">
                    <button
                      onClick={() => setShowReviewForm(false)}
                      className="flex-1 border border-[#3D2C1E] text-[#B8A48F] py-2.5 rounded-full text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmitReview}
                      disabled={submittingReview}
                      className="flex-1 bg-gradient-to-r from-[#8B5E2E] to-[#D9A94D] text-[#1C130D] py-2.5 rounded-full text-sm font-medium disabled:opacity-50"
                    >
                      {submittingReview ? "Submitting..." : "Submit Review"}
                    </button>
                  </div>
                </div>
              )}

              {localReviews.length === 0 ? (
                <p className="text-sm text-[#6E5B49]">
                  No reviews yet. Be the first to share your experience.
                </p>
              ) : (
                <div className="space-y-4">
                  {localReviews.map((r) => (
                    <div key={r.id} className="border-b border-[#3D2C1E] pb-4">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-[#F3E7D8]">
                          {r.profiles?.full_name || "Anonymous"}
                        </p>
                        <p className="text-xs text-[#6E5B49]">
                          {new Date(r.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <p className="text-[#C9A15A] text-sm mb-1">
                        {"⭐".repeat(r.rating)}
                      </p>
                      {r.comment && (
                        <p className="text-sm text-[#B8A48F]">{r.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs text-[#8A7461] font-semibold uppercase mb-2">
              {categoryName}
            </p>

            <div className="flex items-start justify-between gap-3 mb-3">
              <h1 className="text-2xl font-bold text-[#F3E7D8]">{product.title}</h1>
              <button
                onClick={() => toggleWishlist(product.id)}
                className="text-2xl flex-shrink-0"
              >
                {isWishlisted(product.id) ? "❤️" : "🤍"}
              </button>
            </div>

            <div className="flex items-center gap-3 text-sm text-[#B8A48F] mb-4">
              {avgRating ? (
                <span className="text-[#C9A15A] font-semibold">⭐ {avgRating}</span>
              ) : (
                <span>⭐ 0</span>
              )}
              <span>·</span>
              <span>{product.downloads || 0} sold</span>
              <span>·</span>
              {sellerId ? (
                <Link href={`/sellers/${sellerId}`} className="text-[#C9A15A] hover:underline">
                  By {shopName}
                </Link>
              ) : (
                <span>By {shopName}</span>
              )}
            </div>

            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl font-bold text-[#C9A15A]">Rs {finalPrice}</span>
              {product.discount_price && (
                <>
                  <span className="text-[#6E5B49] line-through">Rs {product.price}</span>
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    -{discountPercent}%
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => addToCart(product.id)}
                className="flex-1 border border-[#C9A15A] text-[#C9A15A] py-4 rounded-xl font-semibold hover:bg-[#C9A15A]/10 transition-colors"
              >
                🛒 Add to Cart
              </button>
              <button
                onClick={() => {
                  addToCart(product.id);
                  router.push("/cart");
                }}
                className="flex-1 bg-gradient-to-r from-[#8B5E2E] to-[#D9A94D] text-[#1C130D] py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-shadow"
              >
                Buy Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}