"use client";

import { useState } from "react";
import { useCart } from "@/lib/CartContext";

export default function CartDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const { cart, cartCount, cartTotal, removeFromCart, updateQuantity } = useCart();

  return (
    <>
      {/* Cart Icon Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="text-xl hover:scale-110 transition-transform relative"
      >
        🛒
        <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
          {cartCount}
        </span>
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-[60]"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-white z-[70] shadow-2xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b">
          <h3 className="text-lg font-bold">Your Cart</h3>
          <button onClick={() => setIsOpen(false)} className="text-2xl">
            ×
          </button>
        </div>

        <div className="p-6 overflow-y-auto" style={{ maxHeight: "calc(100vh - 220px)" }}>
          {cart.length === 0 ? (
            <p className="text-gray-400 text-center py-10">Your cart is empty.</p>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="flex gap-3 mb-4 pb-4 border-b">
                <div
                  className={`w-14 h-14 rounded-lg bg-gradient-to-br ${item.color} flex-shrink-0`}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium line-clamp-2">{item.title}</p>
                  <p className="text-sm text-gray-500 mt-1">Rs {item.price}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-6 h-6 border rounded text-sm"
                    >
                      −
                    </button>
                    <span className="text-sm">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-6 h-6 border rounded text-sm"
                    >
                      +
                    </button>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-xs text-red-500 ml-3"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 border-t p-6 bg-white">
            <div className="flex justify-between mb-4 font-semibold">
              <span>Total</span>
              <span>Rs {cartTotal}</span>
            </div>
            <button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-medium">
              Checkout
            </button>
          </div>
        )}
      </div>
    </>
  );
}