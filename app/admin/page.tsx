"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type TabKey = "overview" | "pending" | "products" | "sellers" | "orders" | "withdrawals";

export default function AdminPanel() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<TabKey>("overview");

  const [stats, setStats] = useState({
    totalSellers: 0,
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
  });
  const [commission, setCommission] = useState({ online: 0, cod: 0 });
  const [products, setProducts] = useState<any[]>([]);
  const [pendingProducts, setPendingProducts] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [selectedSeller, setSelectedSeller] = useState<any>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setChecking(false);
      return;
    }
    checkAdmin();
  }, [user, authLoading]);

  const checkAdmin = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user!.id)
      .single();

    if (data?.role === "admin") {
      setIsAdmin(true);
      loadAll();
    }
    setChecking(false);
  };

  const loadAll = async () => {
    const { data: productsData } = await supabase
      .from("products")
      .select("*, categories(name), profiles(shop_name)")
      .order("created_at", { ascending: false });
    setProducts(productsData || []);
    setPendingProducts((productsData || []).filter((p) => p.status === "pending"));

    const { data: sellersData } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "seller")
      .order("created_at", { ascending: false });
    setSellers(sellersData || []);

    const { data: ordersData } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false });

    const allProductIds = Array.from(
      new Set(
        (ordersData || []).flatMap((o) =>
          (o.order_items || []).map((i: any) => i.product_id)
        )
      )
    );

    let productTitleMap: Record<string, string> = {};
    if (allProductIds.length > 0) {
      const { data: productsForOrders } = await supabase
        .from("products")
        .select("id, title")
        .in("id", allProductIds);
      (productsForOrders || []).forEach((p) => {
        productTitleMap[p.id] = p.title;
      });
    }

    const ordersWithTitles = (ordersData || []).map((o) => ({
      ...o,
      order_items: (o.order_items || []).map((i: any) => ({
        ...i,
        productTitle: productTitleMap[i.product_id] || "Product",
      })),
    }));

    setOrders(ordersWithTitles);

    const { data: withdrawalsData } = await supabase
      .from("withdrawals")
      .select("*, profiles(shop_name, email)")
      .order("created_at", { ascending: false });
    setWithdrawals(withdrawalsData || []);

    const { data: earningsData } = await supabase
      .from("admin_earnings")
      .select("amount, source");
    const sumBySource = (source: string) =>
      (earningsData || [])
        .filter((e) => e.source === source)
        .reduce((sum, e) => sum + Number(e.amount || 0), 0);
    setCommission({ online: sumBySource("online"), cod: sumBySource("cod") });

    const totalRevenue = (ordersData || []).reduce(
      (sum, o) => sum + Number(o.total_amount || 0),
      0
    );

    setStats({
      totalSellers: (sellersData || []).length,
      totalProducts: (productsData || []).length,
      totalOrders: (ordersData || []).length,
      totalRevenue,
    });
  };

  const handleApproveProduct = async (id: string) => {
    await supabase.from("products").update({ status: "active" }).eq("id", id);
    loadAll();
  };

  const handleRejectProduct = async (id: string) => {
    if (!confirm("Reject and delete this listing?")) return;
    await supabase.from("products").delete().eq("id", id);
    loadAll();
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    await supabase.from("products").delete().eq("id", id);
    loadAll();
  };
  const handleVerifySeller = async (id: string) => {
    await supabase.from("profiles").update({ is_verified: true }).eq("id", id);
    loadAll();
    setSelectedSeller((prev: any) => (prev ? { ...prev, is_verified: true } : prev));
  };

  const handleSuspendSeller = async (id: string, currentStatus: boolean) => {
    await supabase
      .from("profiles")
      .update({ suspended: !currentStatus })
      .eq("id", id);
    loadAll();
  };

  const handlePaymentStatus = async (id: string, status: string) => {
    await supabase.from("orders").update({ payment_status: status }).eq("id", id);
    loadAll();
  };

  const handleWithdrawal = async (id: string, action: "paid" | "rejected") => {
    let reference = "";
    if (action === "paid") {
      const input = prompt("Enter the transaction reference of your payout");
      if (!input || !input.trim()) return;
      reference = input.trim();
    } else if (
      !confirm("Reject this request and return the money to the seller's balance?")
    ) {
      return;
    }

    const { error } = await supabase.rpc("process_withdrawal", {
      p_id: id,
      p_action: action,
      p_reference: reference,
    });
    if (error) {
      alert(error.message);
      return;
    }
    loadAll();
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-900/40 text-yellow-300";
      case "shipped":
        return "bg-blue-900/40 text-blue-300";
      case "delivered":
        return "bg-green-900/40 text-green-300";
      case "paid":
        return "bg-green-900/40 text-green-300";
      case "rejected":
        return "bg-red-900/40 text-red-300";
      default:
        return "bg-gray-700/40 text-gray-300";
    }
  };

  if (authLoading || checking) {
    return (
      <main className="min-h-screen bg-[#1C130D] flex items-center justify-center">
        <p className="text-[#8A7461]">Loading...</p>
      </main>
    );
  }

  if (!user || !isAdmin) {
    return (
      <main className="min-h-screen bg-[#1C130D] flex flex-col items-center justify-center px-4 text-center">
        <p className="text-[#B8A48F] mb-4">This page is for admins only</p>
        <button
          onClick={() => router.push("/")}
          className="bg-gradient-to-r from-[#8B5E2E] to-[#D9A94D] text-[#1C130D] font-medium px-6 py-3 rounded-full"
        >
          Go Home
        </button>
      </main>
    );
  }

  const navItems: { key: TabKey; label: string; icon: string; count?: number }[] = [
    { key: "overview", label: "Overview", icon: "👑" },
    { key: "pending", label: "Pending Approvals", icon: "⏳", count: pendingProducts.length },
    { key: "products", label: "All Products", icon: "📦" },
    { key: "sellers", label: "Sellers", icon: "🏪" },
    { key: "orders", label: "Orders", icon: "🧾" },
    { key: "withdrawals", label: "Withdrawals", icon: "💸" },
  ];

  return (
    <main className="min-h-screen bg-[#1C130D] flex flex-col md:flex-row">
      <aside className="hidden md:flex md:flex-col w-64 flex-shrink-0 bg-[#241A12] border-r border-[#3D2C1E] min-h-screen py-6 px-4">
        <div className="flex flex-col items-center text-center mb-8 pb-6 border-b border-[#3D2C1E]">
          <img src="/logo.png" alt="Zevo" className="w-16 h-16 object-contain mb-2" />
          <p className="text-lg font-bold text-[#F3E7D8]">Zevo</p>
          <p className="text-[11px] text-[#C9A15A] tracking-wide mt-0.5">
            Admin Control Center
          </p>
        </div>

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-colors ${
                tab === item.key
                  ? "bg-gradient-to-r from-[#8B5E2E] to-[#D9A94D] text-[#1C130D] shadow-lg shadow-[#C9A15A]/20"
                  : "text-[#B8A48F] hover:bg-[#2E2015]"
              }`}
            >
              <span className="flex items-center gap-3">
                <span>{item.icon}</span>
                {item.label}
              </span>
              {item.count !== undefined && item.count > 0 && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    tab === item.key
                      ? "bg-[#1C130D] text-[#C9A15A]"
                      : "bg-[#C9A15A] text-[#1C130D]"
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </aside>

      <div className="md:hidden sticky top-0 z-30 bg-[#241A12] border-b border-[#3D2C1E] px-4 py-3 flex items-center gap-2">
        <img src="/logo.png" alt="Zevo" className="w-7 h-7 object-contain" />
        <div>
          <p className="text-sm font-bold text-[#F3E7D8] leading-none">Zevo</p>
          <p className="text-[10px] text-[#C9A15A]">Admin Control Center</p>
        </div>
      </div>
      <div className="md:hidden sticky top-[52px] z-20 bg-[#1C130D] border-b border-[#3D2C1E] px-2 py-2 flex gap-2 overflow-x-auto">
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
            {item.count !== undefined && item.count > 0 && (
              <span className="bg-[#C9A15A] text-[#1C130D] text-[9px] font-bold px-1.5 rounded-full">
                {item.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 min-w-0 pb-20">
        {tab === "overview" && (
          <div className="p-6">
            <h1 className="text-xl font-semibold text-[#F3E7D8] mb-1">Overview</h1>
            <p className="text-sm text-[#8A7461] mb-6">Your marketplace at a glance</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mb-6">
              <div className="bg-[#241A12] border border-[#3D2C1E] rounded-xl p-5">
                <p className="text-xs text-[#8A7461]">Total Sellers</p>
                <p className="text-2xl font-bold text-[#F3E7D8] mt-1">
                  {stats.totalSellers}
                </p>
              </div>
              <div className="bg-[#241A12] border border-[#3D2C1E] rounded-xl p-5">
                <p className="text-xs text-[#8A7461]">Total Products</p>
                <p className="text-2xl font-bold text-[#F3E7D8] mt-1">
                  {stats.totalProducts}
                </p>
              </div>
              <div className="bg-[#241A12] border border-[#3D2C1E] rounded-xl p-5">
                <p className="text-xs text-[#8A7461]">Total Orders</p>
                <p className="text-2xl font-bold text-[#F3E7D8] mt-1">
                  {stats.totalOrders}
                </p>
              </div>
              <div className="bg-gradient-to-br from-[#8B5E2E]/20 to-[#D9A94D]/10 border border-[#C9A15A]/30 rounded-xl p-5">
                <p className="text-xs text-[#C9A15A]">Total Revenue</p>
                <p className="text-2xl font-bold text-[#C9A15A] mt-1">
                  Rs {stats.totalRevenue}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 max-w-2xl mb-6">
              <div className="bg-[#241A12] border border-[#3D2C1E] rounded-xl p-5">
                <p className="text-xs text-[#8A7461]">Commission earned (online)</p>
                <p className="text-2xl font-bold text-green-400 mt-1">
                  Rs {commission.online}
                </p>
              </div>
              <div className="bg-[#241A12] border border-[#3D2C1E] rounded-xl p-5">
                <p className="text-xs text-[#8A7461]">Commission to collect (COD)</p>
                <p className="text-2xl font-bold text-orange-400 mt-1">
                  Rs {commission.cod}
                </p>
              </div>
            </div>

            {pendingProducts.length > 0 && (
              <button
                onClick={() => setTab("pending")}
                className="flex items-center justify-between w-full max-w-2xl bg-[#241A12] border border-[#C9A15A]/40 rounded-xl p-5 text-left hover:border-[#C9A15A] transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-[#F3E7D8]">
                    {pendingProducts.length} listing{pendingProducts.length > 1 ? "s" : ""}{" "}
                    waiting for review
                  </p>
                  <p className="text-xs text-[#8A7461] mt-1">Tap to review now</p>
                </div>
                <span className="text-[#C9A15A] text-xl">→</span>
              </button>
            )}
          </div>
        )}
        
        {tab === "pending" && (
          <div className="p-6">
            <h2 className="text-lg font-semibold text-[#F3E7D8] mb-5">
              Pending Approvals
            </h2>
            {pendingProducts.length === 0 ? (
              <p className="text-[#8A7461] text-sm">No listings waiting for review</p>
            ) : (
              <div className="space-y-3 max-w-2xl">
                {pendingProducts.map((product) => (
                  <div
                    key={product.id}
                    className="bg-[#241A12] border border-[#3D2C1E] rounded-xl p-4"
                  >
                    <div className="flex items-center gap-4">
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
                        <p className="text-xs text-[#8A7461]">
                          {product.profiles?.shop_name || "Unknown Shop"} · Rs{" "}
                          {product.discount_price || product.price}
                        </p>
                      </div>
                    </div>
                    {product.description && (
                      <p className="text-sm text-[#B8A48F] mt-3">{product.description}</p>
                    )}
                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={() => handleApproveProduct(product.id)}
                        className="text-sm font-medium px-4 py-1.5 rounded-full bg-green-900/40 text-green-300"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleRejectProduct(product.id)}
                        className="text-sm font-medium px-4 py-1.5 rounded-full bg-red-900/40 text-red-300"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "products" && (
          <div className="p-6">
            <h2 className="text-lg font-semibold text-[#F3E7D8] mb-5">All Products</h2>
            <div className="space-y-3 max-w-2xl">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="bg-[#241A12] border border-[#3D2C1E] rounded-xl p-4 flex items-center gap-4"
                >
                  <div className="w-14 h-14 rounded-lg bg-[#1C130D] flex-shrink-0 overflow-hidden">
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
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-[#8A7461]">
                        {product.profiles?.shop_name || "Unknown Shop"} · Rs{" "}
                        {product.discount_price || product.price}
                      </p>
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${statusColor(
                          product.status || "active"
                        )}`}
                      >
                        {product.status || "active"}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteProduct(product.id)}
                    className="text-sm text-red-400 font-medium"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "sellers" && (
          <div className="p-6">
            <h2 className="text-lg font-semibold text-[#F3E7D8] mb-5">Sellers</h2>
            <div className="space-y-3 max-w-2xl">
              {sellers.map((seller) => (
                <button
                  key={seller.id}
                  onClick={() => setSelectedSeller(seller)}
                  className="w-full text-left bg-[#241A12] border border-[#3D2C1E] rounded-xl p-4 flex items-center gap-4 hover:border-[#C9A15A]/40 transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-[#1C130D] flex-shrink-0 overflow-hidden">
                    {seller.shop_logo ? (
                      <img
                        src={seller.shop_logo}
                        alt={seller.shop_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg text-[#6E5B49]">
                        🏪
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-[#F3E7D8] truncate">
                        {seller.shop_name || "Unnamed Shop"}
                      </p>
                      {seller.is_verified && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-900/40 text-green-300 flex-shrink-0">
                          ✓ Verified
                        </span>
                      )}
                      {seller.suspended && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-900/40 text-red-300 flex-shrink-0">
                          Suspended
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#8A7461]">{seller.email}</p>
                  </div>
                  <span className="text-[#6E5B49]">→</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === "orders" && (
          <div className="p-6">
            <h2 className="text-lg font-semibold text-[#F3E7D8] mb-5">Orders</h2>
            <div className="space-y-3 max-w-2xl">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-[#241A12] border border-[#3D2C1E] rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-[#8A7461]">
                      {new Date(order.created_at).toLocaleDateString()}
                    </p>
                    <span
                      className={`text-xs font-medium px-3 py-1 rounded-full capitalize ${statusColor(
                        order.status
                      )}`}
                    >
                      {order.status}
                    </span>
                  </div>
                  <p className="text-sm text-[#B8A48F]">
                    {order.customer_name} · {order.city}
                  </p>

                  <div className="space-y-1 mt-2 border-t border-[#3D2C1E] pt-2">
                    {order.order_items?.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between gap-2">
                        <p className="text-xs text-[#8A7461] truncate">
                          {item.productTitle} · {item.quantity}x
                        </p>
                        <span
                          className={`text-[11px] font-medium px-2 py-0.5 rounded-full capitalize flex-shrink-0 ${statusColor(
                            item.status || "pending"
                          )}`}
                        >
                          {item.status || "pending"}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-2">
                    <p className="text-[#C9A15A] font-semibold">Rs {order.total_amount}</p>
                    <p className="text-xs text-[#8A7461] mt-1">
                      {order.payment_method}
                      {order.transaction_id ? ` · TID: ${order.transaction_id}` : ""}
                    </p>
                    {order.payment_method !== "COD" && (
                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className={`text-xs font-medium px-3 py-1 rounded-full ${
                            order.payment_status === "paid"
                              ? "bg-green-900/40 text-green-300"
                              : "bg-yellow-900/40 text-yellow-300"
                          }`}
                        >
                          {order.payment_status === "paid"
                            ? "Payment received"
                            : "Payment not verified"}
                        </span>
                        <button
                          onClick={() =>
                            handlePaymentStatus(
                              order.id,
                              order.payment_status === "paid" ? "unpaid" : "paid"
                            )
                          }
                          className="text-xs text-[#C9A15A] font-medium"
                        >
                          {order.payment_status === "paid" ? "Mark unpaid" : "Mark as paid"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "withdrawals" && (
          <div className="p-6">
            <h2 className="text-lg font-semibold text-[#F3E7D8] mb-5">Withdrawals</h2>
            {withdrawals.length === 0 ? (
              <p className="text-[#8A7461] text-sm">No withdrawal requests yet</p>
            ) : (
              <div className="space-y-3 max-w-2xl">
                {withdrawals.map((w) => (
                  <div
                    key={w.id}
                    className="bg-[#241A12] border border-[#3D2C1E] rounded-xl p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-[#8A7461]">
                        {new Date(w.created_at).toLocaleDateString()}
                      </p>
                      <span
                        className={`text-xs font-medium px-3 py-1 rounded-full capitalize ${statusColor(
                          w.status
                        )}`}
                      >
                        {w.status}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-[#F3E7D8]">
                      {w.profiles?.shop_name || "Unknown shop"}
                    </p>
                    <p className="text-xs text-[#8A7461]">{w.profiles?.email}</p>
                    <p className="text-[#C9A15A] font-semibold mt-2">Rs {w.amount}</p>
                    <p className="text-xs text-[#B8A48F] mt-1 break-words">
                      {w.account_details}
                    </p>
                    {w.reference && (
                      <p className="text-xs text-[#8A7461] mt-1">Reference: {w.reference}</p>
                    )}
                    {w.status === "pending" && (
                      <div className="flex gap-3 mt-3">
                        <button
                          onClick={() => handleWithdrawal(w.id, "paid")}
                          className="text-sm font-medium px-4 py-1.5 rounded-full bg-green-900/40 text-green-300"
                        >
                          Mark as paid
                        </button>
                        <button
                          onClick={() => handleWithdrawal(w.id, "rejected")}
                          className="text-sm font-medium px-4 py-1.5 rounded-full bg-red-900/40 text-red-300"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {selectedSeller && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-[#241A12] border border-[#3D2C1E] w-full sm:w-[480px] sm:rounded-2xl rounded-t-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-[#F3E7D8]">Seller Details</h2>
              <button
                onClick={() => setSelectedSeller(null)}
                className="text-[#8A7461] text-xl"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center gap-4 mb-5">
              <div className="w-16 h-16 rounded-full bg-[#1C130D] flex-shrink-0 overflow-hidden">
                {selectedSeller.shop_logo ? (
                  <img
                    src={selectedSeller.shop_logo}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl text-[#6E5B49]">
                    🏪
                  </div>
                )}
              </div>
              <div>
                <p className="text-base font-semibold text-[#F3E7D8]">
                  {selectedSeller.shop_name || "Unnamed Shop"}
                </p>
                {selectedSeller.is_verified ? (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-900/40 text-green-300">
                    ✓ Verified
                  </span>
                ) : (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-yellow-900/40 text-yellow-300">
                    Not verified
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <p className="text-[#8A7461] text-xs">Full name</p>
                <p className="text-[#F3E7D8]">{selectedSeller.full_name || "—"}</p>
              </div>
              <div>
                <p className="text-[#8A7461] text-xs">Email</p>
                <p className="text-[#F3E7D8]">{selectedSeller.email || "—"}</p>
              </div>
              <div>
                <p className="text-[#8A7461] text-xs">Bank account title</p>
                <p className="text-[#F3E7D8]">{selectedSeller.bank_account_title || "—"}</p>
              </div>
              <div>
                <p className="text-[#8A7461] text-xs">Bank name & account number</p>
                <p className="text-[#F3E7D8]">
                  {selectedSeller.bank_name || "—"} · {selectedSeller.bank_account_number || "—"}
                </p>
              </div>
              <div>
                <p className="text-[#8A7461] text-xs">JazzCash</p>
                <p className="text-[#F3E7D8]">{selectedSeller.jazzcash_number || "—"}</p>
              </div>
              <div>
                <p className="text-[#8A7461] text-xs">EasyPaisa</p>
                <p className="text-[#F3E7D8]">{selectedSeller.easypaisa_number || "—"}</p>
              </div>
              <div>
                <p className="text-[#8A7461] text-xs">Available / Pending balance</p>
                <p className="text-[#F3E7D8]">
                  Rs {selectedSeller.available_balance || 0} / Rs{" "}
                  {selectedSeller.pending_balance || 0}
                </p>
              </div>

              <div>
                <p className="text-[#8A7461] text-xs mb-2">CNIC</p>
                {selectedSeller.cnic_image ? (
                  <img
                    src={selectedSeller.cnic_image}
                    alt="CNIC"
                    className="w-full rounded-lg border border-[#3D2C1E]"
                  />
                ) : (
                  <p className="text-[#6E5B49] text-sm">Not submitted</p>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              {!selectedSeller.is_verified && selectedSeller.cnic_image && (
                <button
                  onClick={() => handleVerifySeller(selectedSeller.id)}
                  className="flex-1 bg-gradient-to-r from-[#8B5E2E] to-[#D9A94D] text-[#1C130D] font-semibold py-3 rounded-full"
                >
                  Verify Seller
                </button>
              )}
              <button
                onClick={() => {
                  handleSuspendSeller(selectedSeller.id, selectedSeller.suspended);
                  setSelectedSeller(null);
                }}
                className={`flex-1 font-semibold py-3 rounded-full ${
                  selectedSeller.suspended
                    ? "bg-green-900/40 text-green-300"
                    : "bg-red-900/40 text-red-300"
                }`}
              >
                {selectedSeller.suspended ? "Unsuspend" : "Suspend"}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </main>
  );
}