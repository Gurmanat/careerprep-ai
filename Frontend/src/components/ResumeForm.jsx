
function ResumeForm({ formData, setFormData }) {

  // Handle input changes for simple fields
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  return (
    <div className="bg-white rounded-2xl shadow-md p-8 space-y-8">
      <h2 className="text-2xl font-bold text-gray-800">📝 Your Details</h2>

      {/* Personal Info */}
      <section>
        <h3 className="text-lg font-semibold text-blue-600 mb-4">
          Personal Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input name="fullName" placeholder="Full Name"
            value={formData.fullName} onChange={handleChange}
            className="border border-gray-300 rounded-xl px-4 py-3 
                       focus:outline-none focus:ring-2 focus:ring-blue-400 w-full" />
          <input name="email" placeholder="Email Address"
            value={formData.email} onChange={handleChange}
            className="border border-gray-300 rounded-xl px-4 py-3 
                       focus:outline-none focus:ring-2 focus:ring-blue-400 w-full" />
          <input name="phone" placeholder="Phone Number"
            value={formData.phone} onChange={handleChange}
            className="border border-gray-300 rounded-xl px-4 py-3 
                       focus:outline-none focus:ring-2 focus:ring-blue-400 w-full" />
          <input name="linkedin" placeholder="LinkedIn URL"
            value={formData.linkedin} onChange={handleChange}
            className="border border-gray-300 rounded-xl px-4 py-3 
                       focus:outline-none focus:ring-2 focus:ring-blue-400 w-full" />
          <input name="github" placeholder="GitHub URL"
            value={formData.github} onChange={handleChange}
            className="border border-gray-300 rounded-xl px-4 py-3 
                       focus:outline-none focus:ring-2 focus:ring-blue-400 w-full" />
          <input name="jobRole" placeholder="Target Job Role (e.g. Data Scientist)"
            value={formData.jobRole} onChange={handleChange}
            className="border border-gray-300 rounded-xl px-4 py-3 
                       focus:outline-none focus:ring-2 focus:ring-blue-400 w-full" />
        </div>
      </section>

      {/* Education */}
      <section>
        <h3 className="text-lg font-semibold text-blue-600 mb-4">
          Education
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input name="degree" placeholder="Degree (e.g. B.Tech CSE)"
            value={formData.degree} onChange={handleChange}
            className="border border-gray-300 rounded-xl px-4 py-3 
                       focus:outline-none focus:ring-2 focus:ring-blue-400 w-full" />
          <input name="college" placeholder="College / University"
            value={formData.college} onChange={handleChange}
            className="border border-gray-300 rounded-xl px-4 py-3 
                       focus:outline-none focus:ring-2 focus:ring-blue-400 w-full" />
          <input name="gradYear" placeholder="Graduation Year"
            value={formData.gradYear} onChange={handleChange}
            className="border border-gray-300 rounded-xl px-4 py-3 
                       focus:outline-none focus:ring-2 focus:ring-blue-400 w-full" />
          <input name="gpa" placeholder="GPA / Percentage"
            value={formData.gpa} onChange={handleChange}
            className="border border-gray-300 rounded-xl px-4 py-3 
                       focus:outline-none focus:ring-2 focus:ring-blue-400 w-full" />
        </div>
      </section>

      {/* Skills */}
      <section>
        <h3 className="text-lg font-semibold text-blue-600 mb-4">
          Skills
        </h3>
        <textarea name="skills"
          placeholder="e.g. Python, Machine Learning, React, SQL, TensorFlow"
          value={formData.skills} onChange={handleChange}
          rows={3}
          className="border border-gray-300 rounded-xl px-4 py-3 
                     focus:outline-none focus:ring-2 focus:ring-blue-400 w-full" />
      </section>

      {/* Projects */}
      <section>
        <h3 className="text-lg font-semibold text-blue-600 mb-4">
          Projects
        </h3>
        <textarea name="projects"
          placeholder="Describe your projects..."
          value={formData.projects} onChange={handleChange}
          rows={4}
          className="border border-gray-300 rounded-xl px-4 py-3 
                     focus:outline-none focus:ring-2 focus:ring-blue-400 w-full" />
      </section>

      {/* Experience */}
      <section>
        <h3 className="text-lg font-semibold text-blue-600 mb-4">
          Experience (Internships / Jobs)
        </h3>
        <textarea name="experience"
          placeholder="Company, Role, Duration — what you did..."
          value={formData.experience} onChange={handleChange}
          rows={4}
          className="border border-gray-300 rounded-xl px-4 py-3 
                     focus:outline-none focus:ring-2 focus:ring-blue-400 w-full" />
      </section>

    </div>
  )
}

export default ResumeForm