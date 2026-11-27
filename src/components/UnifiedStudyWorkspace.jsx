import React, { useState } from 'react'
import MindMapViewer from './MindMapViewer'
import AITutorChat from './AITutorChat'

export default function UnifiedStudyWorkspace({
  apiBase,
  currentUser,
  currentStudySet,
  onSaveStudySet,
  onQuizCompleted,
}) {
  const [activeTab, setActiveTab] = useState('summary')

  // Flashcards state
  const flashcards = currentStudySet.flashcards || []
  const [currentCard, setCurrentCard] = useState(0)
  const [isCardFlipped, setIsCardFlipped] = useState(false)

  // Quiz state
  const [quizAnswers, setQuizAnswers] = useState({})
  const [quizScore, setQuizScore] = useState(0)
  const [quizFinished, setQuizFinished] = useState(false)

  // Extended features state
  const [mindmapData, setMindmapData] = useState(currentStudySet.mindmap || null)
  const [loadingMindmap, setLoadingMindmap] = useState(false)

  const [revisionNotes, setRevisionNotes] = useState(currentStudySet.revisionNotes || null)
  const [loadingNotes, setLoadingNotes] = useState(false)

  const [examQuestions, setExamQuestions] = useState(currentStudySet.examQuestions || null)
  const [loadingQuestions, setLoadingQuestions] = useState(false)

  const [error, setError] = useState('')

  // Quiz handlers
  const handleQuizAnswer = (option) => {
    if (quizAnswers[currentCard]) return
    const nextAnswers = { ...quizAnswers, [currentCard]: option }
    setQuizAnswers(nextAnswers)
    const newScore = Object.entries(nextAnswers).reduce((acc, [idx, ans]) => {
      return acc + (flashcards[Number(idx)]?.answer === ans ? 1 : 0)
    }, 0)
    setQuizScore(newScore)
  }

  const finishQuiz = () => {
    setQuizFinished(true)
    const total = flashcards.length
    const finalScore = Object.entries(quizAnswers).reduce((acc, [idx, ans]) => {
      return acc + (flashcards[Number(idx)]?.answer === ans ? 1 : 0)
    }, 0)
    setQuizScore(finalScore)
    onQuizCompleted(currentStudySet.id, finalScore, total)
  }

  const restartQuiz = () => {
    setQuizFinished(false)
    setCurrentCard(0)
    setQuizAnswers({})
    setQuizScore(0)
  }

  // Generate Mind Map on demand
  const handleGenerateMindmap = async () => {
    if (!currentStudySet.text && !currentStudySet.summary) return
    setLoadingMindmap(true)
    setError('')
    try {
      const res = await fetch(`${apiBase}/generate-mindmap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: currentStudySet.text || currentStudySet.summary,
          language: currentStudySet.language || 'English',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Mindmap generation failed.')
      setMindmapData(data)
      onSaveStudySet({ ...currentStudySet, mindmap: data })
    } catch (err) {
      setError(err.message || 'Mind map failed.')
    } finally {
      setLoadingMindmap(false)
    }
  }

  // Generate Revision Notes on demand
  const handleGenerateNotes = async () => {
    if (!currentStudySet.text && !currentStudySet.summary) return
    setLoadingNotes(true)
    setError('')
    try {
      const res = await fetch(`${apiBase}/generate-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: currentStudySet.text || currentStudySet.summary,
          language: currentStudySet.language || 'English',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Notes generation failed.')
      setRevisionNotes(data)
      onSaveStudySet({ ...currentStudySet, revisionNotes: data })
    } catch (err) {
      setError(err.message || 'Revision notes failed.')
    } finally {
      setLoadingNotes(false)
    }
  }

  // Generate Exam Questions on demand
  const handleGenerateQuestions = async () => {
    if (!currentStudySet.text && !currentStudySet.summary) return
    setLoadingQuestions(true)
    setError('')
    try {
      const res = await fetch(`${apiBase}/generate-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: currentStudySet.text || currentStudySet.summary,
          language: currentStudySet.language || 'English',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Questions generation failed.')
      setExamQuestions(data)
      onSaveStudySet({ ...currentStudySet, examQuestions: data })
    } catch (err) {
      setError(err.message || 'Questions failed.')
    } finally {
      setLoadingQuestions(false)
    }
  }

  const workspaceTabs = [
    { id: 'summary', label: 'Summary', icon: '📋' },
    { id: 'flashcards', label: `Flashcards (${flashcards.length})`, icon: '🎴' },
    { id: 'quiz', label: 'Quiz Mode', icon: '✓' },
    { id: 'mindmap', label: 'Mind Map', icon: '🗺️' },
    { id: 'notes', label: 'Revision Notes', icon: '📝' },
    { id: 'questions', label: 'Exam & Viva Qs', icon: '❓' },
    { id: 'tutor', label: 'AI Tutor Chat', icon: '🎓' },
    { id: 'source', label: 'Source Text', icon: '📄' },
  ]

  return (
    <div className="unified-study-workspace">
      {/* Workspace Top Navigation Bar */}
      <div className="workspace-header-bar">
        <div className="workspace-title-box">
          <span className="source-type-pill">
            {currentStudySet.sourceType === 'youtube'
              ? '▶ YouTube Lesson'
              : `📄 ${currentStudySet.sourceType?.toUpperCase() || 'DOCUMENT'}`}
          </span>
          <h2>{currentStudySet.title}</h2>
          <span className="workspace-meta">
            {currentStudySet.language || 'English'} • {currentStudySet.difficulty || 'Medium'} difficulty
          </span>
        </div>

        <div className="workspace-tabs-strip">
          {workspaceTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`workspace-tab-btn ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(t.id)
                setError('')
              }}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="workspace-tab-body">
        {/* SUMMARY TAB */}
        {activeTab === 'summary' && (
          <div className="tab-pane-content summary-pane">
            <div className="summary-card-box">
              <h3>Educational Summary</h3>
              <p className="summary-text">{currentStudySet.summary || 'Summary not generated yet.'}</p>

              {currentStudySet.keyConcepts && currentStudySet.keyConcepts.length > 0 && (
                <div className="key-concepts-container">
                  <h4>Core Key Concepts</h4>
                  <div className="concepts-pill-list">
                    {currentStudySet.keyConcepts.map((concept, idx) => (
                      <div key={idx} className="concept-pill">
                        <span className="concept-dot">✦</span>
                        <span>{concept}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* FLASHCARDS TAB (THEMED IN LAVENDER & VIOLET) */}
        {activeTab === 'flashcards' && (
          <div className="tab-pane-content flashcards-pane">
            {flashcards.length === 0 ? (
              <div className="empty-cards-box">
                <p>No flashcards generated yet.</p>
              </div>
            ) : (
              <div className="flashcard-study">
                <div className="study-progress-row">
                  <span>
                    CARD {String(currentCard + 1).padStart(2, '0')} / {String(flashcards.length).padStart(2, '0')}
                  </span>
                  <span>{Math.round(((currentCard + 1) / flashcards.length) * 100)}%</span>
                </div>

                <div className="study-progress">
                  <div style={{ width: `${((currentCard + 1) / flashcards.length) * 100}%` }} />
                </div>

                <div
                  className={`flashcard ${isCardFlipped ? 'flipped' : ''}`}
                  onClick={() => setIsCardFlipped(!isCardFlipped)}
                >
                  <div className="flashcard-inner">
                    {/* FRONT */}
                    <div className="flashcard-face front">
                      <div className="card-top-line">
                        <span>QUESTION</span>
                        <span>{currentStudySet.difficulty || 'MEDIUM'}</span>
                      </div>
                      <div className="card-center">
                        <span className="question-mark">?</span>
                        <h3>{flashcards[currentCard]?.question}</h3>
                      </div>
                      <div className="flip-label">
                        <span>↻</span> Click anywhere to reveal answer
                      </div>
                    </div>

                    {/* BACK */}
                    <div className="flashcard-face back">
                      <div className="card-top-line">
                        <span>ANSWER</span>
                        <span className="answer-dot">✓</span>
                      </div>
                      <div className="card-center">
                        <span className="answer-symbol">✓</span>
                        <p>{flashcards[currentCard]?.answer}</p>
                      </div>
                      <div className="flip-label">
                        <span>↻</span> Click to return to question
                      </div>
                    </div>
                  </div>
                </div>

                {/* NAVIGATION */}
                <div className="flashcard-nav">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentCard((prev) => Math.max(prev - 1, 0))
                      setIsCardFlipped(false)
                    }}
                    disabled={currentCard === 0}
                  >
                    ← Previous
                  </button>

                  <div className="nav-dots">
                    {flashcards.slice(0, Math.min(flashcards.length, 10)).map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={currentCard === idx ? 'active' : ''}
                        onClick={() => {
                          setCurrentCard(idx)
                          setIsCardFlipped(false)
                        }}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setCurrentCard((prev) => Math.min(prev + 1, flashcards.length - 1))
                      setIsCardFlipped(false)
                    }}
                    disabled={currentCard === flashcards.length - 1}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* QUIZ TAB (THEMED IN TEAL & BLUE) */}
        {activeTab === 'quiz' && (
          <div className="tab-pane-content quiz-pane">
            {flashcards.length === 0 ? (
              <div className="empty-cards-box">
                <p>Generate flashcards first to start the quiz.</p>
              </div>
            ) : !quizFinished ? (
              <div className="quiz-shell">
                <div className="quiz-progress-row">
                  <span>
                    QUESTION {currentCard + 1} OF {flashcards.length}
                  </span>
                  <span>CURRENT SCORE: {quizScore}</span>
                </div>

                <div className="quiz-progress">
                  <div style={{ width: `${((currentCard + 1) / flashcards.length) * 100}%` }} />
                </div>

                <div className="quiz-question-block">
                  <span className="quiz-number">QUESTION {String(currentCard + 1).padStart(2, '0')}</span>
                  <h3>{flashcards[currentCard]?.question}</h3>
                </div>

                <div className="quiz-options">
                  {flashcards[currentCard]?.options?.map((option, idx) => {
                    const selected = quizAnswers[currentCard] === option
                    const isCorrect = option === flashcards[currentCard].answer
                    return (
                      <button
                        key={idx}
                        type="button"
                        className={`quiz-option ${
                          selected ? (isCorrect ? 'correct' : 'incorrect') : ''
                        }`}
                        onClick={() => handleQuizAnswer(option)}
                        disabled={Boolean(quizAnswers[currentCard])}
                      >
                        <span className="option-letter">{String.fromCharCode(65 + idx)}</span>
                        <span className="option-text">{option}</span>
                        {selected && (
                          <span className="option-result">{isCorrect ? '✓' : '×'}</span>
                        )}
                      </button>
                    )
                  })}
                </div>

                {quizAnswers[currentCard] && (
                  <div
                    className={`quiz-feedback ${
                      quizAnswers[currentCard] === flashcards[currentCard].answer
                        ? 'correct'
                        : 'incorrect'
                    }`}
                  >
                    {quizAnswers[currentCard] === flashcards[currentCard].answer ? (
                      <>
                        <strong>✓ Correct!</strong>
                        <span>Great understanding. Keep the momentum going!</span>
                      </>
                    ) : (
                      <>
                        <strong>× Incorrect</strong>
                        <span>Correct answer: {flashcards[currentCard].answer}</span>
                      </>
                    )}
                  </div>
                )}

                <div className="quiz-nav">
                  <button
                    type="button"
                    onClick={() => setCurrentCard((prev) => Math.max(prev - 1, 0))}
                    disabled={currentCard === 0}
                  >
                    ← Previous Question
                  </button>
                  <button
                    type="button"
                    className="quiz-next"
                    onClick={() => {
                      if (currentCard === flashcards.length - 1) {
                        finishQuiz()
                      } else {
                        setCurrentCard((prev) => prev + 1)
                      }
                    }}
                    disabled={!quizAnswers[currentCard]}
                  >
                    {currentCard === flashcards.length - 1 ? 'Finish Assessment' : 'Next Question →'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="quiz-results-card">
                <span className="results-orbit">✓</span>
                <span className="section-kicker">SESSION COMPLETED</span>
                <h2>Quiz Assessment Complete</h2>
                <div className="results-score-big">
                  {quizScore} <span>/ {flashcards.length}</span>
                </div>
                <p className="results-percent-txt">
                  {Math.round((quizScore / flashcards.length) * 100)}% Accuracy
                </p>
                <p className="results-message">
                  Your score has been updated in your personal analytics and recorded for group leaderboards.
                </p>
                <div className="results-actions-row">
                  <button type="button" className="btn-secondary-action" onClick={restartQuiz}>
                    ↻ Retake Quiz
                  </button>
                  <button
                    type="button"
                    className="btn-primary-action"
                    onClick={() => {
                      setActiveTab('flashcards')
                      setCurrentCard(0)
                      setIsCardFlipped(false)
                    }}
                  >
                    🎴 Review Flashcards
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MIND MAP TAB */}
        {activeTab === 'mindmap' && (
          <div className="tab-pane-content mindmap-pane">
            <MindMapViewer
              mindmapData={mindmapData}
              onRegenerate={handleGenerateMindmap}
              isLoading={loadingMindmap}
            />
          </div>
        )}

        {/* REVISION NOTES TAB */}
        {activeTab === 'notes' && (
          <div className="tab-pane-content notes-pane">
            {loadingNotes ? (
              <div className="mindmap-loading-box">
                <div className="pulse-loader" />
                <p>Generating structured revision notes with AI...</p>
              </div>
            ) : revisionNotes ? (
              <div className="notes-display-box">
                <div className="notes-header">
                  <h3>{revisionNotes.title || 'Quick Revision Notes'}</h3>
                  <button type="button" className="btn-secondary-action" onClick={handleGenerateNotes}>
                    ↻ Refresh Notes
                  </button>
                </div>
                {revisionNotes.sections?.map((sec, idx) => (
                  <div key={idx} className="note-section-card">
                    <h4>{sec.heading}</h4>
                    <ul className="note-bullets">
                      {sec.bullet_points?.map((bp, i) => (
                        <li key={i}>{bp}</li>
                      ))}
                    </ul>
                    {sec.formula_or_rule && (
                      <div className="formula-box">
                        <strong>Rule / Formula:</strong> {sec.formula_or_rule}
                      </div>
                    )}
                  </div>
                ))}
                {revisionNotes.quick_takeaway && (
                  <div className="takeaway-banner">
                    <strong>Key Takeaway:</strong> {revisionNotes.quick_takeaway}
                  </div>
                )}
              </div>
            ) : (
              <div className="mindmap-empty-box">
                <span className="empty-ico">📝</span>
                <h3>No Revision Notes Generated</h3>
                <p>Summarize this lesson into high-yield formula cards and exam points.</p>
                <button type="button" className="btn-primary-action small" onClick={handleGenerateNotes}>
                  Generate Revision Notes
                </button>
              </div>
            )}
          </div>
        )}

        {/* EXAM & VIVA QUESTIONS TAB */}
        {activeTab === 'questions' && (
          <div className="tab-pane-content questions-pane">
            {loadingQuestions ? (
              <div className="mindmap-loading-box">
                <div className="pulse-loader" />
                <p>Formulating university exam & viva interview questions...</p>
              </div>
            ) : examQuestions ? (
              <div className="exam-questions-box">
                <div className="notes-header">
                  <h3>Curated Exam & Viva Questions</h3>
                  <button type="button" className="btn-secondary-action" onClick={handleGenerateQuestions}>
                    ↻ Refresh Questions
                  </button>
                </div>
                <div className="questions-stream">
                  {examQuestions.questions?.map((q, idx) => (
                    <div key={idx} className="exam-q-card">
                      <div className="q-top-row">
                        <span className="q-type-badge">{q.type || 'Conceptual'}</span>
                        <span className="q-importance">{q.importance || 'High'} Priority</span>
                      </div>
                      <h4>Q{idx + 1}: {q.question}</h4>
                      <div className="model-answer-box">
                        <strong>Model Answer:</strong>
                        <p>{q.model_answer}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mindmap-empty-box">
                <span className="empty-ico">❓</span>
                <h3>No Exam Questions Generated</h3>
                <p>Generate professor-style exam questions and viva questions with model answers.</p>
                <button type="button" className="btn-primary-action small" onClick={handleGenerateQuestions}>
                  Generate Exam & Viva Questions
                </button>
              </div>
            )}
          </div>
        )}

        {/* AI TUTOR CHAT TAB */}
        {activeTab === 'tutor' && (
          <div className="tab-pane-content tutor-pane">
            <AITutorChat
              apiBase={apiBase}
              sourceContext={currentStudySet.text || currentStudySet.summary || ''}
              sourceTitle={currentStudySet.title}
            />
          </div>
        )}

        {/* SOURCE TEXT TAB */}
        {activeTab === 'source' && (
          <div className="tab-pane-content source-pane">
            <div className="raw-source-box">
              <div className="source-meta-row">
                <span>Source: {currentStudySet.sourceUrl || currentStudySet.title}</span>
                <span>Word count: {(currentStudySet.text || '').split(/\s+/).length} words</span>
              </div>
              <pre className="source-pre-wrap">{currentStudySet.text || 'No raw source text stored.'}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
