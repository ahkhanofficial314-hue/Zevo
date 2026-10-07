"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabaseClient";

type OrderItem = {
  id: string;
  product_id: string;
  quantity: number;
  price: number;
  status: string;
};

type Order = {
  id: string;
  total_amount: number;
  status: string;
  payment_method: string;
  payment_status: string;
  transaction_id: string | null;
  created_at: string;
  customer_name: string;
  address: string;
  city: string;
  order_items: OrderItem[];
};

export default function MyOrders() {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadOrders = async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Orders load error:", error);
      } else {
        setOrders(data || []);
      }
      setLoading(false);
    };

    loadOrders();
  }, [user]);

  const statusColor = (status: string) => {
    switch (status) {
      case "shipped":
        return "bg-blue-900/40 text-blue-300";
      case "delivered":
        return "bg-green-900/40 text-green-300";
      default:
        return "bg-yellow-900/40 text-yellow-300";
    }
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
        <p className="text-[#B8A48F] mb-4">Please sign in to view your orders</p>
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
        <h1 className="text-lg font-semibold text-[#F3E7D8]">My Orders</h1>
        <div className="w-6" />
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-[#8A7461]">
          <div className="text-5xl mb-4">📦</div>
          <p>No orders found</p>
          <Link
            href="/"
            className="mt-4 text-[#C9A15A] font-medium underline"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="px-4 py-4 space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-[#241A12] border border-[#3D2C1E] rounded-xl p-4 shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
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

             <div className="space-y-1 mb-3">
                {order.order_items?.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-2">
                    <p className="text-sm text-[#F3E7D8]">
                      {item.quantity}x — Rs {item.price}
                    </p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${statusColor(
                          item.status || "pending"
                        )}`}
                      >
                        {item.status || "pending"}
                      </span>
                      {item.status === "delivered" && (
                        <Link
                          href={`/products/${item.product_id}`}
                          className="text-xs text-[#C9A15A] font-medium underline"
                        >
                          Rate
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between border-t border-[#3D2C1E] pt-3">
                <div>
                  <p className="text-xs text-[#8A7461]">{order.payment_method}</p>
                  <span
                    className={`text-[11px] font-medium px-2.5 py-1 rounded-full inline-block mt-1 ${
                      order.payment_method === "COD"
                        ? "bg-[#1C130D] text-[#8A7461]"
                        : order.payment_status === "paid"
                        ? "bg-green-900/40 text-green-300"
                        : "bg-yellow-900/40 text-yellow-300"
                    }`}
                  >
                    {order.payment_method === "COD"
                      ? "Pay on delivery"
                      : order.payment_status === "paid"
                      ? "Payment received"
                      : "Payment under verification"}
                  </span>
                  {order.transaction_id && (
                    <p className="text-[11px] text-[#6E5B49] mt-1">
                      TID: {order.transaction_id}
                    </p>
                  )}
                </div>
                <p className="text-[#C9A15A] font-semibold">
                  Rs {order.total_amount}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}