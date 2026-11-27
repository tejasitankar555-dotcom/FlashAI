import React, { useState, useEffect } from 'react'

export default function ProgressAnalytics({ apiBase, currentUser, studySets }) {
  const [backendStats, setBackendStats] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!currentUser) return
    const fetchAnalytics = async () => {
      setLoading(true)
      try {
        const res = await fetch(`${apiBase}/analytics/${currentUser.id}`)
        if (res.ok) {
          const data = await res.json()
          setBackendStats(data)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchAnalytics()
  }, [currentUser])

  // Derive metrics strictly from actual saved sets and attempts
  const totalSets = studySets.length
  const totalFlashcards = studySets.reduce((acc, s) => acc + (s.flashcards?.length || 0), 0)

  const quizAttempts = studySets.filter(
    (s) => s.lastQuizScore !== null && s.lastQuizScore !== undefined
  )
  const totalQuizzesTaken = quizAttempts.length

  const averageQuizScore =
    totalQuizzesTaken > 0
      ? Math.round(
          quizAttempts.reduce((acc, s) => {
            const score = s.lastQuizScore || 0
            const total = s.numberOfCards || s.flashcards?.length || 1
            return acc + (score / total) * 100
          }, 0) / totalQuizzesTaken
        )
      : 0

  return (
    <div className="progress-analytics-view">
      <div className="analytics-header">
        <span className="section-kicker">PERSONALIZED PERFORMANCE</span>
        <h2>Learning Progress Analytics</h2>
        <p>Real-time academic telemetry calculated strictly from your study sessions and quiz attempts.</p>
      </div>

      {/* Metrics Row */}
      <div className="metrics-summary-grid">
        <div className="metric-card">
          <span className="metric-icon">📚</span>
          <div className="metric-val">{totalSets}</div>
          <div className="metric-name">Active Study Sets</div>
          <span className="metric-sub">In your knowledge library</span>
        </div>

        <div className="metric-card">
          <span className="metric-icon">🎴</span>
          <div className="metric-val">{totalFlashcards}</div>
          <div className="metric-name">Flashcards Created</div>
          <span className="metric-sub">Across all courses</span>
        </div>

        <div className="metric-card">
          <span className="metric-icon">📝</span>
          <div className="metric-val">{totalQuizzesTaken}</div>
          <div className="metric-name">Quizzes Completed</div>
          <span className="metric-sub">Self-assessments submitted</span>
        </div>

        <div className="metric-card">
          <span className="metric-icon">🎯</span>
          <div className="metric-val">{totalQuizzesTaken > 0 ? `${averageQuizScore}%` : '—'}</div>
          <div className="metric-name">Average Quiz Score</div>
          <span className="metric-sub">Cumulative accuracy</span>
        </div>
      </div>

      {/* Spaced Repetition Mastery Breakdown */}
      {backendStats && (
        <div className="mastery-breakdown-card">
          <h3>Spaced Repetition Retention Status</h3>
          <p className="mastery-sub">Based on review intervals and recall evaluations.</p>
          <div className="mastery-bars-grid">
            <div className="mastery-bar-item">
              <div className="bar-label-row">
                <span>Mastered (14+ day interval)</span>
                <strong>{backendStats.mastered_cards} cards</strong>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill green"
                  style={{
                    width: `${
                      backendStats.total_cards_tracked > 0
                        ? (backendStats.mastered_cards / backendStats.total_cards_tracked) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <div className="mastery-bar-item">
              <div className="bar-label-row">
                <span>In Active Review</span>
                <strong>{backendStats.in_review} cards</strong>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill blue"
                  style={{
                    width: `${
                      backendStats.total_cards_tracked > 0
                        ? (backendStats.in_review / backendStats.total_cards_tracked) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <div className="mastery-bar-item">
              <div className="bar-label-row">
                <span>Needs Practice / Due</span>
                <strong>{backendStats.due_for_review_today} cards</strong>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill red"
                  style={{
                    width: `${
                      backendStats.total_cards_tracked > 0
                        ? (backendStats.due_for_review_today / backendStats.total_cards_tracked) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Quiz Performance Log */}
      <div className="performance-history-card">
        <h3>Quiz Performance History</h3>
        {quizAttempts.length === 0 ? (
          <div className="empty-history">
            <span className="empty-ico">📊</span>
            <h4>No Quiz History Yet</h4>
            <p>Take a quiz on any of your study sets to see your scores and mastery progression here.</p>
          </div>
        ) : (
          <div className="attempts-table">
            <div className="attempts-head-row">
              <span>Study Set</span>
              <span>Language</span>
              <span>Difficulty</span>
              <span>Score</span>
              <span>Status</span>
            </div>
            {quizAttempts.map((s) => {
              const score = s.lastQuizScore || 0
              const total = s.numberOfCards || s.flashcards?.length || 1
              const pct = Math.round((score / total) * 100)
              return (
                <div key={s.id} className="attempts-data-row">
                  <span className="attempt-title">{s.title}</span>
                  <span>{s.language}</span>
                  <span className={`diff-pill ${s.difficulty}`}>{s.difficulty}</span>
                  <span className="attempt-score">
                    <strong>{score}</strong> / {total} ({pct}%)
                  </span>
                  <span className={`badge-outcome ${pct >= 70 ? 'passed' : 'review'}`}>
                    {pct >= 70 ? 'Proficient' : 'Needs Review'}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
