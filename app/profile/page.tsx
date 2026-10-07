"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabaseClient";

export default function MyProfile() {
  const { user, loading: authLoading } = useAuth();

  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) {
        setFullName(data.full_name || "");
        setBio(data.bio || "");
        setAvatarUrl(data.avatar_url || "");
      }
      setLoading(false);
    };

    loadProfile();
  }, [user]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);

    const fileExt = file.name.split(".").pop();
    const fileName = `avatar-${user.id}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("images")
      .upload(fileName, file);

    if (uploadError) {
      console.error("Upload error:", uploadError);
      alert("Image upload failed");
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("images").getPublicUrl(fileName);
    setAvatarUrl(data.publicUrl);
    setUploading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        bio,
        avatar_url: avatarUrl,
      })
      .eq("id", user.id);

    setSaving(false);

    if (error) {
      console.error(error);
      alert("Could not save your changes");
      return;
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
        <p className="text-[#B8A48F] mb-4">Please sign in to view your profile</p>
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
        <h1 className="text-lg font-semibold text-[#F3E7D8]">My Profile</h1>
        <div className="w-6" />
      </div>

      <div className="px-4 py-6 max-w-md mx-auto">
        {/* Avatar */}
        <div className="flex flex-col items-center mb-6">
          <label className="cursor-pointer">
            <div className="w-24 h-24 rounded-full bg-[#241A12] overflow-hidden border-4 border-[#3D2C1E] shadow-lg">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl text-[#6E5B49]">
                  👤
                </div>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </label>
          <p className="text-xs text-[#8A7461] mt-2">
            {uploading ? "Uploading..." : "Tap to change photo"}
          </p>
        </div>

        {/* Form */}
        <div className="bg-[#241A12] border border-[#3D2C1E] rounded-xl p-5 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#F3E7D8] mb-1.5">
              Full name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-[#1C130D] border border-[#3D2C1E] rounded-lg px-4 py-2.5 text-sm text-[#F3E7D8]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#F3E7D8] mb-1.5">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="Tell us about yourself"
              className="w-full bg-[#1C130D] border border-[#3D2C1E] rounded-lg px-4 py-2.5 text-sm text-[#F3E7D8] placeholder-[#6E5B49]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#F3E7D8] mb-1.5">
              Email
            </label>
            <input
              type="text"
              value={user.email}
              disabled
              className="w-full bg-[#1C130D] border border-[#3D2C1E] rounded-lg px-4 py-2.5 text-sm text-[#6E5B49]"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving || uploading}
            className="w-full bg-gradient-to-r from-[#8B5E2E] to-[#D9A94D] text-[#1C130D] font-semibold py-3 rounded-xl disabled:opacity-50"
          >
            {saving ? "Saving..." : saved ? "Saved ✓" : "Save Changes"}
          </button>
        </div>
      </div>
    </main>
  );
}