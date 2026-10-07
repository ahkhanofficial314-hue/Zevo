import { supabase } from "@/lib/supabaseClient";
import ProductDetailClient from "./ProductDetailClient";

export default async function ProductDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: product } = await supabase
    .from("products")
    .select("*, categories(name), profiles(shop_name, id)")
    .eq("id", id)
    .single();
    const { data: images } = await supabase
    .from("product_images")
    .select("*")
    .eq("product_id", id)
    .order("position", { ascending: true });
    const { data: reviews } = await supabase
    .from("reviews")
    .select("*, profiles(full_name)")
    .eq("product_id", id)
    .order("created_at", { ascending: false });

  if (!product) {
    return <div className="p-10 text-center">Product not found.</div>;
  }

return (
    <ProductDetailClient
      product={product}
      images={images || []}
      reviews={reviews || []}
    />
  );
}