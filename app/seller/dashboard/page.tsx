"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import AddListingWizard from "./AddListingWizard";

type Product = {
  id: string;
  title: string;
  description: string;
  image_url: string;
  price: number;
  discount_price: number | null;
  category_id: string;
};

type Category = {
  id: string;
  name: string;
};

type SellerOrder = {
  order: any;
  items: any[];
};

type TabKey = "home" | "products" | "orders" | "earnings" | "analytics" | "settings";

export default function SellerDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sellerOrders, setSellerOrders] = useState<SellerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("home");

  const [showForm, setShowForm] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [price, setPrice] = useState("");
  const [discountPrice, setDiscountPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [wAmount, setWAmount] = useState("");
  const [wMethod, setWMethod] = useState("bank");
  const [requesting, setRequesting] = useState(false);

  const [shopName, setShopName] = useState("");
  const [bankTitle, setBankTitle] = useState("");
  const [bankNumber, setBankNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [jazzcash, setJazzcash] = useState("");
  const [easypaisa, setEasypaisa] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [cnicImage, setCnicImage] = useState("");
  const [uploadingCnic, setUploadingCnic] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user!.id)
      .single();
    setProfile(profileData);
    if (profileData) {
      setShopName(profileData.shop_name || "");
      setBankTitle(profileData.bank_account_title || "");
      setBankNumber(profileData.bank_account_number || "");
      setBankName(profileData.bank_name || "");
      setJazzcash(profileData.jazzcash_number || "");
      setEasypaisa(profileData.easypaisa_number || "");
      setCnicImage(profileData.cnic_image || "");
    }

    const { data: categoryData } = await supabase
      .from("categories")
      .select("id, name");
    setCategories(categoryData || []);

    const { data: productData } = await supabase
      .from("products")
      .select("*")
      .eq("seller_id", user!.id)
      .order("created_at", { ascending: false });
    setProducts(productData || []);

    await loadOrders(productData || []);
    await loadWithdrawals();

    setLoading(false);
  };

  const loadOrders = async (sellerProducts: Product[]) => {
    const productIds = sellerProducts.map((p) => p.id);
    if (productIds.length === 0) {
      setSellerOrders([]);
      return;
    }

    const { data: itemsData } = await supabase
      .from("order_items")
      .select("*")
      .in("product_id", productIds);

    const items = itemsData || [];
    const orderIds = Array.from(new Set(items.map((i) => i.order_id)));

    if (orderIds.length === 0) {
      setSellerOrders([]);
      return;
    }

    const { data: ordersData } = await supabase
      .from("orders")
      .select("*")
      .in("id", orderIds)
      .order("created_at", { ascending: false });

    const grouped: SellerOrder[] = (ordersData || []).map((order) => ({
      order,
      items: items.filter((i) => i.order_id === order.id),
    }));

    setSellerOrders(grouped);
  };

  const loadWithdrawals = async () => {
    const { data } = await supabase
      .from("withdrawals")
      .select("*")
      .eq("seller_id", user!.id)
      .order("created_at", { ascending: false });
    setWithdrawals(data || []);
  };

  const updateItemStatus = async (itemId: string, status: string) => {
    const { error } = await supabase
      .from("order_items")
      .update({ status })
      .eq("id", itemId);

    if (error) {
      console.error(error);
      alert(error.message || "Could not update the status");
      return;
    }

    setSellerOrders((prev) =>
      prev.map((so) => ({
        ...so,
        items: so.items.map((i) => (i.id === itemId ? { ...i, status } : i)),
      }))
    );

    const { data: freshProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user!.id)
      .single();
    setProfile(freshProfile);
  };

  const requestWithdrawal = async () => {
    const amount = parseFloat(wAmount);
    if (!amount || amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }
    setRequesting(true);
    const { error } = await supabase.rpc("request_withdrawal", {
      p_amount: amount,
      p_method: wMethod,
    });
    setRequesting(false);

    if (error) {
      alert(error.message);
      return;
    }

    setWAmount("");
    const { data: freshProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user!.id)
      .single();
    setProfile(freshProfile);
    await loadWithdrawals();
    alert("Withdrawal request submitted");
  };

  const productTitle = (productId: string) =>
    products.find((p) => p.id === productId)?.title || "Product";

  const uploadFile = async (file: File, prefix: string) => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${prefix}-${user!.id}-${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from("images").upload(fileName, file);
    if (error) throw error;
    const { data } = supabase.storage.from("images").getPublicUrl(fileName);
    return data.publicUrl;
  };
  const handleCnicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingCnic(true);
    try {
      const url = await uploadFile(file, "cnic");
      await supabase
        .from("profiles")
        .update({ cnic_image: url, is_verified: false })
        .eq("id", user.id);
      setCnicImage(url);
      setProfile((prev: any) => ({ ...prev, cnic_image: url, is_verified: false }));
    } catch (err) {
      console.error(err);
      alert("CNIC upload failed");
    }
    setUploadingCnic(false);
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingCover(true);
    try {
      const url = await uploadFile(file, "cover");
      await supabase.from("profiles").update({ cover_image: url }).eq("id", user.id);
      setProfile((prev: any) => ({ ...prev, cover_image: url }));
    } catch (err) {
      console.error(err);
      alert("Cover photo upload failed");
    }
    setUploadingCover(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingLogo(true);
    try {
      const url = await uploadFile(file, "logo");
      await supabase.from("profiles").update({ shop_logo: url }).eq("id", user.id);
      setProfile((prev: any) => ({ ...prev, shop_logo: url }));
    } catch (err) {
      console.error(err);
      alert("Logo upload failed");
    }
    setUploadingLogo(false);
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setImageUrl("");
    setPrice("");
    setDiscountPrice("");
    setCategoryId("");
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setTitle(product.title);
    setDescription(product.description || "");
    setImageUrl(product.image_url || "");
    setPrice(String(product.price));
    setDiscountPrice(product.discount_price ? String(product.discount_price) : "");
    setCategoryId(product.category_id || "");
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    await supabase.from("products").delete().eq("id", id);
    loadData();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFile(file, "product");
      setImageUrl(url);
    } catch (err) {
      console.error(err);
      alert("Image upload failed");
    }
    setUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !price) return;

    setSaving(true);

    const payload = {
      title,
      description,
      image_url: imageUrl,
      price: parseFloat(price),
      discount_price: discountPrice ? parseFloat(discountPrice) : null,
      category_id: categoryId || null,
      seller_id: user!.id,
    };

    if (editingId) {
      await supabase.from("products").update(payload).eq("id", editingId);
    } else {
      await supabase.from("products").insert(payload);
    }

    setSaving(false);
    resetForm();
    loadData();
  };

  const handleSaveSettings = async () => {
    if (!user) return;
    setSavingSettings(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        shop_name: shopName,
        bank_account_title: bankTitle,
        bank_account_number: bankNumber,
        bank_name: bankName,
        jazzcash_number: jazzcash || null,
        easypaisa_number: easypaisa || null,
      })
      .eq("id", user.id);

    setSavingSettings(false);

    if (error) {
      console.error(error);
      alert("Could not save your changes");
      return;
    }

    setProfile((prev: any) => ({
      ...prev,
      shop_name: shopName,
      bank_account_title: bankTitle,
      bank_account_number: bankNumber,
      bank_name: bankName,
      jazzcash_number: jazzcash || null,
      easypaisa_number: easypaisa || null,
    }));

    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  };

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
        <p className="text-[#B8A48F] mb-4">Please sign in with your seller account</p>
        <button
          onClick={() => router.push("/seller/login")}
          className="bg-gradient-to-r from-[#8B5E2E] to-[#D9A94D] text-[#1C130D] font-medium px-6 py-3 rounded-full"
        >
          Sign In
        </button>
      </main>
    );
  }

  if (profile && profile.role !== "seller") {
    return (
      <main className="min-h-screen bg-[#1C130D] flex flex-col items-center justify-center px-4 text-center">
        <p className="text-[#B8A48F] mb-4">
          This account is not a seller yet. Please set up your shop first.
        </p>
        <button
          onClick={() => router.push("/seller/onboarding")}
          className="bg-gradient-to-r from-[#8B5E2E] to-[#D9A94D] text-[#1C130D] font-medium px-6 py-3 rounded-full"
        >
          Setup Shop
        </button>
      </main>
    );
  }

  const shipmentPendingCount = sellerOrders.reduce((sum, so) => {
    return (
      sum +
      so.items.filter(
        (i) =>
          i.status === "pending" &&
          (so.order.payment_method === "COD" || so.order.payment_status === "paid")
      ).length
    );
  }, 0);

  const paymentPendingOrders = sellerOrders.filter(
    (so) => so.order.payment_method !== "COD" && so.order.payment_status !== "paid"
  );

  const totalOrders = sellerOrders.length;
  const uniqueBuyers = new Set(sellerOrders.map((so) => so.order.user_id)).size;
  const totalSales = sellerOrders.reduce((sum, so) => {
    return (
      sum +
      so.items
        .filter((i) => i.status === "delivered")
        .reduce((s, i) => s + i.price * i.quantity, 0)
    );
  }, 0);

  const navItems: { key: TabKey; label: string; icon: string }[] = [
    { key: "home", label: "Home", icon: "🏠" },
    { key: "products", label: "Products", icon: "📦" },
    { key: "orders", label: "Orders", icon: "🧾" },
    { key: "earnings", label: "Earnings", icon: "💰" },
    { key: "analytics", label: "Analytics", icon: "📊" },
    { key: "settings", label: "Shop Settings", icon: "🏪" },
  ];

  return (
    <main className="min-h-screen bg-[#1C130D] flex flex-col md:flex-row">
      <aside className="hidden md:flex md:flex-col w-56 flex-shrink-0 bg-[#241A12] border-r border-[#3D2C1E] min-h-screen py-6 px-3">
        <div className="flex items-center gap-2 px-3 mb-8">
          <div className="w-9 h-9 rounded-xl bg-[#1C130D] border border-[#3D2C1E] overflow-hidden flex-shrink-0">
            {profile?.shop_logo ? (
              <img src={profile.shop_logo} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm text-[#6E5B49]">🏪</div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#F3E7D8] truncate">
              {profile?.shop_name || "My Shop"}
            </p>
            <p className="text-[11px] text-[#8A7461]">Seller Center</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-colors ${
                tab === item.key
                  ? "bg-gradient-to-r from-[#8B5E2E] to-[#D9A94D] text-[#1C130D]"
                  : "text-[#B8A48F] hover:bg-[#2E2015]"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="md:hidden sticky top-0 z-30 bg-[#241A12] border-b border-[#3D2C1E] px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#1C130D] border border-[#3D2C1E] overflow-hidden flex-shrink-0">
            {profile?.shop_logo ? (
              <img src={profile.shop_logo} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-[#6E5B49]">🏪</div>
            )}
          </div>
          <p className="text-sm font-semibold text-[#F3E7D8] truncate">
            {profile?.shop_name || "My Shop"}
          </p>
        </div>
      </div>
      <div className="md:hidden sticky top-[49px] z-20 bg-[#1C130D] border-b border-[#3D2C1E] px-2 py-2 flex gap-2 overflow-x-auto">
        {navItems.map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
              tab === item.key
                ? "bg-gradient-to-r from-[#8B5E2E] to-[#D9A94D] text-[#1C130D]"
                : "bg-[#241A12] border border-[#3D2C1E] text-[#B8A48F]"
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-w-0 pb-20">
        {tab === "home" && (
          <div className="p-6 max-w-3xl">
            <h1 className="text-xl font-semibold text-[#F3E7D8] mb-1">
              Welcome back{profile?.full_name ? `, ${profile.full_name}` : ""}
            </h1>
            <p className="text-sm text-[#8A7461] mb-6">Here's what needs your attention</p>

            <div className="grid sm:grid-cols-2 gap-4">
              <button
                onClick={() => setTab("orders")}
                className="text-left bg-[#241A12] border border-[#3D2C1E] rounded-xl p-5 hover:border-[#C9A15A]/40 transition-colors"
              >
                <p className="text-xs text-[#8A7461] mb-1">Orders to ship</p>
                <p className="text-2xl font-bold text-[#C9A15A]">{shipmentPendingCount}</p>
                <p className="text-xs text-[#6E5B49] mt-1">Tap to review</p>
              </button>

              <button
                onClick={() => setTab("orders")}
                className="text-left bg-[#241A12] border border-[#3D2C1E] rounded-xl p-5 hover:border-[#C9A15A]/40 transition-colors"
              >
                <p className="text-xs text-[#8A7461] mb-1">Payments pending verification</p>
                <p className="text-2xl font-bold text-yellow-400">{paymentPendingOrders.length}</p>
                <p className="text-xs text-[#6E5B49] mt-1">Waiting on admin</p>
              </button>

              <button
                onClick={() => setTab("products")}
                className="text-left bg-[#241A12] border border-[#3D2C1E] rounded-xl p-5 hover:border-[#C9A15A]/40 transition-colors"
              >
                <p className="text-xs text-[#8A7461] mb-1">Active products</p>
                <p className="text-2xl font-bold text-[#F3E7D8]">{products.length}</p>
                <p className="text-xs text-[#6E5B49] mt-1">Manage listings</p>
              </button>

              <button
                onClick={() => setTab("earnings")}
                className="text-left bg-[#241A12] border border-[#3D2C1E] rounded-xl p-5 hover:border-[#C9A15A]/40 transition-colors"
              >
                <p className="text-xs text-[#8A7461] mb-1">Available balance</p>
                <p className="text-2xl font-bold text-[#C9A15A]">
                  Rs {profile?.available_balance || 0}
                </p>
                <p className="text-xs text-[#6E5B49] mt-1">Withdraw anytime</p>
              </button>
            </div>
          </div>
        )}

        {tab === "products" && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-[#F3E7D8]">
                My Products ({products.length})
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowWizard(true)}
                  className="bg-gradient-to-r from-[#8B5E2E] to-[#D9A94D] text-[#1C130D] text-sm font-semibold px-5 py-2.5 rounded-full"
                >
                  + Add Listing
                </button>
              
              </div>
            </div>

            {products.length === 0 ? (
              <p className="text-[#8A7461] text-sm">No products added yet</p>
            ) : (
              <div className="space-y-3 max-w-2xl">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="bg-[#241A12] border border-[#3D2C1E] rounded-xl p-4 flex items-center gap-4 shadow-sm"
                  >
                    <div className="w-16 h-16 rounded-lg bg-[#1C130D] flex-shrink-0 overflow-hidden">
                      {product.image_url && (
                        <img
                          src={product.image_url}
                          alt={product.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#F3E7D8] truncate">
                        {product.title}
                      </p>
                      <p className="text-[#C9A15A] font-semibold text-sm mt-1">
                        Rs {product.discount_price || product.price}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleEdit(product)}
                        className="text-sm text-[#C9A15A] font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="text-sm text-red-400 font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "orders" && (
          <div className="p-6">
            <h2 className="text-lg font-semibold text-[#F3E7D8] mb-5">Customer Orders</h2>

            {sellerOrders.length === 0 ? (
              <p className="text-[#8A7461] text-sm">No orders yet</p>
            ) : (
              <div className="space-y-4 max-w-2xl">
                {sellerOrders.map(({ order, items }) => (
                  <div
                    key={order.id}
                    className="bg-[#241A12] border border-[#3D2C1E] rounded-xl p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-[#8A7461]">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                      <div className="text-right">
                        <p className="text-xs text-[#8A7461]">{order.payment_method}</p>
                        {order.payment_method !== "COD" && (
                          <span
                            className={`text-[11px] font-medium px-2.5 py-1 rounded-full inline-block mt-1 ${
                              order.payment_status === "paid"
                                ? "bg-green-900/40 text-green-300"
                                : "bg-yellow-900/40 text-yellow-300"
                            }`}
                          >
                            {order.payment_status === "paid"
                              ? "Payment received"
                              : "Payment not verified. Do not ship yet."}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-sm text-[#B8A48F] mb-3">
                      <p className="font-medium text-[#F3E7D8]">{order.customer_name}</p>
                      <p>{order.phone}</p>
                      <p>
                        {order.address}, {order.city}
                      </p>
                    </div>

                    <div className="space-y-3 border-t border-[#3D2C1E] pt-3">
                      {items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm text-[#F3E7D8] truncate">
                              {productTitle(item.product_id)}
                            </p>
                            <p className="text-xs text-[#8A7461]">
                              {item.quantity} x Rs {item.price}
                            </p>
                          </div>
                          <select
                            value={item.status || "pending"}
                            onChange={(e) => updateItemStatus(item.id, e.target.value)}
                            disabled={
                              item.status === "delivered" ||
                              (order.payment_method !== "COD" && order.payment_status !== "paid")
                            }
                            className={`text-xs font-medium px-3 py-1.5 rounded-full border-0 capitalize bg-[#1C130D] ${
                              item.status === "delivered"
                                ? "text-green-300"
                                : item.status === "shipped"
                                ? "text-blue-300"
                                : "text-yellow-300"
                            }`}
                          >
                            <option value="pending">Pending</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {tab === "earnings" && (
          <div className="p-6">
            <h2 className="text-lg font-semibold text-[#F3E7D8] mb-5">Earnings</h2>

            <div className="grid grid-cols-2 gap-4 max-w-2xl mb-6">
              <div className="bg-[#241A12] border border-[#3D2C1E] rounded-xl p-5">
                <p className="text-xs text-[#8A7461]">Available Balance</p>
                <p className="text-2xl font-bold text-[#C9A15A] mt-1">
                  Rs {profile?.available_balance || 0}
                </p>
              </div>
              <div className="bg-[#241A12] border border-[#3D2C1E] rounded-xl p-5">
                <p className="text-xs text-[#8A7461]">Pending Balance</p>
                <p className="text-2xl font-bold text-[#F3E7D8] mt-1">
                  Rs {profile?.pending_balance || 0}
                </p>
              </div>
            </div>

            <div className="bg-[#241A12] border border-[#3D2C1E] rounded-xl p-5 max-w-2xl">
              <h3 className="text-base font-semibold text-[#F3E7D8] mb-1">
                Withdraw money
              </h3>
              <p className="text-xs text-[#8A7461] mb-4">
                Minimum Rs 500. Only your available balance can be withdrawn.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="number"
                  placeholder="Amount"
                  value={wAmount}
                  onChange={(e) => setWAmount(e.target.value)}
                  className="flex-1 bg-[#1C130D] border border-[#3D2C1E] rounded-lg px-4 py-2.5 text-sm text-[#F3E7D8]"
                />
                <select
                  value={wMethod}
                  onChange={(e) => setWMethod(e.target.value)}
                  className="bg-[#1C130D] border border-[#3D2C1E] rounded-lg px-4 py-2.5 text-sm text-[#F3E7D8]"
                >
                  <option value="bank">Bank account</option>
                  <option value="jazzcash">JazzCash</option>
                  <option value="easypaisa">EasyPaisa</option>
                </select>
                <button
                  onClick={requestWithdrawal}
                  disabled={requesting}
                  className="bg-gradient-to-r from-[#8B5E2E] to-[#D9A94D] text-[#1C130D] text-sm font-semibold px-5 py-2.5 rounded-lg disabled:opacity-50"
                >
                  {requesting ? "Requesting..." : "Request"}
                </button>
              </div>

              {withdrawals.length > 0 && (
                <div className="mt-5 space-y-2 border-t border-[#3D2C1E] pt-4">
                  {withdrawals.map((w) => (
                    <div key={w.id} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm text-[#F3E7D8]">Rs {w.amount}</p>
                        <p className="text-xs text-[#8A7461]">
                          {new Date(w.created_at).toLocaleDateString()} · {w.method}
                          {w.reference ? ` · Ref: ${w.reference}` : ""}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-medium px-3 py-1 rounded-full capitalize ${
                          w.status === "paid"
                            ? "bg-green-900/40 text-green-300"
                            : w.status === "rejected"
                            ? "bg-red-900/40 text-red-300"
                            : "bg-yellow-900/40 text-yellow-300"
                        }`}
                      >
                        {w.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "analytics" && (
          <div className="p-6">
            <h2 className="text-lg font-semibold text-[#F3E7D8] mb-5">Analytics</h2>
            <div className="grid grid-cols-3 gap-4 max-w-2xl">
              <div className="bg-[#241A12] border border-[#3D2C1E] rounded-xl p-5">
                <p className="text-xs text-[#8A7461]">Total sales</p>
                <p className="text-xl font-bold text-[#C9A15A] mt-1">Rs {totalSales}</p>
              </div>
              <div className="bg-[#241A12] border border-[#3D2C1E] rounded-xl p-5">
                <p className="text-xs text-[#8A7461]">Total orders</p>
                <p className="text-xl font-bold text-[#F3E7D8] mt-1">{totalOrders}</p>
              </div>
              <div className="bg-[#241A12] border border-[#3D2C1E] rounded-xl p-5">
                <p className="text-xs text-[#8A7461]">Buyers</p>
                <p className="text-xl font-bold text-[#F3E7D8] mt-1">{uniqueBuyers}</p>
              </div>
            </div>
          </div>
        )}

        {tab === "settings" && (
          <div className="p-6">
            <h2 className="text-lg font-semibold text-[#F3E7D8] mb-5">Shop Settings</h2>

            <div className="relative h-32 sm:h-40 bg-gradient-to-br from-[#8B5E2E] to-[#D9A94D] rounded-xl overflow-hidden mb-16 max-w-2xl">
              {profile?.cover_image && (
                <img
                  src={profile.cover_image}
                  alt="Cover"
                  className="w-full h-full object-cover"
                />
              )}
              <label className="absolute top-3 right-3 bg-black/40 text-white text-xs px-3 py-1.5 rounded-full cursor-pointer backdrop-blur-sm">
                {uploadingCover ? "Uploading..." : "📷 Edit cover"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverUpload}
                  className="hidden"
                />
              </label>

              <label className="absolute -bottom-12 left-5 cursor-pointer">
                <div className="w-20 h-20 rounded-2xl border-4 border-[#1C130D] bg-[#241A12] shadow-lg overflow-hidden">
                  {profile?.shop_logo ? (
                    <img
                      src={profile.shop_logo}
                      alt="Logo"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl text-[#6E5B49]">
                      🏪
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <p className="text-[10px] text-[#8A7461] text-center mt-1">
                  {uploadingLogo ? "..." : "Edit logo"}
                </p>
              </label>
            </div>

            <div className="bg-[#241A12] border border-[#3D2C1E] rounded-xl p-5 max-w-2xl space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#F3E7D8] mb-1.5">
                  Shop name
                </label>
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full bg-[#1C130D] border border-[#3D2C1E] rounded-lg px-4 py-2.5 text-sm text-[#F3E7D8]"
                />
              </div>

              <div className="pt-2 border-t border-[#3D2C1E]">
                <p className="text-sm font-medium text-[#F3E7D8] mb-3 mt-4">Bank details</p>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Account title"
                    value={bankTitle}
                    onChange={(e) => setBankTitle(e.target.value)}
                    className="w-full bg-[#1C130D] border border-[#3D2C1E] rounded-lg px-4 py-2.5 text-sm text-[#F3E7D8] placeholder-[#6E5B49]"
                  />
                  <input
                    type="text"
                    placeholder="Account number / IBAN"
                    value={bankNumber}
                    onChange={(e) => setBankNumber(e.target.value)}
                    className="w-full bg-[#1C130D] border border-[#3D2C1E] rounded-lg px-4 py-2.5 text-sm text-[#F3E7D8] placeholder-[#6E5B49]"
                  />
                  <input
                    type="text"
                    placeholder="Bank name"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full bg-[#1C130D] border border-[#3D2C1E] rounded-lg px-4 py-2.5 text-sm text-[#F3E7D8] placeholder-[#6E5B49]"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-[#3D2C1E]">
                <p className="text-sm font-medium text-[#F3E7D8] mb-3 mt-4">
                  Mobile wallet (optional)
                </p>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="JazzCash number"
                    value={jazzcash}
                    onChange={(e) => setJazzcash(e.target.value)}
                    className="w-full bg-[#1C130D] border border-[#3D2C1E] rounded-lg px-4 py-2.5 text-sm text-[#F3E7D8] placeholder-[#6E5B49]"
                  />
                  <input
                    type="text"
                    placeholder="EasyPaisa number"
                    value={easypaisa}
                    onChange={(e) => setEasypaisa(e.target.value)}
                    className="w-full bg-[#1C130D] border border-[#3D2C1E] rounded-lg px-4 py-2.5 text-sm text-[#F3E7D8] placeholder-[#6E5B49]"
                  />
                </div>
              </div>
              <div className="pt-2 border-t border-[#3D2C1E]">
                <p className="text-sm font-medium text-[#F3E7D8] mb-1 mt-4">
                  Identity Verification
                </p>
                <p className="text-xs text-[#8A7461] mb-3">
                  Upload your CNIC to get a verified badge on your shop
                </p>

                {profile?.is_verified ? (
                  <span className="inline-block text-xs font-medium px-3 py-1.5 rounded-full bg-green-900/40 text-green-300 mb-3">
                    ✓ Verified
                  </span>
                ) : cnicImage ? (
                  <span className="inline-block text-xs font-medium px-3 py-1.5 rounded-full bg-yellow-900/40 text-yellow-300 mb-3">
                    Pending verification
                  </span>
                ) : (
                  <span className="inline-block text-xs font-medium px-3 py-1.5 rounded-full bg-[#1C130D] text-[#8A7461] mb-3">
                    Not submitted
                  </span>
                )}

                <label className="block">
                  <div className="w-full border-2 border-dashed border-[#3D2C1E] rounded-lg py-6 text-center cursor-pointer hover:border-[#C9A15A]/50 transition-colors">
                    {cnicImage ? (
                      <img
                        src={cnicImage}
                        alt="CNIC"
                        className="w-32 h-20 object-cover rounded-lg mx-auto"
                      />
                    ) : (
                      <span className="text-sm text-[#8A7461]">
                        {uploadingCnic ? "Uploading..." : "📷 Upload CNIC (front)"}
                      </span>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCnicUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <button
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="w-full bg-gradient-to-r from-[#8B5E2E] to-[#D9A94D] text-[#1C130D] font-semibold py-3 rounded-xl disabled:opacity-50 mt-2"
              >
                {savingSettings ? "Saving..." : settingsSaved ? "Saved ✓" : "Save Changes"}
              </button>
            </div>
          </div>
        )}
      </div>
      {showWizard && (
        <AddListingWizard
          userId={user!.id}
          categories={categories}
          onClose={() => setShowWizard(false)}
          onDone={() => {
            setShowWizard(false);
            loadData();
          }}
        />
      )}


      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-[#241A12] border border-[#3D2C1E] w-full sm:w-96 sm:rounded-2xl rounded-t-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4 text-[#F3E7D8]">
              {editingId ? "Edit Product" : "Add Product"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="text"
                placeholder="Product title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full bg-[#1C130D] border border-[#3D2C1E] rounded-lg px-4 py-2.5 text-sm text-[#F3E7D8] placeholder-[#6E5B49]"
              />
              <textarea
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-[#1C130D] border border-[#3D2C1E] rounded-lg px-4 py-2.5 text-sm text-[#F3E7D8] placeholder-[#6E5B49]"
              />

              <div>
                <label className="block">
                  <div className="w-full border-2 border-dashed border-[#3D2C1E] rounded-lg py-6 text-center cursor-pointer hover:border-[#C9A15A]/50 transition-colors">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt="Preview"
                        className="w-24 h-24 object-cover rounded-lg mx-auto"
                      />
                    ) : (
                      <span className="text-sm text-[#8A7461]">
                        {uploading ? "Uploading..." : "📷 Choose photo"}
                      </span>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <input
                type="number"
                placeholder="Price"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                className="w-full bg-[#1C130D] border border-[#3D2C1E] rounded-lg px-4 py-2.5 text-sm text-[#F3E7D8] placeholder-[#6E5B49]"
              />
              <input
                type="number"
                placeholder="Sale price if on discount, e.g. 630 (leave blank if no discount)"
                value={discountPrice}
                onChange={(e) => setDiscountPrice(e.target.value)}
                className="w-full bg-[#1C130D] border border-[#3D2C1E] rounded-lg px-4 py-2.5 text-sm text-[#F3E7D8] placeholder-[#6E5B49]"
              />
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-[#1C130D] border border-[#3D2C1E] rounded-lg px-4 py-2.5 text-sm text-[#F3E7D8]"
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 border border-[#3D2C1E] text-[#B8A48F] py-3 rounded-full font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="flex-1 bg-gradient-to-r from-[#8B5E2E] to-[#D9A94D] text-[#1C130D] py-3 rounded-full font-medium disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingId ? "Update" : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}