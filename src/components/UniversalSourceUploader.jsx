import React, { useState, useRef } from 'react'

const SOURCE_TABS = [
  { id: 'youtube', label: 'YouTube Video', icon: '▶', desc: 'Extract subtitles and video lessons' },
  { id: 'pdf', label: 'PDF Document', icon: '📄', desc: 'Textbooks, research papers & slides' },
  { id: 'pptx', label: 'PowerPoint', icon: '📊', desc: 'Lecture slide decks (.pptx)' },
  { id: 'docx', label: 'Word Document', icon: '📝', desc: 'Notes & assignment briefs (.docx)' },
  { id: 'image', label: 'Image / OCR', icon: '🖼️', desc: 'Diagrams, whiteboard photos & screenshots' },
  { id: 'audio', label: 'Audio / Lecture', icon: '🎙️', desc: 'Voice notes, podcasts & recordings' },
  { id: 'url', label: 'Website URL', icon: '🌐', desc: 'Online articles, blogs & documentation' },
  { id: 'notes', label: 'Paste Notes', icon: '✍️', desc: 'Directly type or paste study notes' },
]

export default function UniversalSourceUploader({
  apiBase,
  onSourceLoaded,
  onError,
  isProcessing,
  setIsProcessing,
}) {
  const [selectedTab, setSelectedTab] = useState('youtube')

  // YouTube state
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [availableLanguages, setAvailableLanguages] = useState([])
  const [selectedLang, setSelectedLang] = useState('')
  const [loadingLangs, setLoadingLangs] = useState(false)

  // Web URL state
  const [webUrl, setWebUrl] = useState('')

  // Text notes state
  const [notesTitle, setNotesTitle] = useState('')
  const [notesContent, setNotesContent] = useState('')

  // File state
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const fileInputRef = useRef(null)

  // Status message
  const [statusMessage, setStatusMessage] = useState('')

  // YouTube ID extractor
  const extractVideoId = (url) => {
    try {
      const parsed = new URL(url)
      if (parsed.hostname.includes('youtube.com')) {
        if (parsed.pathname === '/watch') return parsed.searchParams.get('v')
        if (parsed.pathname.startsWith('/shorts/')) return parsed.pathname.split('/shorts/')[1].split('/')[0]
      }
      if (parsed.hostname.includes('youtu.be')) {
        return parsed.pathname.slice(1).split('/')[0]
      }
    } catch {
      return null
    }
    return null
  }

  // Handle YouTube Language retrieval
  const handleFetchLanguages = async () => {
    if (!youtubeUrl.trim()) {
      onError('Please paste a YouTube URL first.')
      return
    }
    const videoId = extractVideoId(youtubeUrl)
    if (!videoId) {
      onError('Invalid YouTube URL. Please provide a valid youtube.com or youtu.be link.')
      return
    }

    setLoadingLangs(true)
    onError('')
    setStatusMessage('Scanning available video subtitle tracks...')
    try {
      const res = await fetch(`${apiBase}/transcript-languages/${videoId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Could not find subtitles for this video.')

      const langs = Array.isArray(data.languages) ? data.languages : []
      setAvailableLanguages(langs)
      if (langs.length > 0) {
        setSelectedLang(langs[0].code)
        setStatusMessage(`Found ${langs.length} subtitle tracks! Select your preferred language.`)
      } else {
        onError('No transcripts available for this video.')
      }
    } catch (err) {
      onError(err.message || 'Failed to retrieve transcript languages.')
      setStatusMessage('')
    } finally {
      setLoadingLangs(false)
    }
  }

  // Handle YouTube Process
  const handleProcessYouTube = async () => {
    const videoId = extractVideoId(youtubeUrl)
    if (!videoId) {
      onError('Invalid YouTube URL.')
      return
    }

    setIsProcessing(true)
    setStatusMessage('Extracting video transcript...')
    onError('')
    try {
      // Fetch real video title via YouTube oEmbed (no API key required)
      let videoTitle = `YouTube Lesson (${videoId})`
      try {
        const oembedRes = await fetch(
          `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
        )
        if (oembedRes.ok) {
          const oembedData = await oembedRes.json()
          if (oembedData.title) videoTitle = oembedData.title
        }
      } catch (_) {
        // silently fall back to ID-based title
      }

      const res = await fetch(`${apiBase}/transcript`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: youtubeUrl, language: selectedLang || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to extract transcript.')

      setStatusMessage('Transcript extracted successfully!')
      onSourceLoaded({
        title: videoTitle,
        sourceType: 'youtube',
        sourceUrl: youtubeUrl,
        videoId,
        text: data.transcript,
        language: data.language || 'English',
      })
    } catch (err) {
      onError(err.message || 'Could not fetch video transcript.')
      setStatusMessage('')
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle Website URL extraction
  const handleProcessUrl = async () => {
    if (!webUrl.trim() || !webUrl.startsWith('http')) {
      onError('Please enter a valid URL starting with http:// or https://')
      return
    }

    setIsProcessing(true)
    setStatusMessage('Fetching and parsing webpage content...')
    onError('')
    try {
      const res = await fetch(`${apiBase}/sources/url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webUrl }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to extract webpage.')

      setStatusMessage('Webpage parsed successfully!')
      onSourceLoaded({
        title: data.title || 'Web Article',
        sourceType: 'website',
        sourceUrl: webUrl,
        text: data.text,
        wordCount: data.word_count,
      })
    } catch (err) {
      onError(err.message || 'Could not process website URL.')
      setStatusMessage('')
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle Notes input
  const handleProcessNotes = () => {
    if (!notesContent.trim() || notesContent.trim().length < 20) {
      onError('Please enter at least a few sentences of study notes.')
      return
    }

    setStatusMessage('Notes processed!')
    onSourceLoaded({
      title: notesTitle.trim() || 'My Study Notes',
      sourceType: 'notes',
      text: notesContent.trim(),
      wordCount: notesContent.trim().split(/\s+/).length,
    })
  }

  // Handle File Upload (PDF, Word, PPTX, Image, Audio)
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
    else if (e.type === 'dragleave') setDragActive(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.data.files && e.data.files[0]) {
      setSelectedFile(e.data.files[0])
    }
  }

  const handleProcessFile = async () => {
    if (!selectedFile) {
      onError('Please select or drop a file to upload.')
      return
    }

    if (selectedFile.size > 15 * 1024 * 1024) {
      onError('File size exceeds the 15MB limit.')
      return
    }

    setIsProcessing(true)
    setStatusMessage(`Uploading and processing ${selectedFile.name}...`)
    onError('')

    const formData = new FormData()
    formData.append('file', selectedFile)

    try {
      const res = await fetch(`${apiBase}/sources/upload`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'File processing failed.')

      setStatusMessage(`${selectedFile.name} processed successfully!`)
      onSourceLoaded({
        title: data.filename || selectedFile.name,
        sourceType: data.source_type,
        text: data.text,
        wordCount: data.word_count,
        pageCount: data.page_count,
        slideCount: data.slide_count,
      })
      setSelectedFile(null)
    } catch (err) {
      onError(err.message || 'Error processing document.')
      setStatusMessage('')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="universal-uploader-card">
      <div className="uploader-header">
        <div>
          <span className="panel-kicker">STEP 1: SELECT STUDY MATERIAL</span>
          <h2 className="uploader-title">Universal Learning Inputs</h2>
          <p className="uploader-subtitle">
            Upload textbooks, slide presentations, lecture audio, diagrams, or paste YouTube and article links.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="source-tabs-grid">
        {SOURCE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`source-tab-btn ${selectedTab === tab.id ? 'active' : ''}`}
            onClick={() => {
              setSelectedTab(tab.id)
              setStatusMessage('')
            }}
          >
            <span className="source-tab-icon">{tab.icon}</span>
            <span className="source-tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="uploader-body">
        {/* YOUTUBE TAB */}
        {selectedTab === 'youtube' && (
          <div className="tab-pane">
            <p className="tab-instruction">Paste a YouTube lecture or tutorial link to extract lesson subtitles.</p>
            <div className="input-group-row">
              <span className="input-prefix-icon">🔗</span>
              <input
                type="url"
                className="source-text-input"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
              />
              {youtubeUrl && (
                <button type="button" className="clear-btn" onClick={() => setYoutubeUrl('')}>
                  ×
                </button>
              )}
            </div>

            {availableLanguages.length === 0 ? (
              <button
                type="button"
                className="btn-primary-action"
                onClick={handleFetchLanguages}
                disabled={loadingLangs || isProcessing}
              >
                {loadingLangs ? 'Searching Subtitles...' : 'Scan Video Subtitles →'}
              </button>
            ) : (
              <div className="youtube-options-box">
                <div className="youtube-lang-row">
                  <label className="field-label">Subtitle Language</label>
                  <select
                    className="source-select"
                    value={selectedLang}
                    onChange={(e) => setSelectedLang(e.target.value)}
                  >
                    {availableLanguages.map((l, idx) => (
                      <option key={idx} value={l.code}>
                        {l.name} {l.is_generated ? '(Auto-generated)' : '(Official)'}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  className="btn-primary-action"
                  onClick={handleProcessYouTube}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Extracting Content...' : 'Process Video & Open Workspace →'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* FILE UPLOAD TABS (PDF, PPTX, DOCX, IMAGE, AUDIO) */}
        {['pdf', 'pptx', 'docx', 'image', 'audio'].includes(selectedTab) && (
          <div className="tab-pane">
            <div
              className={`dropzone-area ${dragActive ? 'drag-over' : ''} ${selectedFile ? 'has-file' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: 'none' }}
                onChange={handleFileChange}
                accept={
                  selectedTab === 'pdf'
                    ? '.pdf'
                    : selectedTab === 'pptx'
                    ? '.pptx,.ppt'
                    : selectedTab === 'docx'
                    ? '.docx,.doc'
                    : selectedTab === 'image'
                    ? '.png,.jpg,.jpeg,.webp'
                    : '.mp3,.wav,.m4a,.ogg'
                }
              />
              <div className="dropzone-inner">
                <span className="dropzone-icon">
                  {selectedTab === 'pdf' && '📄'}
                  {selectedTab === 'pptx' && '📊'}
                  {selectedTab === 'docx' && '📝'}
                  {selectedTab === 'image' && '🖼️'}
                  {selectedTab === 'audio' && '🎙️'}
                </span>
                {selectedFile ? (
                  <div className="file-info-badge">
                    <strong>{selectedFile.name}</strong>
                    <span>({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
                    <p className="click-change-txt">Click or drag a different file to replace</p>
                  </div>
                ) : (
                  <>
                    <p className="dropzone-title">
                      Drag & Drop your <strong>{selectedTab.toUpperCase()}</strong> file here, or{' '}
                      <span className="browse-link">browse files</span>
                    </p>
                    <span className="dropzone-hint">
                      Maximum file size: 15MB •{' '}
                      {selectedTab === 'image'
                        ? 'Includes AI OCR and diagram understanding'
                        : selectedTab === 'audio'
                        ? 'AI speech-to-text transcription'
                        : 'High-speed document parsing'}
                    </span>
                  </>
                )}
              </div>
            </div>

            {selectedFile && (
              <button
                type="button"
                className="btn-primary-action"
                onClick={handleProcessFile}
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing File with AI...' : `Process ${selectedTab.toUpperCase()} & Load →`}
              </button>
            )}
          </div>
        )}

        {/* WEBSITE URL TAB */}
        {selectedTab === 'url' && (
          <div className="tab-pane">
            <p className="tab-instruction">Extract educational text, articles, or documentation from any web address.</p>
            <div className="input-group-row">
              <span className="input-prefix-icon">🌐</span>
              <input
                type="url"
                className="source-text-input"
                value={webUrl}
                onChange={(e) => setWebUrl(e.target.value)}
                placeholder="https://en.wikipedia.org/wiki/... or online article"
              />
            </div>
            <button
              type="button"
              className="btn-primary-action"
              onClick={handleProcessUrl}
              disabled={isProcessing}
            >
              {isProcessing ? 'Extracting Article...' : 'Extract Webpage Content →'}
            </button>
          </div>
        )}

        {/* PASTE NOTES TAB */}
        {selectedTab === 'notes' && (
          <div className="tab-pane">
            <p className="tab-instruction">Paste class notes, code summaries, or study sheets directly.</p>
            <input
              type="text"
              className="source-text-input notes-title-input"
              value={notesTitle}
              onChange={(e) => setNotesTitle(e.target.value)}
              placeholder="Topic Title (e.g. Operating Systems Chapter 4)"
            />
            <textarea
              className="source-textarea"
              rows={8}
              value={notesContent}
              onChange={(e) => setNotesContent(e.target.value)}
              placeholder="Paste or write your study notes here..."
            />
            <button type="button" className="btn-primary-action" onClick={handleProcessNotes}>
              Open in Study Workspace →
            </button>
          </div>
        )}
      </div>

      {statusMessage && (
        <div className="uploader-status-banner">
          <span className="status-spinner">✓</span>
          <span>{statusMessage}</span>
        </div>
      )}
    </div>
  )
}
