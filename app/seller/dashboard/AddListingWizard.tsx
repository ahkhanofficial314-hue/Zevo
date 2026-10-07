"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Category = { id: string; name: string };

export default function AddListingWizard({
  userId,
  categories,
  onClose,
  onDone,
}: {
  userId: string;
  categories: Category[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [step, setStep] = useState(1);

  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [images, setImages] = useState<{ url: string; isMain: boolean }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [price, setPrice] = useState("");
  const [discountPrice, setDiscountPrice] = useState("");
  const [weight, setWeight] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > 7) {
      setError("You can upload up to 7 images");
      return;
    }

    setUploading(true);
    setError("");

    const uploaded: { url: string; isMain: boolean }[] = [];

    for (const file of Array.from(files)) {
      const fileExt = file.name.split(".").pop();
      const fileName = `listing-${userId}-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("images")
        .upload(fileName, file);

      if (uploadError) {
        console.error(uploadError);
        continue;
      }

      const { data } = supabase.storage.from("images").getPublicUrl(fileName);
      uploaded.push({ url: data.publicUrl, isMain: false });
    }

    setImages((prev) => {
      const combined = [...prev, ...uploaded];
      if (combined.length > 0 && !combined.some((i) => i.isMain)) {
        combined[0].isMain = true;
      }
      return combined;
    });

    setUploading(false);
  };

  const setMainImage = (index: number) => {
    setImages((prev) => prev.map((img, i) => ({ ...img, isMain: i === index })));
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (updated.length > 0 && !updated.some((i) => i.isMain)) {
        updated[0].isMain = true;
      }
      return updated;
    });
  };

  const canNext1 = title.trim().length > 0;
  const canNext2 = categoryId.length > 0;
  const canNext3 = images.length > 0;
  const canSubmit = price.trim().length > 0;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");

    const mainImage = images.find((i) => i.isMain) || images[0];

    const { data: product, error: productError } = await supabase
      .from("products")
      .insert({
        title,
        description,
        category_id: categoryId,
        price: parseFloat(price),
        discount_price: discountPrice ? parseFloat(discountPrice) : null,
        weight: weight || null,
        image_url: mainImage?.url || null,
        seller_id: userId,
        status: "pending",
      })
      .select()
      .single();

    if (productError || !product) {
      console.error(productError);
      setError("Could not create the listing. Please try again.");
      setSubmitting(false);
      return;
    }

    const imageRows = images.map((img, index) => ({
      product_id: product.id,
      image_url: img.url,
      is_main: img.isMain,
      position: index,
    }));

    const { error: imagesError } = await supabase
      .from("product_images")
      .insert(imageRows);

    if (imagesError) {
      console.error(imagesError);
    }

    setSubmitting(false);
    onDone();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-[#241A12] border border-[#3D2C1E] w-full sm:w-[480px] sm:rounded-2xl rounded-t-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-[#F3E7D8]">Add Listing</h2>
          <button onClick={onClose} className="text-[#8A7461] text-xl">
            ✕
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full ${
                s <= step ? "bg-gradient-to-r from-[#8B5E2E] to-[#D9A94D]" : "bg-[#3D2C1E]"
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="bg-red-900/30 text-red-300 text-sm rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        {/* Step 1: Title */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-[#B8A48F]">What are you selling?</p>
            <input
              type="text"
              placeholder="Product name"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#1C130D] border border-[#3D2C1E] rounded-lg px-4 py-3 text-sm text-[#F3E7D8] placeholder-[#6E5B49]"
            />
          </div>
        )}

        {/* Step 2: Category */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-[#B8A48F]">Choose a category</p>
            <input
              type="text"
              placeholder="Search categories..."
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              className="w-full bg-[#1C130D] border border-[#3D2C1E] rounded-lg px-4 py-2.5 text-sm text-[#F3E7D8] placeholder-[#6E5B49]"
            />
            <div className="max-h-56 overflow-y-auto space-y-2">
              {filteredCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryId(cat.id)}
                  className={`w-full text-left px-4 py-2.5 rounded-lg text-sm ${
                    categoryId === cat.id
                      ? "bg-gradient-to-r from-[#8B5E2E] to-[#D9A94D] text-[#1C130D] font-semibold"
                      : "bg-[#1C130D] border border-[#3D2C1E] text-[#B8A48F]"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Images */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-[#B8A48F]">
              Add up to 7 photos. Tap a photo to make it the main image.
            </p>

            <label className="block">
              <div className="w-full border-2 border-dashed border-[#3D2C1E] rounded-lg py-6 text-center cursor-pointer hover:border-[#C9A15A]/50 transition-colors">
                <span className="text-sm text-[#8A7461]">
                  {uploading ? "Uploading..." : "📷 Choose photos"}
                </span>
              </div>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>

            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {images.map((img, index) => (
                  <div key={index} className="relative">
                    <button
                      onClick={() => setMainImage(index)}
                      className={`w-full aspect-square rounded-lg overflow-hidden border-2 ${
                        img.isMain ? "border-[#C9A15A]" : "border-[#3D2C1E]"
                      }`}
                    >
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                    </button>
                    {img.isMain && (
                      <span className="absolute top-1 left-1 bg-[#C9A15A] text-[#1C130D] text-[9px] font-bold px-1.5 py-0.5 rounded">
                        Main
                      </span>
                    )}
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute -top-1.5 -right-1.5 bg-red-500 text-white w-5 h-5 rounded-full text-xs flex items-center justify-center"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Price & details */}
        {step === 4 && (
          <div className="space-y-3">
            <p className="text-sm text-[#B8A48F] mb-1">Price and details</p>
            <input
              type="number"
              placeholder="Price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full bg-[#1C130D] border border-[#3D2C1E] rounded-lg px-4 py-2.5 text-sm text-[#F3E7D8] placeholder-[#6E5B49]"
            />
            <input
              type="number"
              placeholder="Sale price if on discount (optional)"
              value={discountPrice}
              onChange={(e) => setDiscountPrice(e.target.value)}
              className="w-full bg-[#1C130D] border border-[#3D2C1E] rounded-lg px-4 py-2.5 text-sm text-[#F3E7D8] placeholder-[#6E5B49]"
            />
            <input
              type="text"
              placeholder="Weight, e.g. 500g (optional)"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full bg-[#1C130D] border border-[#3D2C1E] rounded-lg px-4 py-2.5 text-sm text-[#F3E7D8] placeholder-[#6E5B49]"
            />
            <textarea
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-[#1C130D] border border-[#3D2C1E] rounded-lg px-4 py-2.5 text-sm text-[#F3E7D8] placeholder-[#6E5B49]"
            />
          </div>
        )}

        {/* Step 5: Label (skip) + submit */}
        {step === 5 && (
          <div className="space-y-4">
            <p className="text-sm text-[#B8A48F]">
              Label — not required right now. You can add this later.
            </p>
            <div className="bg-[#1C130D] border border-[#3D2C1E] rounded-lg p-4 text-sm text-[#6E5B49]">
              No label added
            </div>
            <p className="text-xs text-[#8A7461]">
              After you submit, your listing will be reviewed and go live within 24 hours.
            </p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-6">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 border border-[#3D2C1E] text-[#B8A48F] py-3 rounded-full font-medium"
            >
              Back
            </button>
          )}

          {step < 5 && (
            <button
              onClick={() => setStep(step + 1)}
              disabled={
                (step === 1 && !canNext1) ||
                (step === 2 && !canNext2) ||
                (step === 3 && !canNext3)
              }
              className="flex-1 bg-gradient-to-r from-[#8B5E2E] to-[#D9A94D] text-[#1C130D] py-3 rounded-full font-medium disabled:opacity-40"
            >
              Next
            </button>
          )}

          {step === 5 && (
            <button
              onClick={handleSubmit}
              disabled={submitting || !canSubmit}
              className="flex-1 bg-gradient-to-r from-[#8B5E2E] to-[#D9A94D] text-[#1C130D] py-3 rounded-full font-medium disabled:opacity-40"
            >
              {submitting ? "Submitting..." : "Submit"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}