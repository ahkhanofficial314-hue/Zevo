"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabaseClient";

export default function SellerOnboarding() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [shopName, setShopName] = useState("");
  const [bankTitle, setBankTitle] = useState("");
  const [bankNumber, setBankNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [jazzcash, setJazzcash] = useState("");
  const [easypaisa, setEasypaisa] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setChecking(false);
      return;
    }

    const checkExistingRole = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (data?.role === "seller") {
        router.push("/seller/dashboard");
        return;
      }
      if (data?.role === "admin") {
        router.push("/admin");
        return;
      }

      setChecking(false);
    };

    checkExistingRole();
  }, [user, authLoading]);

  const switchAccount = async () => {
    await signOut();
    router.push("/seller/login");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!user) {
      setError("Please Sign in First");
      return;
    }
    if (!shopName || !bankTitle || !bankNumber || !bankName) {
      setError("Shop name and bank details are required");
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        role: "seller",
        shop_name: shopName,
        bank_account_title: bankTitle,
        bank_account_number: bankNumber,
        bank_name: bankName,
        jazzcash_number: jazzcash || null,
        easypaisa_number: easypaisa || null,
      })
      .eq("id", user.id);

    setLoading(false);

    if (updateError) {
      console.error(updateError);
      setError("Something wents wrong, please try again");
      return;
    }

    router.push("/seller/dashboard");
  };

  if (authLoading || checking) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <p className="text-gray-600 mb-4">
          Please Sign in to to Become a Seller
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => router.push("/seller/login")}
            className="border border-gray-200 text-gray-700 font-medium px-6 py-3 rounded-full"
          >
            Sign In
          </button>
          <button
            onClick={() => router.push("/seller/signup")}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium px-6 py-3 rounded-full"
          >
            Sign Up
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/60 border border-gray-100 p-8">
          <div className="flex items-center justify-between bg-indigo-50 rounded-xl px-4 py-3 mb-5">
            <p className="text-xs text-gray-600 truncate">
              Logged in: <span className="font-medium">{user.email}</span>
            </p>
            <button
              type="button"
              onClick={switchAccount}
              className="text-xs text-indigo-600 font-medium ml-3 whitespace-nowrap"
            >
              Switch account
            </button>
          </div>

          <h1 className="text-2xl font-semibold text-gray-900">
            Set up your shop
          </h1>
          <p className="text-sm text-gray-500 mt-1 mb-6">
            Tell us about your shop and how you'd like to get paid
          </p>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Shop name
              </label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. ZEVO"
              />
            </div>

            <div className="pt-2 border-t border-gray-100">
              <p className="text-sm font-medium text-gray-700 mb-3 mt-4">
                Bank details
              </p>

              <div className="space-y-4">
                <input
                  type="text"
                  value={bankTitle}
                  onChange={(e) => setBankTitle(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Account title"
                />
                <input
                  type="text"
                  value={bankNumber}
                  onChange={(e) => setBankNumber(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Account number / IBAN"
                />
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Bank name"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <p className="text-sm font-medium text-gray-700 mb-3 mt-4">
                Mobile wallet (optional)
              </p>

              <div className="space-y-4">
                <input
                  type="text"
                  value={jazzcash}
                  onChange={(e) => setJazzcash(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="JazzCash number"
                />
                <input
                  type="text"
                  value={easypaisa}
                  onChange={(e) => setEasypaisa(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="EasyPaisa number"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-3 rounded-xl shadow-lg shadow-indigo-200 hover:shadow-xl transition-shadow disabled:opacity-50 mt-2"
            >
              {loading ? "Saving..." : "Complete setup"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}