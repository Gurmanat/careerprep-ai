import { Link } from 'react-router-dom'

function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">

      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center text-center py-24 px-6">
        <h1 className="text-5xl font-extrabold text-gray-800 mb-6">
          Land Your Dream Job with <br />
          <span className="text-blue-600">AI-Powered Preparation</span>
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mb-10">
          Build a professional resume and practice interviews with real-time 
          AI feedback on your answers, body language, and voice.
        </p>

        {/* CTA Buttons */}
        <div className="flex gap-4">
          <Link to="/resume"
            className="bg-blue-600 text-white px-8 py-3 rounded-xl 
                       text-lg font-semibold hover:bg-blue-700 transition">
            Build My Resume
          </Link>
          <Link to="/interview"
            className="bg-white text-blue-600 border-2 border-blue-600 
                       px-8 py-3 rounded-xl text-lg font-semibold 
                       hover:bg-blue-50 transition">
            Practice Interview
          </Link>
        </div>
      </div>

      {/* Features Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-16 pb-24">
        
        <div className="bg-white rounded-2xl p-8 shadow-md text-center">
          <div className="text-4xl mb-4">📄</div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            Smart Resume Builder
          </h3>
          <p className="text-gray-500">
            Fill in your details and let AI generate powerful bullet points 
            tailored to your target job role.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-md text-center">
          <div className="text-4xl mb-4">🎙️</div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            AI Interview Coach
          </h3>
          <p className="text-gray-500">
            Practice real interview questions and get detailed feedback 
            on your answers instantly.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-md text-center">
          <div className="text-4xl mb-4">📷</div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            Body Language Analysis
          </h3>
          <p className="text-gray-500">
            AI watches your camera to score your eye contact, posture, 
            and confidence in real time.
          </p>
        </div>

      </div>
    </div>
  )
}

export default Home