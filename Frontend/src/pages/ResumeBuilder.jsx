import { useState } from 'react'
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
        <div>
          <ResumeForm formData={formData} setFormData={setFormData} />

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