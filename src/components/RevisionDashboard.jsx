import React, { useState, useEffect, useMemo } from 'react'

export default function RevisionDashboard({ apiBase, currentUser, studySets = [], onOpenStudySet }) {
  const [dueCards, setDueCards] = useState([])
  const [allCards, setAllCards] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [deletingSetId, setDeletingSetId] = useState(null)

  // Active review session
  const [isReviewing, setIsReviewing] = useState(false)
  const [reviewIndex, setReviewIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [sessionCompleted, setSessionCompleted] = useState(false)

  // Map of study_set_id -> studySet object for instant title and metadata lookup
  const studySetsMap = useMemo(() => {
    const map = {}
    studySets.forEach((s) => {
      if (s?.id) map[String(s.id)] = s
    })
    return map
  }, [studySets])

  const fetchCards = async () => {
    if (!currentUser) return
    setLoading(true)
    setError('')
    try {
      const [dueRes, allRes] = await Promise.all([
        fetch(`${apiBase}/revision/due?user_id=${currentUser.id}`),
        fetch(`${apiBase}/revision/all?user_id=${currentUser.id}`),
      ])
      const dueData = await dueRes.json()
      const allData = await allRes.json()

      setDueCards(dueData.due_cards || [])
      setAllCards(allData.cards || [])
    } catch (err) {
      setError('Could not load spaced repetition cards.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCards()
  }, [currentUser])

  // Helper to format clean human-readable schedule timing with color category
  const formatScheduleTiming = (card) => {
    if (!card.next_review_at) {
      return { label: 'Due now', sub: 'Ready for recall', isDue: true, colorTier: 'green' }
    }
    const now = new Date()
    const target = new Date(card.next_review_at)
    const diffMs = target.getTime() - now.getTime()
    const diffHours = Math.round(diffMs / (1000 * 60 * 60))
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

    const interval = card.interval_days || 1
    // Color categorization based on interval:
    // Large interval (>= 7 days, long-term retention) -> RED
    // Medium interval (2 - 6 days, expanding consolidation) -> YELLOW
    // Small interval (<= 1 day or Due today, immediate active recall) -> GREEN
    let colorTier = 'green'
    if (interval >= 7) colorTier = 'red'
    else if (interval >= 2) colorTier = 'yellow'

    if (diffMs <= 0 || card.status === 'due') {
      return { label: 'Due Today', sub: 'Ready for recall', isDue: true, colorTier: 'green', interval }
    }
    if (diffHours < 24) {
      return { label: `In ${Math.max(1, diffHours)}h`, sub: 'Later today', isDue: false, colorTier: 'green', interval }
    }
    if (diffDays === 1) {
      return { label: 'Tomorrow', sub: `Review in 1 day`, isDue: false, colorTier: 'green', interval }
    }
    return { label: `In ${diffDays} days`, sub: `${interval}d interval`, isDue: false, colorTier, interval }
  }

  // Group allCards by study_set_id for a clean Study Set grouped view
  const groupedStudySets = useMemo(() => {
    const groups = {}
    allCards.forEach((c) => {
      const setId = c.study_set_id ? String(c.study_set_id) : 'other'
      if (!groups[setId]) {
        const matched = studySetsMap[setId]
        groups[setId] = {
          id: setId,
          title: matched?.title || (setId === 'other' ? 'General Study Items' : `Study Set #${setId}`),
          matchedSet: matched,
          cards: [],
          dueCount: 0,
          reviewCount: 0,
          masteredCount: 0,
          maxInterval: 1,
          nextReviewDate: null,
        }
      }
      groups[setId].cards.push(c)
      if (c.status === 'due') groups[setId].dueCount += 1
      else if (c.status === 'review') groups[setId].reviewCount += 1
      else if (c.status === 'mastered') groups[setId].masteredCount += 1
      
      const cardInt = c.interval_days || 1
      if (cardInt > groups[setId].maxInterval) {
        groups[setId].maxInterval = cardInt
      }

      if (c.next_review_at) {
        const d = new Date(c.next_review_at)
        if (!groups[setId].nextReviewDate || d < groups[setId].nextReviewDate) {
          groups[setId].nextReviewDate = d
        }
      }
    })

    // Compute tier for each group
    return Object.values(groups).map((grp) => {
      let colorTier = 'green'
      let tierLabel = 'Short Interval'
      if (grp.maxInterval >= 7) {
        colorTier = 'red'
        tierLabel = 'Long Interval'
      } else if (grp.maxInterval >= 2) {
        colorTier = 'yellow'
        tierLabel = 'Medium Interval'
      }
      return { ...grp, colorTier, tierLabel }
    })
  }, [allCards, studySetsMap])

  const handleCardResult = async (known) => {
    if (reviewIndex >= dueCards.length) return
    const card = dueCards[reviewIndex]

    try {
      await fetch(`${apiBase}/revision/card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          card_id: card.card_id,
          study_set_id: card.study_set_id,
          question: card.question,
          answer: card.answer,
          options: card.options || [],
          known,
        }),
      })
    } catch {
      // Continue locally
    }

    setIsFlipped(false)
    if (reviewIndex + 1 < dueCards.length) {
      setReviewIndex(reviewIndex + 1)
    } else {
      setSessionCompleted(true)
      fetchCards()
    }
  }

  const startReviewSession = () => {
    if (dueCards.length === 0) return
    setReviewIndex(0)
    setIsFlipped(false)
    setSessionCompleted(false)
    setIsReviewing(true)
  }

  const handleDeleteSrsDeck = async (e, setId) => {
    e.stopPropagation()
    if (!currentUser || !setId) return
    if (!window.confirm('Remove this study set and its cards from Spaced Repetition tracking?')) return
    
    setDeletingSetId(setId)
    try {
      const res = await fetch(`${apiBase}/revision/set/${setId}?user_id=${currentUser.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        fetchCards()
      }
    } catch {
      // Continue
    } finally {
      setDeletingSetId(null)
    }
  }

  const masteredCount = allCards.filter((c) => c.status === 'mastered').length
  const reviewCount = allCards.filter((c) => c.status === 'review').length
  const learningCount = allCards.filter((c) => c.status === 'due').length

  return (
    <div className="revision-dashboard">
      <div className="dashboard-header-block">
        <span className="section-kicker">SPACED REPETITION SYSTEM (SRS)</span>
        <h2>Smart Revision & Recall</h2>
        <p>Review study sets at scientifically calculated intervals to cement long-term memory before retention drops.</p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Stats Cards */}
      <div className="srs-stats-grid">
        <div className="srs-stat-card due">
          <span className="stat-label">Due for Review Today</span>
          <strong className="stat-number">{dueCards.length}</strong>
          <span className="stat-desc">Cards ready for active recall</span>
        </div>
        <div className="srs-stat-card learning">
          <span className="stat-label">In Learning</span>
          <strong className="stat-number">{learningCount}</strong>
          <span className="stat-desc">Newly added or forgotten</span>
        </div>
        <div className="srs-stat-card review">
          <span className="stat-label">Expanding Interval</span>
          <strong className="stat-number">{reviewCount}</strong>
          <span className="stat-desc">Retention strengthening</span>
        </div>
        <div className="srs-stat-card mastered">
          <span className="stat-label">Mastered</span>
          <strong className="stat-number">{masteredCount}</strong>
          <span className="stat-desc">Interval 14+ days</span>
        </div>
      </div>

      {/* Review Session Mode */}
      {isReviewing ? (
        <div className="review-session-box">
          {!sessionCompleted ? (
            <div className="session-card-wrapper">
              <div className="session-top-bar">
                <span>
                  Card {reviewIndex + 1} of {dueCards.length}
                </span>
                <button
                  type="button"
                  className="btn-text"
                  onClick={() => setIsReviewing(false)}
                >
                  Exit Review
                </button>
              </div>

              <div
                className={`srs-flashcard ${isFlipped ? 'flipped' : ''}`}
                onClick={() => setIsFlipped(!isFlipped)}
              >
                <div className="srs-flashcard-inner">
                  <div className="srs-face front">
                    <span className="face-tag">QUESTION</span>
                    <h3>{dueCards[reviewIndex]?.question}</h3>
                    <span className="hint-txt">Click to flip & check answer</span>
                  </div>
                  <div className="srs-face back">
                    <span className="face-tag answer">CORRECT ANSWER</span>
                    <p>{dueCards[reviewIndex]?.answer}</p>
                    <span className="hint-txt">Rate your recall below</span>
                  </div>
                </div>
              </div>

              {isFlipped && (
                <div className="rating-actions-row">
                  <button
                    type="button"
                    className="btn-rating hard"
                    onClick={() => handleCardResult(false)}
                  >
                    <span>×</span> Needs Revision (Again)
                  </button>
                  <button
                    type="button"
                    className="btn-rating easy"
                    onClick={() => handleCardResult(true)}
                  >
                    <span>✓</span> Remembered (Known)
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="session-complete-card">
              <span className="party-ico">🎉</span>
              <h3>Revision Session Complete!</h3>
              <p>You've reviewed all cards due today. Great discipline!</p>
              <button
                type="button"
                className="btn-primary-action"
                onClick={() => setIsReviewing(false)}
              >
                Back to Dashboard
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="ready-to-review-box">
          {dueCards.length > 0 ? (
            <div className="start-prompt">
              <h3>You have {dueCards.length} cards scheduled for today.</h3>
              <p>Spending 3-5 minutes reviewing now prevents 80% of forgetting curve drop-off.</p>
              <button
                type="button"
                className="btn-primary-action"
                onClick={startReviewSession}
              >
                Start Due Revision Session ({dueCards.length} Cards) →
              </button>
            </div>
          ) : (
            <div className="empty-due-box">
              <span className="check-badge">✓</span>
              <h3>All caught up for today!</h3>
              <p>No cards are due right now. Study new sets from the Learn Workspace to queue more items.</p>
            </div>
          )}

          {/* Grouped by Study Sets */}
          {groupedStudySets.length > 0 && (
            <div className="tracked-cards-list">
              <div className="tracked-cards-header">
                <div>
                  <h4>Tracked Study Sets ({groupedStudySets.length})</h4>
                  <p className="tracked-cards-subtitle">
                    Active recall progress and retention intervals calculated per study deck via SuperMemo-2 (SM-2)
                  </p>
                </div>
                <div className="srs-legend-row">
                  <span className="legend-chip red">🔴 Long Interval (7d+)</span>
                  <span className="legend-chip yellow">🟡 Medium Interval (2–6d)</span>
                  <span className="legend-chip green">🟢 Short / Due (1d)</span>
                </div>
              </div>

              <div className="srs-sets-grid">
                {groupedStudySets.map((grp) => {
                  const masteryPct = Math.round((grp.masteredCount / grp.cards.length) * 100)
                  return (
                    <div key={grp.id} className={`srs-set-card tier-${grp.colorTier}`}>
                      {/* Card Header Row 1: icon + title + delete */}
                      <div className="srs-set-header">
                        <span className="srs-deck-icon">📚</span>
                        <div className="srs-set-title-wrap">
                          <h4 className="srs-set-title">{grp.title}</h4>
                          <span className="srs-set-meta">{grp.cards.length} flashcards tracked</span>
                        </div>
                        <button
                          type="button"
                          className="btn-delete-srs-deck"
                          title="Remove from SRS tracking"
                          disabled={deletingSetId === grp.id}
                          onClick={(e) => handleDeleteSrsDeck(e, grp.id)}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      </div>
                      {/* Card Header Row 2: badges */}
                      <div className="srs-set-badges-row">
                        <span className={`srs-interval-badge tier-${grp.colorTier}`}>
                          {grp.maxInterval}d Interval
                        </span>
                        {grp.dueCount > 0 ? (
                          <span className="srs-due-badge">{grp.dueCount} Due Now</span>
                        ) : (
                          <span className="srs-up-to-date-badge">Up to Date</span>
                        )}
                      </div>

                      {/* Mastery Progress Bar */}
                      <div className="srs-progress-block">
                        <div className="srs-progress-labels">
                          <span>Mastery Retention</span>
                          <strong>{masteryPct}%</strong>
                        </div>
                        <div className="srs-progress-track">
                          <div
                            className="srs-progress-fill"
                            style={{ width: `${masteryPct}%` }}
                          />
                        </div>
                      </div>

                      {/* Retention Interval Breakdown */}
                      <div className="srs-intervals-row">
                        <div className="srs-interval-item">
                          <span className="srs-item-lbl">Retention Tier</span>
                          <span className={`srs-item-val tier-label ${grp.colorTier}`}>
                            {grp.tierLabel}
                          </span>
                        </div>
                        <div className="srs-interval-item">
                          <span className="srs-item-lbl">Next Review</span>
                          <span className="srs-item-val highlight">
                            {grp.dueCount > 0
                              ? 'Due Today'
                              : grp.maxInterval === 1
                              ? 'Tomorrow'
                              : `In ${grp.maxInterval} days`}
                          </span>
                        </div>
                        <div className="srs-interval-item">
                          <span className="srs-item-lbl">SM-2 Spaced Target</span>
                          <span className={`srs-item-val interval-pill ${grp.colorTier}`}>
                            {grp.maxInterval}d cycle
                          </span>
                        </div>
                      </div>

                      {/* Card Questions Preview Accordion */}
                      <details className="srs-card-accordion">
                        <summary className="srs-accordion-summary">
                          <span>View {grp.cards.length} Card Prompts</span>
                          <span className="accordion-arrow">▾</span>
                        </summary>
                        <div className="srs-accordion-cards">
                          {grp.cards.map((c, cIdx) => {
                            const timing = formatScheduleTiming(c)
                            return (
                              <div key={cIdx} className="srs-mini-card-row">
                                <span className="srs-card-bullet">#{cIdx + 1}</span>
                                <span className="srs-card-q">{c.question}</span>
                                <span className={`status-badge sm ${c.status}`}>
                                  {c.status === 'due' ? 'Due' : c.status === 'review' ? 'Review' : 'Mastered'}
                                </span>
                                <span className={`srs-timing-chip tier-${timing.colorTier}`}>
                                  {timing.interval}d ({timing.label})
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </details>

                      {/* Open Deck Button if matched set exists */}
                      {grp.matchedSet && onOpenStudySet && (
                        <div className="srs-card-footer">
                          <button
                            type="button"
                            className="btn-open-srs-deck"
                            onClick={() => onOpenStudySet(grp.matchedSet)}
                          >
                            Open Deck in Workspace →
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
