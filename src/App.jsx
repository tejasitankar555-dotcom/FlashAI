import { useEffect, useMemo, useState } from 'react'
import './App.css'

import Navbar from './components/Navbar'
import DashboardView from './components/DashboardView'
import UniversalSourceUploader from './components/UniversalSourceUploader'
import UnifiedStudyWorkspace from './components/UnifiedStudyWorkspace'
import LibraryView from './components/LibraryView'
import StudyGroupsView from './components/StudyGroupsView'
import RevisionDashboard from './components/RevisionDashboard'
import ProgressAnalytics from './components/ProgressAnalytics'
import NotificationModal from './components/NotificationModal'

const API_BASE = 'http://127.0.0.1:8000'

const FLASHCARD_LANGUAGES = [
  'English',
  'Hindi',
  'Marathi',
  'Bengali',
  'Gujarati',
  'Tamil',
  'Telugu',
  'Kannada',
  'Malayalam',
  'Punjabi',
  'Urdu',
  'Nepali',
  'Sanskrit',
  'German',
  'French',
  'Spanish',
  'Portuguese',
  'Italian',
  'Japanese',
  'Korean',
  'Chinese',
  'Arabic',
  'Russian',
]

function App() {
  // Navigation & User State
  const [activeNav, setActiveNav] = useState('dashboard')

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const raw = localStorage.getItem('flashai_current_user')
      if (!raw) return null
      const parsed = JSON.parse(raw)
      if (typeof parsed === 'object' && parsed !== null && parsed.email) {
        return parsed
      }
      return null
    } catch {
      return null
    }
  })

  // Auth Form State
  const [authMode, setAuthMode] = useState('login')
  const [authName, setAuthName] = useState('')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  // Study Sets State
  const [studySets, setStudySets] = useState([])
  const [currentStudySet, setCurrentStudySet] = useState(null)

  // Universal Source & Generation State
  const [loadedSource, setLoadedSource] = useState(null)
  const [numberOfCards, setNumberOfCards] = useState(5)
  const [difficulty, setDifficulty] = useState('medium')
  const [flashcardLanguage, setFlashcardLanguage] = useState('English')

  const [isProcessingSource, setIsProcessingSource] = useState(false)
  const [isGeneratingSet, setIsGeneratingSet] = useState(false)
  const [appError, setAppError] = useState('')
  const [appSuccess, setAppSuccess] = useState('')

  // Groups list for sharing
  const [userGroups, setUserGroups] = useState([])

  // Notifications Modal State
  const [isNotifOpen, setIsNotifOpen] = useState(false)

  // Load Saved Study Sets from localStorage (Preserved)
  useEffect(() => {
    if (!currentUser) {
      setStudySets([])
      return
    }

    try {
      const userKey = `flashai_study_sets_${currentUser.email}`
      let saved = JSON.parse(localStorage.getItem(userKey) || 'null')

      // Legacy migration from old key
      if (!Array.isArray(saved)) {
        const legacy = JSON.parse(localStorage.getItem('flashai_study_sets') || '[]')
        saved = Array.isArray(legacy) ? legacy : []
        localStorage.setItem(userKey, JSON.stringify(saved))
      }

      setStudySets(Array.isArray(saved) ? saved : [])
    } catch {
      setStudySets([])
    }
  }, [currentUser])

  // Load User Groups from backend
  const fetchUserGroups = async () => {
    if (!currentUser) return
    try {
      const res = await fetch(`${API_BASE}/groups?user_id=${currentUser.id}`)
      if (res.ok) {
        const data = await res.json()
        setUserGroups(data.groups || [])
      }
    } catch {
      // Backend offline or local fallback
    }
  }

  useEffect(() => {
    fetchUserGroups()
  }, [currentUser])

  // Save study sets helper
  const saveStudySetsToStorage = (updatedSets) => {
    if (!currentUser) return
    const userKey = `flashai_study_sets_${currentUser.email}`
    localStorage.setItem(userKey, JSON.stringify(updatedSets))
    setStudySets(updatedSets)
  }

  // Handle Authentication (Local + Backend sync)
  const handleAuthSubmit = async (e) => {
    e.preventDefault()
    setAuthError('')
    setAuthLoading(true)

    const name = authName.trim()
    const email = authEmail.trim().toLowerCase()
    const password = authPassword

    if (!email || !password) {
      setAuthError('Please enter both email and password.')
      setAuthLoading(false)
      return
    }

    try {
      // Attempt backend authentication
      const endpoint = authMode === 'register' ? '/auth/register' : '/auth/login'
      const payload = authMode === 'register' ? { name, email, password } : { email, password }

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.detail || 'Authentication failed.')
      }

      const authenticatedUser = {
        id: data.id,
        name: data.name,
        email: data.email,
      }

      // Persist current user
      localStorage.setItem('flashai_current_user', JSON.stringify(authenticatedUser))

      // Also update local users array for fallback
      const localUsers = JSON.parse(localStorage.getItem('flashai_users') || '[]')
      if (!localUsers.some((u) => u.email === authenticatedUser.email)) {
        localUsers.push(authenticatedUser)
        localStorage.setItem('flashai_users', JSON.stringify(localUsers))
      }

      setCurrentUser(authenticatedUser)
      setActiveNav('dashboard')
    } catch (err) {
      // Fallback to local storage auth if backend is unreachable
      const localUsers = JSON.parse(localStorage.getItem('flashai_users') || '[]')

      if (authMode === 'register') {
        if (!name) {
          setAuthError('Please enter your name.')
          setAuthLoading(false)
          return
        }
        if (password.length < 6) {
          setAuthError('Password must contain at least 6 characters.')
          setAuthLoading(false)
          return
        }
        if (localUsers.some((u) => u.email === email)) {
          setAuthError('An account with this email already exists.')
          setAuthLoading(false)
          return
        }

        const newUser = { id: Date.now(), name, email, password }
        localUsers.push(newUser)
        localStorage.setItem('flashai_users', JSON.stringify(localUsers))
        localStorage.setItem('flashai_current_user', JSON.stringify(newUser))
        setCurrentUser(newUser)
      } else {
        const found = localUsers.find((u) => u.email === email && u.password === password)
        if (found) {
          localStorage.setItem('flashai_current_user', JSON.stringify(found))
          setCurrentUser(found)
        } else {
          setAuthError(err.message || 'Invalid email or password.')
        }
      }
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('flashai_current_user')
    setCurrentUser(null)
    setStudySets([])
    setCurrentStudySet(null)
    setActiveNav('dashboard')
  }

  // Handle source loaded from UniversalSourceUploader
  const handleSourceLoaded = (source) => {
    setLoadedSource(source)
    setAppError('')
    setAppSuccess(`Loaded "${source.title}" successfully! Configure your options and generate below.`)
  }

  // Generate Flashcards & Summary from loaded source
  const handleGenerateStudySet = async () => {
    if (!loadedSource || !loadedSource.text) {
      setAppError('Please select and process a study source first.')
      return
    }

    setIsGeneratingSet(true)
    setAppError('')
    setAppSuccess('Generating AI summary and flashcards...')

    try {
      // Call Flashcard & Summary endpoints
      const [flashcardsRes, summaryRes] = await Promise.all([
        fetch(`${API_BASE}/generate-flashcards`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcript: loadedSource.text,
            number_of_cards: numberOfCards,
            difficulty,
            language: flashcardLanguage,
          }),
        }),
        fetch(`${API_BASE}/generate-summary`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcript: loadedSource.text,
            language: flashcardLanguage,
          }),
        }),
      ])

      const flashcardsData = await flashcardsRes.json()
      const summaryData = await summaryRes.json()

      if (!flashcardsRes.ok) {
        throw new Error(flashcardsData.detail || 'Flashcard generation failed.')
      }

      const generatedFlashcards = flashcardsData.flashcards || []
      const generatedSummary = summaryData.summary || ''
      const generatedKeyConcepts = summaryData.key_concepts || []

      const newStudySet = {
        id: Date.now(),
        title: loadedSource.title || 'Universal Study Set',
        sourceType: loadedSource.sourceType || 'document',
        sourceUrl: loadedSource.sourceUrl || '',
        videoId: loadedSource.videoId || null,
        language: flashcardLanguage,
        difficulty,
        numberOfCards: generatedFlashcards.length,
        flashcards: generatedFlashcards,
        summary: generatedSummary,
        keyConcepts: generatedKeyConcepts,
        text: loadedSource.text,
        lastQuizScore: null,
        bestScore: 0,
        createdAt: new Date().toISOString(),
      }

      // Add to study sets list
      const updatedSets = [newStudySet, ...studySets]
      saveStudySetsToStorage(updatedSets)

      // Automatically queue cards into Spaced Repetition System (SRS)
      if (currentUser?.id) {
        generatedFlashcards.slice(0, 3).forEach((card, idx) => {
          fetch(`${API_BASE}/revision/card`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: currentUser.id,
              card_id: `${newStudySet.id}_${idx}`,
              study_set_id: String(newStudySet.id),
              question: card.question,
              answer: card.answer,
              options: card.options || [],
              known: false,
            }),
          }).catch(() => {})
        })
      }

      setCurrentStudySet(newStudySet)
      setLoadedSource(null)
      setAppSuccess('Study set created successfully! Welcome to your learning workspace.')
    } catch (err) {
      setAppError(err.message || 'Failed to generate study set.')
    } finally {
      setIsGeneratingSet(false)
    }
  }

  // Open existing study set
  const handleOpenStudySet = (set) => {
    setCurrentStudySet(set)
    setActiveNav('learn')
    setAppError('')
    setAppSuccess('')
  }

  // Delete study set
  const handleDeleteStudySet = (id) => {
    const updated = studySets.filter((s) => s.id !== id)
    saveStudySetsToStorage(updated)
    if (currentStudySet?.id === id) {
      setCurrentStudySet(null)
    }
  }

  // Update study set after quiz or new generation
  const handleSaveStudySet = (updatedSet) => {
    const updatedList = studySets.map((s) => (s.id === updatedSet.id ? updatedSet : s))
    saveStudySetsToStorage(updatedList)
    setCurrentStudySet(updatedSet)
  }

  // Quiz completion handler
  const handleQuizCompleted = async (studySetId, score, total) => {
    const pct = Math.round((score / total) * 100)
    const updatedList = studySets.map((s) => {
      if (s.id !== studySetId) return s
      return {
        ...s,
        lastQuizScore: score,
        bestScore: Math.max(s.bestScore || 0, score),
        lastStudied: new Date().toISOString(),
        lastQuizPercentage: pct,
      }
    })
    saveStudySetsToStorage(updatedList)

    if (currentStudySet?.id === studySetId) {
      setCurrentStudySet((prev) => ({
        ...prev,
        lastQuizScore: score,
        bestScore: Math.max(prev.bestScore || 0, score),
        lastStudied: new Date().toISOString(),
      }))
    }

    // Submit score to all joined groups for real group leaderboards!
    if (userGroups.length > 0 && currentUser) {
      userGroups.forEach((g) => {
        fetch(`${API_BASE}/groups/${g.id}/quiz-submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: currentUser.id,
            user_name: currentUser.name,
            study_set_id: String(studySetId),
            study_set_title: currentStudySet?.title || 'Study Set',
            score,
            total,
          }),
        }).catch(() => {})
      })
    }
  }

  // Share study set to group
  const handleShareToGroup = async (groupId, set) => {
    if (!currentUser) return
    try {
      const res = await fetch(`${API_BASE}/groups/${groupId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          user_name: currentUser.name,
          study_set: set,
        }),
      })
      if (!res.ok) throw new Error('Sharing failed.')
      fetchUserGroups()
    } catch (err) {
      setAppError(err.message || 'Could not share study set.')
    }
  }

  // =========================================================
  // RENDER: AUTHENTICATION SCREEN
  // =========================================================
  if (!currentUser) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <a
            href="#"
            className="brand auth-brand"
            onClick={(e) => e.preventDefault()}
          >
            <span className="brand-mark">✦</span>
            <span>Flash<span>AI</span></span>
          </a>

          <div className="auth-heading">
            <span className="eyebrow">
              <span className="eyebrow-dot" /> UNIVERSAL AI LEARNING PLATFORM
            </span>
            <h1>
              {authMode === 'login' ? 'Welcome back.' : 'Start learning smarter.'}
            </h1>
            <p>
              {authMode === 'login'
                ? 'Sign in to access your universal study library and study groups.'
                : 'Create your FlashAI scholar account to generate personalized study decks.'}
            </p>
          </div>

          <form className="auth-form" onSubmit={handleAuthSubmit}>
            {authMode === 'register' && (
              <label>
                Full Name
                <input
                  type="text"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  placeholder="e.g. Alex Rivera"
                  autoComplete="name"
                  required
                />
              </label>
            )}

            <label>
              Email Address
              <input
                type="email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="student@university.edu"
                autoComplete="email"
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="Enter secure password"
                autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                required
              />
            </label>

            {authError && <div className="auth-error-banner">{authError}</div>}

            <button type="submit" className="primary-action auth-submit" disabled={authLoading}>
              {authLoading ? 'Verifying...' : authMode === 'login' ? 'Sign In →' : 'Create Free Account →'}
            </button>
          </form>

          <div className="auth-footer-divider">
            <span className="auth-divider-line"></span>
          </div>

          <div className="auth-switch-row">
            <span className="auth-switch-text">
              {authMode === 'login'
                ? "Don't have an account yet?"
                : 'Already have an account?'}
            </span>
            <button
              type="button"
              className="auth-switch-btn"
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'register' : 'login')
                setAuthError('')
              }}
            >
              {authMode === 'login' ? 'Sign up free' : 'Sign in'}
            </button>
          </div>

          <div className="auth-note-badge">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span>Encrypted SQLite storage • Zero tracking</span>
          </div>
        </div>
      </div>
    )
  }

  // =========================================================
  // RENDER: MAIN APPLICATION
  // =========================================================
  return (
    <div className="app">
      <Navbar
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenNotifications={() => setIsNotifOpen(true)}
      />

      {/* Global Alerts */}
      {appError && (
        <div className="global-banner error">
          <span>{appError}</span>
          <button type="button" onClick={() => setAppError('')}>×</button>
        </div>
      )}
      {appSuccess && (
        <div className="global-banner success">
          <span>{appSuccess}</span>
          <button type="button" onClick={() => setAppSuccess('')}>×</button>
        </div>
      )}

      <main className="main-viewport">
        {/* VIEW 1: DASHBOARD */}
        {activeNav === 'dashboard' && (
          <DashboardView
            currentUser={currentUser}
            studySets={studySets}
            setActiveNav={setActiveNav}
            onOpenStudySet={handleOpenStudySet}
            onOpenNotifications={() => setIsNotifOpen(true)}
          />
        )}

        {/* VIEW 2: LEARN WORKSPACE */}
        {activeNav === 'learn' && (
          <div className="learn-page-container">
            {currentStudySet ? (
              <div className="active-workspace-wrapper">
                <div className="workspace-subbar">
                  <button
                    type="button"
                    className="btn-back-to-uploader"
                    onClick={() => setCurrentStudySet(null)}
                  >
                    ← Process Another Source
                  </button>
                  <span className="current-set-label">
                    Studying: <strong>{currentStudySet.title}</strong>
                  </span>
                </div>
                <UnifiedStudyWorkspace
                  apiBase={API_BASE}
                  currentUser={currentUser}
                  currentStudySet={currentStudySet}
                  onSaveStudySet={handleSaveStudySet}
                  onQuizCompleted={handleQuizCompleted}
                />
              </div>
            ) : (
              <div className="uploader-flow-wrapper">
                <UniversalSourceUploader
                  apiBase={API_BASE}
                  onSourceLoaded={handleSourceLoaded}
                  onError={(err) => setAppError(err)}
                  isProcessing={isProcessingSource}
                  setIsProcessing={setIsProcessingSource}
                />

                {loadedSource && (
                  <div className="generation-config-card">
                    <div className="config-header">
                      <span className="panel-kicker">STEP 2: CUSTOMIZE & GENERATE</span>
                      <h3>Configure Your Learning Material</h3>
                      <p>
                        Selected source: <strong>{loadedSource.title}</strong> (
                        {loadedSource.wordCount || (loadedSource.text || '').split(/\s+/).length} words)
                      </p>
                    </div>

                    <div className="config-options-row">
                      <label className="config-label">
                        Flashcards to Generate:
                        <select
                          className="source-select"
                          value={numberOfCards}
                          onChange={(e) => setNumberOfCards(Number(e.target.value))}
                        >
                          <option value={5}>5 Flashcards (Quick Review)</option>
                          <option value={10}>10 Flashcards (Standard)</option>
                          <option value={15}>15 Flashcards (Deep Dive)</option>
                          <option value={20}>20 Flashcards (Comprehensive)</option>
                        </select>
                      </label>

                      <label className="config-label">
                        Difficulty Level:
                        <select
                          className="source-select"
                          value={difficulty}
                          onChange={(e) => setDifficulty(e.target.value)}
                        >
                          <option value="easy">Easy (Definitions & Basics)</option>
                          <option value="medium">Medium (Core Concepts & Logic)</option>
                          <option value="hard">Hard (Advanced & Critical Thinking)</option>
                        </select>
                      </label>

                      <label className="config-label">
                        Language:
                        <select
                          className="source-select"
                          value={flashcardLanguage}
                          onChange={(e) => setFlashcardLanguage(e.target.value)}
                        >
                          {FLASHCARD_LANGUAGES.map((lang, idx) => (
                            <option key={idx} value={lang}>
                              {lang}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="config-actions-row">
                      <button
                        type="button"
                        className="btn-primary-action large"
                        onClick={handleGenerateStudySet}
                        disabled={isGeneratingSet}
                      >
                        {isGeneratingSet ? (
                          <>
                            <span className="spinner-inline" /> Synthesizing with Gemini AI...
                          </>
                        ) : (
                          '✦ Generate Study Set & Launch Workspace →'
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: MY LIBRARY */}
        {activeNav === 'library' && (
          <LibraryView
            studySets={studySets}
            onOpenStudySet={handleOpenStudySet}
            onDeleteStudySet={handleDeleteStudySet}
            onShareToGroup={handleShareToGroup}
            groups={userGroups}
            setActiveNav={setActiveNav}
          />
        )}

        {/* VIEW 4: STUDY GROUPS */}
        {activeNav === 'groups' && (
          <StudyGroupsView
            apiBase={API_BASE}
            currentUser={currentUser}
            onOpenStudySet={handleOpenStudySet}
          />
        )}

        {/* VIEW 5: SPACED REPETITION */}
        {activeNav === 'revision' && (
          <RevisionDashboard
            apiBase={API_BASE}
            currentUser={currentUser}
            studySets={studySets}
            onOpenStudySet={handleOpenStudySet}
          />
        )}

        {/* VIEW 6: PROGRESS ANALYTICS */}
        {activeNav === 'progress' && (
          <ProgressAnalytics
            apiBase={API_BASE}
            currentUser={currentUser}
            studySets={studySets}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="brand footer-brand">
            <span className="brand-mark">✦</span>
            <span>Flash<span>AI</span></span>
          </div>
          <p>Universal AI Learning & Collaboration Platform.</p>
          <span className="footer-subtext">Designed for active mastery across textbooks, slides, audio & video.</span>
        </div>
      </footer>
      {/* Email Notifications & Reminders Modal */}
      <NotificationModal
        currentUser={currentUser}
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
      />
    </div>
  )
}

export default App