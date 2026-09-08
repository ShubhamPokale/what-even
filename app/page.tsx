export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16 bg-gradient-to-br from-white to-gray-50">
      <div className="max-w-3xl mx-auto text-center space-y-8">
        {/* Logo/Brand */}
        <div className="mb-8">
          <div className="inline-block p-4 bg-black/5 rounded-2xl">
            <span className="text-4xl">🚀</span>
          </div>
        </div>

        {/* Badge */}
        <div className="inline-block px-4 py-1.5 bg-black/5 rounded-full text-sm font-medium text-gray-700">
          Coming Soon
        </div>

        {/* Main Heading */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
          Something Amazing is
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
            Coming Your Way
          </span>
        </h1>

        {/* Description */}
        <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
          We are going to build a website that **should not exist**.
          Get ready for a revolutionary experience.
        </p>

        {/* Email Signup */}
        <div className="max-w-sm mx-auto mt-8">
          <form className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              required
            />
            <button
              type="submit"
              className="px-6 py-3 bg-black text-white rounded-xl font-medium hover:bg-gray-800 transition whitespace-nowrap"
            >
              Notify Me
            </button>
          </form>
          <p className="text-sm text-gray-500 mt-3">
            No spam, unsubscribe anytime.
          </p>
        </div>

        {/* Social Proof / Stats */}
        <div className="flex flex-wrap justify-center gap-8 mt-12 pt-8 border-t border-gray-200/50">
          <div>
            <div className="text-2xl font-bold">500+</div>
            <div className="text-sm text-gray-500">Early Signups</div>
          </div>
          <div>
            <div className="text-2xl font-bold">4.9★</div>
            <div className="text-sm text-gray-500">Beta Rating</div>
          </div>
          <div>
            <div className="text-2xl font-bold">10+</div>
            <div className="text-sm text-gray-500">Countries</div>
          </div>
        </div>
      </div>
    </main>
  );
}