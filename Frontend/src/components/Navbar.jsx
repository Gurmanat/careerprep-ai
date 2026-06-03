import { Link } from 'react-router-dom'

function Navbar() {
  return (
    <nav className="bg-white shadow-md px-8 py-4 flex justify-between items-center">
      
      {/* Logo */}
      <Link to="/" className="text-2xl font-bold text-blue-600">
        CareerPrep AI 🚀
      </Link>

      {/* Navigation Links */}
      <div className="flex gap-6">
        <Link 
          to="/" 
          className="text-gray-600 hover:text-blue-600 font-medium transition">
          Home
        </Link>
        <Link 
          to="/resume" 
          className="text-gray-600 hover:text-blue-600 font-medium transition">
          Resume Builder
        </Link>
        <Link 
          to="/interview" 
          className="text-gray-600 hover:text-blue-600 font-medium transition">
          Interview Coach
        </Link>
      </div>

    </nav>
  )
}

export default Navbar