"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/CartContext";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { PLATFORM_PAYMENT } from "@/lib/paymentConfig";

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [placing, setPlacing] = useState(false);

  const [showAddressForm, setShowAddressForm] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [transactionId, setTransactionId] = useState("");

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selected.length === cart.length) {
      setSelected([]);
    } else {
      setSelected(cart.map((item) => item.id));
    }
  };

  const selectedItems = cart.filter((item) => selected.includes(item.id));
  const subtotal = selectedItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const handleCheckout = async () => {
    if (!user) {
      alert("Please sign in to check out");
      return;
    }
    if (selectedItems.length === 0) return;

    setPlacing(true);

    const productIds = selectedItems.map((item) => item.productId);
    const { data: freshProducts, error: priceError } = await supabase
      .from("products")
      .select("id, price, discount_price")
      .in("id", productIds);

    if (priceError || !freshProducts) {
      alert("Could not verify prices. Please try again.");
      setPlacing(false);
      return;
    }

    const priceMap: Record<string, number> = {};
    freshProducts.forEach((p) => {
      priceMap[p.id] = p.discount_price || p.price;
    });

    const verifiedSubtotal = selectedItems.reduce(
      (sum, item) => sum + (priceMap[item.productId] ?? item.price) * item.quantity,
      0
    );

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        total_amount: verifiedSubtotal,
        status: "pending",
        customer_name: customerName,
        phone: phone,
        address: address,
        city: city,
        payment_method: paymentMethod,
        transaction_id: paymentMethod === "COD" ? null : transactionId,
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error("Order error:", orderError);
      alert("Could not place the order. Please try again.");
      setPlacing(false);
      return;
    }

    const orderItemsData = selectedItems.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      quantity: item.quantity,
      price: priceMap[item.productId] ?? item.price,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItemsData);

    if (itemsError) {
      console.error("Order items error:", itemsError);
      alert("Could not save the order items. Please try again.");
      setPlacing(false);
      return;
    }

    for (const item of selectedItems) {
      await removeFromCart(item.id);
    }

    setPlacing(false);
    setShowAddressForm(false);
    alert(
      paymentMethod === "COD"
        ? "Order placed successfully!"
        : "Order placed! We will verify your payment and update your order status."
    );
    router.push("/orders");
  };

  return (
    <main className="min-h-screen bg-[#1C130D] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#241A12]/95 backdrop-blur-md border-b border-[#3D2C1E] px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-[#F3E7D8] text-xl">
          ←
        </Link>
        <h1 className="text-lg font-semibold text-[#F3E7D8]">My Cart</h1>
        <div className="w-6" />
      </div>

      {cart.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-[#8A7461]">
          <div className="text-5xl mb-4">🛒</div>
          <p>Your cart is empty</p>
          <Link
            href="/"
            className="mt-4 text-[#C9A15A] font-medium underline"
          >
            Continue Shopping
          </Link>
        </div>
      ) : (
        <div className="px-4 py-4 space-y-3">
          {cart.map((item) => (
            <div
              key={item.id}
              className="bg-[#241A12] border border-[#3D2C1E] rounded-xl p-4 flex items-center gap-3 shadow-sm"
            >
              <input
                type="checkbox"
                checked={selected.includes(item.id)}
                onChange={() => toggleSelect(item.id)}
                className="w-5 h-5 accent-[#C9A15A]"
              />

              <div
                className={`w-16 h-16 rounded-lg bg-gradient-to-br ${item.color} flex-shrink-0`}
              />

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#F3E7D8] truncate">
                  {item.title}
                </p>
                <p className="text-[#C9A15A] font-semibold mt-1">
                  Rs {item.price}
                </p>

                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2 border border-[#3D2C1E] rounded-full px-2 py-1">
                    <button
                      onClick={() =>
                        updateQuantity(item.id, item.quantity - 1)
                      }
                      className="w-6 h-6 flex items-center justify-center text-[#B8A48F]"
                    >
                      −
                    </button>
                    <span className="text-sm w-5 text-center text-[#F3E7D8]">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        updateQuantity(item.id, item.quantity + 1)
                      }
                      className="w-6 h-6 flex items-center justify-center text-[#B8A48F]"
                    >
                      +
                    </button>
                  </div>

                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-red-400 text-3xl"
                  >
                    🗑
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#241A12] border-t border-[#3D2C1E] px-4 py-3 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selected.length === cart.length && cart.length > 0}
              onChange={toggleSelectAll}
              className="w-5 h-5 accent-[#C9A15A]"
            />
            <span className="text-sm text-[#B8A48F]">All</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-[#8A7461]">Subtotal</p>
              <p className="text-[#C9A15A] font-bold text-lg">
                Rs {subtotal}
              </p>
            </div>
            <button
              onClick={() => {
                if (!user) {
                  alert("Please sign in to check out");
                  return;
                }
                if (selectedItems.length === 0) return;
                setShowAddressForm(true);
              }}
              disabled={selectedItems.length === 0 || placing}
              className="bg-gradient-to-r from-[#8B5E2E] to-[#D9A94D] text-[#1C130D] font-semibold px-6 py-3 rounded-full disabled:opacity-40"
            >
              {placing ? "Placing..." : `Check Out (${selectedItems.length})`}
            </button>
          </div>
        </div>
      )}

      {/* Address & Payment Form */}
      {showAddressForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-[#241A12] border border-[#3D2C1E] w-full sm:w-96 sm:rounded-2xl rounded-t-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4 text-[#F3E7D8]">
              Delivery Details
            </h2>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Full Name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-[#1C130D] border border-[#3D2C1E] rounded-lg px-4 py-2 text-sm text-[#F3E7D8] placeholder-[#8A7461]"
              />
              <input
                type="text"
                placeholder="Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-[#1C130D] border border-[#3D2C1E] rounded-lg px-4 py-2 text-sm text-[#F3E7D8] placeholder-[#8A7461]"
              />
              <input
                type="text"
                placeholder="Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-[#1C130D] border border-[#3D2C1E] rounded-lg px-4 py-2 text-sm text-[#F3E7D8] placeholder-[#8A7461]"
              />
              <input
                type="text"
                placeholder="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-[#1C130D] border border-[#3D2C1E] rounded-lg px-4 py-2 text-sm text-[#F3E7D8] placeholder-[#8A7461]"
              />

              <div>
                <p className="text-sm font-medium text-[#F3E7D8] mb-2">
                  Payment Method
                </p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 border border-[#3D2C1E] rounded-lg px-4 py-2 cursor-pointer">
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === "COD"}
                      onChange={() => setPaymentMethod("COD")}
                    />
                    <span className="text-sm text-[#F3E7D8]">Cash on Delivery</span>
                  </label>
                  <label className="flex items-center gap-2 border border-[#3D2C1E] rounded-lg px-4 py-2 cursor-pointer">
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === "JazzCash/EasyPaisa"}
                      onChange={() => setPaymentMethod("JazzCash/EasyPaisa")}
                    />
                    <span className="text-sm text-[#F3E7D8]">JazzCash / EasyPaisa</span>
                  </label>
                  <label className="flex items-center gap-2 border border-[#3D2C1E] rounded-lg px-4 py-2 cursor-pointer">
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === "Bank Transfer"}
                      onChange={() => setPaymentMethod("Bank Transfer")}
                    />
                    <span className="text-sm text-[#F3E7D8]">Bank Transfer</span>
                  </label>
                </div>

                {paymentMethod === "JazzCash/EasyPaisa" && (
                  <div className="mt-3 bg-[#1C130D] border border-[#3D2C1E] rounded-xl p-4 text-sm text-[#F3E7D8] space-y-3">
                    <p className="text-xs text-[#8A7461]">
                      Send Rs {subtotal} to one of these accounts, then tap
                      Place Order.
                    </p>
                    <div>
                      <p className="font-medium text-[#C9A15A]">JazzCash</p>
                      <p>{PLATFORM_PAYMENT.jazzcash.title}</p>
                      <p className="font-semibold">
                        {PLATFORM_PAYMENT.jazzcash.number}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-[#C9A15A]">EasyPaisa</p>
                      <p>{PLATFORM_PAYMENT.easypaisa.title}</p>
                      <p className="font-semibold">
                        {PLATFORM_PAYMENT.easypaisa.number}
                      </p>
                    </div>
                  </div>
                )}

                {paymentMethod === "Bank Transfer" && (
                  <div className="mt-3 bg-[#1C130D] border border-[#3D2C1E] rounded-xl p-4 text-sm text-[#F3E7D8] space-y-1">
                    <p className="text-xs text-[#8A7461] mb-2">
                      Send Rs {subtotal} to this account, then tap Place Order.
                    </p>
                    <p className="font-medium text-[#C9A15A]">{PLATFORM_PAYMENT.bank.bankName}</p>
                    <p>{PLATFORM_PAYMENT.bank.title}</p>
                    <p className="font-semibold">
                      {PLATFORM_PAYMENT.bank.accountNumber}
                    </p>
                  </div>
                )}

                {paymentMethod !== "COD" && (
                  <input
                    type="text"
                    placeholder="Transaction ID (after sending payment)"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    className="w-full bg-[#1C130D] border border-[#3D2C1E] rounded-lg px-4 py-2 text-sm text-[#F3E7D8] placeholder-[#8A7461] mt-4"
                  />
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddressForm(false)}
                className="flex-1 border border-[#3D2C1E] text-[#B8A48F] py-3 rounded-full font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCheckout}
                disabled={
                  placing || !customerName || !phone || !address || !city || (paymentMethod !== "COD" && !transactionId)
                }
                className="flex-1 bg-gradient-to-r from-[#8B5E2E] to-[#D9A94D] text-[#1C130D] py-3 rounded-full font-medium disabled:opacity-40"
              >
                {placing ? "Placing..." : "Place Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}