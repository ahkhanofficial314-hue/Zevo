import Link from "next/link";

export default function SellerVerify() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/60 border border-gray-100 p-8">
          <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-5 text-3xl">
            📧
          </div>
          <h1 className="text-xl font-semibold text-gray-900">
            Check your email
          </h1>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            We've sent a verification link to your email address. Click the
            link to activate your seller account.
          </p>

          <Link
            href="/seller/login"
            className="inline-block mt-6 text-indigo-600 font-medium text-sm hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}