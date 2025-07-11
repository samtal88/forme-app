function Landing() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-6">
        <h1 className="text-6xl font-bold text-primary">ForMe</h1>
        <p className="text-xl text-gray-600 max-w-md">
          Your personal content curator for football fans
        </p>
        <div className="space-y-4">
          <button className="btn-primary w-full max-w-sm">
            Get Started
          </button>
          <p className="text-sm text-gray-500">
            Starting with Twitter, expanding to all platforms
          </p>
        </div>
      </div>
    </div>
  )
}

export default Landing