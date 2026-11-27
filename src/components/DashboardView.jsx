import React from 'react'

export default function DashboardView({
  currentUser,
  studySets = [],
  setActiveNav,
  onOpenStudySet,
  onOpenNotifications,
}) {
  const safeSets = Array.isArray(studySets) ? studySets.filter(Boolean) : []
  const quizAttempts = safeSets.filter(
    (s) => s && s.lastQuizScore !== null && s.lastQuizScore !== undefined
  )
  const totalCards = safeSets.reduce((acc, s) => acc + (s?.flashcards?.length || 0), 0)

  return (
    <div className="dashboard-view">
      {/* Welcome Hero Banner */}
      <div className="dashboard-welcome-banner">
        <div className="welcome-text">
          <span className="eyebrow">
            <span className="eyebrow-dot" /> WELCOME TO FLASHAI
          </span>
          <h1>Welcome back, {currentUser?.name?.split(' ')[0] || 'Scholar'}!</h1>
          <p>
            Your AI-powered educational command center. Generate multimodal study sets, test yourself with adaptive quizzes, and collaborate with your study circle.
          </p>
          <div className="welcome-cta-row">
            <button
              type="button"
              className="btn-primary-action"
              onClick={() => setActiveNav('learn')}
            >
              + Create New Study Set →
            </button>
            <button
              type="button"
              className="btn-secondary-action"
              onClick={() => setActiveNav('groups')}
            >
              Explore Study Groups
            </button>
            <button
              type="button"
              className="btn-secondary-action"
              onClick={() => setActiveNav('revision')}
            >
              Spaced Review (SRS)
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="dash-stats-grid">
        <div className="dash-stat-item">
          <span className="icon-badge blue">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
          </span>
          <div>
            <div className="stat-value">{safeSets.length}</div>
            <div className="stat-title">Study Sets</div>
          </div>
        </div>
        <div className="dash-stat-item">
          <span className="icon-badge violet">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <path d="M12 4v16M2 12h20"/>
            </svg>
          </span>
          <div>
            <div className="stat-value">{totalCards}</div>
            <div className="stat-title">Flashcards</div>
          </div>
        </div>
        <div className="dash-stat-item">
          <span className="icon-badge teal">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </span>
          <div>
            <div className="stat-value">{quizAttempts.length}</div>
            <div className="stat-title">Quizzes Completed</div>
          </div>
        </div>
        <div className="dash-stat-item">
          <span className="icon-badge orange">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/>
              <polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
          </span>
          <div>
            <div className="stat-value">SRS</div>
            <div className="stat-title">Spaced Repetition</div>
          </div>
        </div>
      </div>

      {/* Quick Launchpad Action Cards */}
      <div className="quick-actions-section">
        <h3>Quick Launchpad</h3>
        <div className="quick-actions-grid">
          <div
            className="launch-card"
            onClick={() => setActiveNav('learn')}
          >
            <span className="launch-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            </span>
            <h4>Upload Course Material</h4>
            <p>Upload PDF, PowerPoint, Word docs, images or audio to extract learning sets.</p>
            <span className="launch-link">Launch Uploader →</span>
          </div>

          <div
            className="launch-card"
            onClick={() => setActiveNav('learn')}
          >
            <span className="launch-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polygon points="10 8 16 12 10 16 10 8"/>
              </svg>
            </span>
            <h4>YouTube Video Lesson</h4>
            <p>Turn any educational YouTube video into instant interactive flashcards.</p>
            <span className="launch-link">Paste Video URL →</span>
          </div>

          <div
            className="launch-card"
            onClick={() => setActiveNav('revision')}
          >
            <span className="launch-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"/>
                <polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
            </span>
            <h4>Daily Spaced Review</h4>
            <p>Review due flashcards scheduled for today by the repetition algorithm.</p>
            <span className="launch-link">Start Review Session →</span>
          </div>

          <div
            className="launch-card"
            onClick={() => setActiveNav('groups')}
          >
            <span className="launch-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </span>
            <h4>Collaborative Groups</h4>
            <p>Compare quiz rankings, discuss tricky questions, and share study decks.</p>
            <span className="launch-link">Go to Groups →</span>
          </div>
        </div>
      </div>

      {/* Recent Study Sets */}
      <div className="recent-sets-section">
        <div className="section-head-row">
          <h3>Recent Study Sets</h3>
          {safeSets.length > 0 && (
            <button
              type="button"
              className="btn-text-link"
              onClick={() => setActiveNav('library')}
            >
              View All ({safeSets.length}) →
            </button>
          )}
        </div>

        {safeSets.length === 0 ? (
          <div className="empty-dash-sets">
            <span className="empty-ico">✦</span>
            <h4>Your study library is currently empty</h4>
            <p>Create your first study set from a PDF, YouTube video, or lecture notes to get started.</p>
            <button
              type="button"
              className="btn-primary-action small"
              onClick={() => setActiveNav('learn')}
            >
              Create Study Set Now
            </button>
          </div>
        ) : (
          <div className="recent-sets-grid">
            {safeSets.slice(0, 3).map((set) => (
              <div key={set.id} className="recent-set-card">
                <div className="card-top">
                  <span className="tag-source">{set.videoId ? '▶ YouTube' : '📄 Document'}</span>
                  <span className={`diff-tag ${set.difficulty || 'medium'}`}>{set.difficulty || 'medium'}</span>
                </div>
                <h4>{set.title}</h4>
                <div className="set-meta">
                  <span>{set.numberOfCards || set.flashcards?.length} Flashcards</span>
                  <span>•</span>
                  <span>{set.language || 'English'}</span>
                </div>
                <button
                  type="button"
                  className="btn-study-now"
                  onClick={() => onOpenStudySet(set)}
                >
                  Study Now →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
