function ResumePreview({ formData }) {

  // Split skills string into an array
  const skillsList = formData.skills
    ? formData.skills.split(',').map(s => s.trim()).filter(Boolean)
    : []

  // Split projects by new line
  const projectsList = formData.projects
    ? formData.projects.split('\n').filter(Boolean)
    : []

  // Split experience by new line
  const experienceList = formData.experience
    ? formData.experience.split('\n').filter(Boolean)
    : []

  return (
    <div className="bg-white shadow-xl rounded-2xl overflow-hidden">

      {/* Preview Label */}
      <div className="bg-blue-600 text-white text-center py-2 text-sm font-medium">
        Live Preview
      </div>

      {/* Resume Content */}
      <div className="p-8 font-serif text-gray-800" id="resume-preview">

        {/* Header — Name & Role */}
        <div className="text-center border-b-2 border-gray-800 pb-4 mb-4">
          <h1 className="text-3xl font-bold tracking-wide">
            {formData.fullName || 'Your Name'}
          </h1>
          {formData.jobRole && (
            <p className="text-blue-600 font-semibold text-lg mt-1">
              {formData.jobRole}
            </p>
          )}

          {/* Contact Info */}
          <div className="flex flex-wrap justify-center gap-4 mt-3 
                          text-sm text-gray-600">
            {formData.email && <span>📧 {formData.email}</span>}
            {formData.phone && <span>📞 {formData.phone}</span>}
            {formData.linkedin && (
              <span>🔗 <a href={formData.linkedin} 
                className="text-blue-500 hover:underline">LinkedIn</a>
              </span>
            )}
            {formData.github && (
              <span>💻 <a href={formData.github} 
                className="text-blue-500 hover:underline">GitHub</a>
              </span>
            )}
          </div>
        </div>

        {/* Education Section */}
        {(formData.degree || formData.college) && (
          <section className="mb-4">
            <h2 className="text-base font-bold uppercase tracking-widest 
                           border-b border-gray-400 pb-1 mb-2 text-gray-700">
              Education
            </h2>
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold">{formData.degree}</p>
                <p className="text-gray-600 text-sm">{formData.college}</p>
              </div>
              <div className="text-right text-sm text-gray-600">
                {formData.gradYear && <p>{formData.gradYear}</p>}
                {formData.gpa && <p>GPA: {formData.gpa}</p>}
              </div>
            </div>
          </section>
        )}

        {/* Skills Section */}
        {skillsList.length > 0 && (
          <section className="mb-4">
            <h2 className="text-base font-bold uppercase tracking-widest 
                           border-b border-gray-400 pb-1 mb-2 text-gray-700">
              Skills
            </h2>
            <div className="flex flex-wrap gap-2">
              {skillsList.map((skill, index) => (
                <span key={index}
                  className="bg-blue-50 text-blue-700 border border-blue-200 
                             px-3 py-1 rounded-full text-sm font-medium">
                  {skill}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Experience Section */}
        {experienceList.length > 0 && (
          <section className="mb-4">
            <h2 className="text-base font-bold uppercase tracking-widest 
                           border-b border-gray-400 pb-1 mb-2 text-gray-700">
              Experience
            </h2>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
              {experienceList.map((exp, index) => (
                <li key={index}>{exp}</li>
              ))}
            </ul>
          </section>
        )}

        {/* Projects Section */}
        {projectsList.length > 0 && (
          <section className="mb-4">
            <h2 className="text-base font-bold uppercase tracking-widest 
                           border-b border-gray-400 pb-1 mb-2 text-gray-700">
              Projects
            </h2>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
              {projectsList.map((project, index) => (
                <li key={index}>{project}</li>
              ))}
            </ul>
          </section>
        )}

        {/* Empty State */}
        {!formData.fullName && !formData.email && (
          <div className="text-center text-gray-400 py-16">
            <p className="text-4xl mb-3">📄</p>
            <p className="text-sm">Start filling the form to see your resume here</p>
          </div>
        )}

      </div>
    </div>
  )
}

export default ResumePreview