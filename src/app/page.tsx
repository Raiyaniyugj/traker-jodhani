import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-serif font-semibold tracking-wide text-xl text-neutral-900"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
              <path d="M4 9L8 3H16L20 9L12 21L4 9Z" fill="black" />
              <path d="M4 9H20" stroke="white" strokeWidth="1" />
              <path d="M8 3L12 9L16 3" stroke="white" strokeWidth="1" />
              <path d="M4 9L12 21L20 9" stroke="white" strokeWidth="1" />
            </svg>
            Trackerz
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-neutral-600 hover:text-black transition"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="text-sm bg-black text-white rounded-md px-4 py-2 font-medium hover:bg-neutral-800 transition"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="flex-1">
        <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
          <h1 className="font-serif font-semibold text-4xl sm:text-5xl max-w-2xl mx-auto leading-tight text-neutral-900">
            Jewelry production tracking, from order to delivery.
          </h1>
          <p className="text-neutral-500 mt-5 max-w-xl mx-auto leading-relaxed">
            Trackerz gives your workshop one dashboard for every order — CAD, casting, stone setting, polishing, QC, and shipping — with live tracking links your customers can watch too.
          </p>

          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              href="/signup"
              className="bg-black text-white rounded-md px-6 py-3 text-sm font-medium hover:bg-neutral-800 transition"
            >
              Start Free Trial
            </Link>
            <Link
              href="/login"
              className="border border-neutral-300 rounded-md px-6 py-3 text-sm font-medium hover:bg-white transition bg-transparent"
            >
              Sign In
            </Link>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="max-w-5xl mx-auto px-6 pb-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-2xs">
              <h3 className="font-medium text-neutral-900 mb-1.5">
                Master Production Dashboard
              </h3>
              <p className="text-sm text-neutral-500">
                Track every order from New Order to Delivered on one Kanban board, with revenue and profit at a glance.
              </p>
            </div>

            <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-2xs">
              <h3 className="font-medium text-neutral-900 mb-1.5">
                Role-based stage views
              </h3>
              <p className="text-sm text-neutral-500">
                CAD designers and manufacturers each get a focused view of only the pipeline steps assigned to their role.
              </p>
            </div>

            <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-2xs">
              <h3 className="font-medium text-neutral-900 mb-1.5">
                Customer tracking links
              </h3>
              <p className="text-sm text-neutral-500">
                Give customers a live link to watch their piece move through production — no login required.
              </p>
            </div>

            <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-2xs">
              <h3 className="font-medium text-neutral-900 mb-1.5">
                Team access control
              </h3>
              <p className="text-sm text-neutral-500">
                Add your team by email and assign exactly the stage access they need.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing Card */}
        <section className="max-w-5xl mx-auto px-6 pb-24">
          <div className="bg-white border border-neutral-200 rounded-xl p-10 text-center shadow-2xs">
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide">
              Simple pricing
            </p>
            <p className="font-serif font-semibold text-4xl mt-2 text-neutral-900">
              ₹5,000<span className="text-lg text-neutral-400 font-sans">/year</span>
            </p>
            <p className="text-sm text-neutral-500 mt-2">
              24-hour free trial, then full access to all features for 1 year. Unlimited orders and team members.
            </p>
            <Link
              href="/signup"
              className="inline-block mt-6 bg-black text-white rounded-md px-6 py-3 text-sm font-medium hover:bg-neutral-800 transition"
            >
              Start 24-Hour Free Trial
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 py-8 bg-white">
        <p className="text-center text-xs text-neutral-400">
          © {new Date().getFullYear()} Trackerz
        </p>
      </footer>
    </div>
  );
}
