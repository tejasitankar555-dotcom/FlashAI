import React, { useState } from 'react'

export default function LibraryView({
  studySets,
  onOpenStudySet,
  onDeleteStudySet,
  onShareToGroup,
  groups,
  setActiveNav,
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [shareModalSet, setShareModalSet] = useState(null)
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [shareSuccess, setShareSuccess] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)

  const filtered = studySets.filter((s) =>
    s.title?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleShareSubmit = (e) => {
    e.preventDefault()
    if (!selectedGroupId || !shareModalSet) return
    onShareToGroup(Number(selectedGroupId), shareModalSet)
    setShareSuccess(`Shared to group successfully!`)
    setTimeout(() => {
      setShareModalSet(null)
      setShareSuccess('')
    }, 1500)
  }

  const handleDelete = (e, id) => {
    e.stopPropagation()
    onDeleteStudySet(id)
    setDeleteConfirmId(null)
  }

  return (
    <div className="library-view-container">
      <div className="library-header-row">
        <div>
          <span className="section-kicker">SAVED KNOWLEDGE BASE</span>
          <h2>My Study Library</h2>
          <p>Revisit your generated study sets, take practice quizzes, or share sets with your peers.</p>
        </div>
        <button
          type="button"
          className="btn-primary-action"
          onClick={() => setActiveNav('learn')}
        >
          + Create New Study Set
        </button>
      </div>

      {/* Search Input */}
      {studySets.length > 0 && (
        <div className="library-search-bar">
          <span className="search-ico">🔍</span>
          <input
            type="text"
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search study sets by title, course, or topic..."
          />
          {searchTerm && (
            <button type="button" className="clear-search-btn" onClick={() => setSearchTerm('')}>
              ×
            </button>
          )}
        </div>
      )}

      {/* Empty State */}
      {studySets.length === 0 ? (
        <div className="empty-library-card">
          <span className="empty-icon">📚</span>
          <h3>Your Library is Empty</h3>
          <p>
            Generate your first study set from a PDF, YouTube lesson, PowerPoint, or lecture notes to store your knowledge base here.
          </p>
          <button
            type="button"
            className="btn-primary-action"
            onClick={() => setActiveNav('learn')}
          >
            Create Your First Study Set →
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-search-card">
          <span className="empty-icon">🔍</span>
          <h3>No matching study sets found</h3>
          <p>Try searching with different keywords.</p>
        </div>
      ) : (
        <div className="library-cards-grid">
          {filtered.map((set) => {
            const best = Number(set.bestScore) || 0
            const total = Number(set.numberOfCards) || set.flashcards?.length || 1
            const progress = Math.min(100, Math.round((best / total) * 100))

            return (
              <div key={set.id} className="library-study-card">
                <div className="card-top-bar">
                  <span className="source-badge">
                    {set.videoId ? '▶ YouTube' : '📄 Document'}
                  </span>
                  <div className="top-actions">
                    {groups && groups.length > 0 && (
                      <button
                        type="button"
                        className="btn-share-icon"
                        title="Share to Study Group"
                        onClick={(e) => {
                          e.stopPropagation()
                          setShareModalSet(set)
                          setSelectedGroupId(groups[0]?.id || '')
                        }}
                      >
                        👥 Share
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-delete-card"
                      title="Delete study set"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteConfirmId(set.id)
                      }}
                    >
                      ×
                    </button>
                  </div>
                </div>

                <h3 className="card-title">{set.title}</h3>

                <div className="card-meta-tags">
                  <span className="meta-tag">{set.numberOfCards || set.flashcards?.length} cards</span>
                  <span className="meta-tag">{set.language}</span>
                  <span className={`meta-tag diff-${set.difficulty}`}>{set.difficulty}</span>
                </div>

                {/* Progress bar */}
                <div className="card-progress-section">
                  <div className="progress-labels">
                    <span>Mastery Progress</span>
                    <strong>{progress}%</strong>
                  </div>
                  <div className="card-progress-bar">
                    <div style={{ width: `${progress}%` }} />
                  </div>
                </div>

                {set.lastQuizScore !== null && set.lastQuizScore !== undefined && (
                  <div className="last-quiz-score-txt">
                    Last Quiz Result:{' '}
                    <strong>
                      {set.lastQuizScore} / {total}
                    </strong>
                  </div>
                )}

                {/* Delete Confirmation */}
                {deleteConfirmId === set.id ? (
                  <div className="delete-confirm-box" onClick={(e) => e.stopPropagation()}>
                    <span>Delete this set?</span>
                    <button
                      type="button"
                      className="btn-confirm-delete"
                      onClick={(e) => handleDelete(e, set.id)}
                    >
                      Yes, Delete
                    </button>
                    <button
                      type="button"
                      className="btn-cancel-delete"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteConfirmId(null)
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn-open-study-set"
                    onClick={() => onOpenStudySet(set)}
                  >
                    Open in Study Workspace →
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* SHARE MODAL */}
      {shareModalSet && (
        <div className="modal-overlay" onClick={() => setShareModalSet(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Share Study Set with Group</h3>
              <button type="button" className="close-btn" onClick={() => setShareModalSet(null)}>
                ×
              </button>
            </div>
            <p className="modal-desc">
              Share <strong>"{shareModalSet.title}"</strong> so members can review flashcards and compete on quizzes.
            </p>
            {shareSuccess ? (
              <div className="success-banner">{shareSuccess}</div>
            ) : (
              <form onSubmit={handleShareSubmit}>
                <label className="field-label">
                  Select Study Group:
                  <select
                    className="source-select"
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    required
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.member_count} members)
                      </option>
                    ))}
                  </select>
                </label>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-secondary-action"
                    onClick={() => setShareModalSet(null)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary-action">
                    Confirm & Share
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
