import { useState, useEffect } from 'react'
import axios from 'axios'
import ResumeForm from '../components/ResumeForm'
import ResumePreview from '../components/ResumePreview'
import html2pdf from 'html2pdf.js'

const initialFormData = {
  fullName: '', email: '', phone: '',
  linkedin: '', github: '', jobRole: '',
  degree: '', college: '', gradYear: '', gpa: '',
  skills: '', projects: '', experience: ''
}

function ResumeBuilder() {
  const [formData, setFormData] = useState(initialFormData)

//   useEffect(() => {
//   localStorage.setItem(
//     "careerprep_resume",
//     JSON.stringify(formData)
//   )
// }, [formData])

useEffect(() => {
  console.log("Saving resume...", formData)

  localStorage.setItem(
    "careerprep_resume",
    JSON.stringify(formData)
  )
}, [formData])

  const [jobDescription, setJobDescription] = useState('')
  const [matchResult, setMatchResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [enhancing, setEnhancing] = useState(false)

  //Call backend to enhance resume
  const handleEnhance = async () => {
    setEnhancing(true)
    try {
      const res = await axios.post('http://localhost:8000/resume/enhance', formData)
      const enhanced = res.data.enhanced

      // Update form with AI-enhanced content
      setFormData(prev => ({
        ...prev,
        skills: enhanced.skills || prev.skills,
        experience: enhanced.experience?.trim() || prev.experience,
        projects: enhanced.projects?.trim() || prev.projects
      }))
      alert('✅ Resume enhanced by AI!')
    } catch (err) {
      alert('❌ Error enhancing resume. Check your API key and backend.')
    }
    setEnhancing(false)
  }

    // Call backend to match with job description
  const handleMatchJD = async () => {
    if (!jobDescription) {
      alert('Please paste a job description first!')
      return
    }
    setLoading(true)
    try {
      const res = await axios.post('http://localhost:8000/resume/match-jd', {
        resume: formData,
        job_description: jobDescription
      })
      setMatchResult(res.data.match)
    } catch (err) {
      alert('❌ Error matching JD. Check your backend.')
    }
    setLoading(false)
  }

  const handleDownload = () => {
    const element = document.getElementById('resume-preview')

    const options = {
        margin : 0.5,
        filename: `${formData.fullName || 'resume'}.pdf`,
        image: {type: 'jpeg', quality: 0.98},
        html2canvas: {scale:2},
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait'}
    }
    html2pdf().set(options).from(element).save()
  }

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-10">
      <h1 className="text-4xl font-extrabold text-center text-gray-800 mb-2">
        Resume Builder
      </h1>
      <p className="text-center text-gray-500 mb-10">
        Fill in your details — preview updates in real time ✨
      </p>

      {/* Two Column Layout */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* LEFT — Form */}
        <div className='space-y-4'>
          <ResumeForm formData={formData} setFormData={setFormData} />

           {/* Enhance Button */}
          <button onClick={handleEnhance} disabled={enhancing}
            className="w-full bg-purple-600 text-white py-4 rounded-xl 
                       text-lg font-semibold hover:bg-purple-700 
                       transition disabled:opacity-50">
            {enhancing ? '⏳ Enhancing...' : '🤖 Enhance with AI'}
          </button>

          {/* JD Match Section */}
          <div className="bg-white rounded-2xl shadow-md p-6 space-y-3">
            <h3 className="text-lg font-bold text-gray-800">
              🎯 Match with Job Description
            </h3>
            <textarea
              value={jobDescription}
              onChange={e => setJobDescription(e.target.value)}
              placeholder="Paste the job description here..."
              rows={5}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 
                         focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <button onClick={handleMatchJD} disabled={loading}
              className="w-full bg-green-600 text-white py-3 rounded-xl 
                         font-semibold hover:bg-green-700 
                         transition disabled:opacity-50">
              {loading ? '⏳ Analyzing...' : '🔍 Analyze Match'}
            </button>
          </div>

          {/* Match Result Card */}
          {matchResult && (
            <div className="bg-white rounded-2xl shadow-md p-6 space-y-3">
              <h3 className="text-lg font-bold text-gray-800">📊 Match Report</h3>

              {/* Score Bar */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">
                    Match Score
                  </span>
                  <span className="text-sm font-bold text-blue-600">
                    {matchResult.match_score}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all"
                    style={{ width: `${matchResult.match_score}%` }}>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-green-600">
                  ✅ Matching Skills:
                </p>
                <p className="text-sm text-gray-600">{matchResult.matching_skills}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-red-500">
                  ⚠️ Missing Skills:
                </p>
                <p className="text-sm text-gray-600">{matchResult.missing_skills}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-600">
                  💡 Suggestion:
                </p>
                <p className="text-sm text-gray-600">{matchResult.suggestion}</p>
              </div>
            </div>
          )}

          {/* Download Button */}
          <button
          onClick={handleDownload}
          className='mt-6 w-full bg-blue-600 text-white py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 transition'>
            ⬇️ Download Resume as PDF
          </button>
        </div>

        {/* RIGHT — Live Preview */}
        <div className="sticky top-6 h-fit">
          <ResumePreview formData={formData} />
        </div>

      </div>
    </div>
  )
}

export default ResumeBuilder