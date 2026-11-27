import React, { useState, useEffect } from 'react'

export default function StudyGroupsView({
  apiBase,
  currentUser,
  onOpenStudySet,
}) {
  const [groups, setGroups] = useState([])
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Modal / Form state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [groupDesc, setGroupDesc] = useState('')
  const [joinCode, setJoinCode] = useState('')

  // Group detail view state
  const [activeTab, setActiveTab] = useState('sets') // sets, discussions, leaderboard, combined
  const [discussions, setDiscussions] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [leaderboard, setLeaderboard] = useState([])

  // Combined summary state
  const [selectedSetIds, setSelectedSetIds] = useState([])
  const [combinedSummary, setCombinedSummary] = useState(null)
  const [loadingCombined, setLoadingCombined] = useState(false)

  // Delete group state
  const [groupToDelete, setGroupToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchUserGroups = async () => {
    if (!currentUser) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${apiBase}/groups?user_id=${currentUser.id}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to load study groups.')
      setGroups(data.groups || [])
    } catch (err) {
      setError(err.message || 'Error fetching groups.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUserGroups()
  }, [currentUser])

  const handleCreateGroup = async (e) => {
    e.preventDefault()
    if (!groupName.trim()) {
      setError('Group name is required.')
      return
    }
    setError('')
    try {
      const res = await fetch(`${apiBase}/groups/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: groupName.trim(),
          description: groupDesc.trim(),
          user_id: currentUser.id,
          user_name: currentUser.name,
          user_email: currentUser.email,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Could not create group.')

      setSuccessMsg(`Group "${data.name}" created! Invite code: ${data.invite_code}`)
      setShowCreateModal(false)
      setGroupName('')
      setGroupDesc('')
      fetchUserGroups()
    } catch (err) {
      setError(err.message || 'Group creation failed.')
    }
  }

  const handleJoinGroup = async (e) => {
    e.preventDefault()
    if (!joinCode.trim()) {
      setError('Please enter the 6-character invitation code.')
      return
    }
    setError('')
    try {
      const res = await fetch(`${apiBase}/groups/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invite_code: joinCode.trim().toUpperCase(),
          user_id: currentUser.id,
          user_name: currentUser.name,
          user_email: currentUser.email,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Could not join group.')

      setSuccessMsg(`Joined group "${data.name}" successfully!`)
      setShowJoinModal(false)
      setJoinCode('')
      fetchUserGroups()
    } catch (err) {
      setError(err.message || 'Could not join group.')
    }
  }

  const openGroupDetails = async (groupId) => {
    setError('')
    setSuccessMsg('')
    try {
      const res = await fetch(`${apiBase}/groups/${groupId}?user_id=${currentUser.id}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to load group details.')

      setSelectedGroup(data)
      setActiveTab('sets')
      loadGroupTab(groupId, 'sets')
    } catch (err) {
      setError(err.message || 'Error opening group.')
    }
  }

  const handleDeleteGroup = async () => {
    if (!groupToDelete || !currentUser) return
    setIsDeleting(true)
    setError('')
    try {
      const res = await fetch(`${apiBase}/groups/${groupToDelete.id}?user_id=${currentUser.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to delete study group.')

      setSuccessMsg(data.message || `Study group "${groupToDelete.name}" deleted successfully.`)
      if (selectedGroup && selectedGroup.id === groupToDelete.id) {
        setSelectedGroup(null)
      }
      setGroupToDelete(null)
      fetchUserGroups()
    } catch (err) {
      setError(err.message || 'Error deleting study group.')
    } finally {
      setIsDeleting(false)
    }
  }

  const loadGroupTab = async (groupId, tab) => {
    if (tab === 'discussions') {
      try {
        const res = await fetch(`${apiBase}/groups/${groupId}/discussions?user_id=${currentUser.id}`)
        const data = await res.json()
        setDiscussions(data.discussions || [])
      } catch (err) {
        console.error(err)
      }
    } else if (tab === 'leaderboard') {
      try {
        const res = await fetch(`${apiBase}/groups/${groupId}/leaderboard?user_id=${currentUser.id}`)
        const data = await res.json()
        setLeaderboard(data.leaderboard || [])
      } catch (err) {
        console.error(err)
      }
    }
  }

  const handleSendDiscussion = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedGroup) return
    try {
      const res = await fetch(`${apiBase}/groups/${selectedGroup.id}/discussions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          author_name: currentUser.name,
          message: newMessage.trim(),
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setDiscussions([...discussions, data])
        setNewMessage('')
      }
    } catch (err) {
      console.error(err)
    }
  }

  const toggleSelectSet = (id) => {
    if (selectedSetIds.includes(id)) {
      setSelectedSetIds(selectedSetIds.filter((x) => x !== id))
    } else {
      setSelectedSetIds([...selectedSetIds, id])
    }
  }

  const handleGenerateCombinedSummary = async () => {
    if (selectedSetIds.length === 0) {
      setError('Select at least one shared study set.')
      return
    }
    const chosenSets = selectedGroup.shared_sets.filter((s) => selectedSetIds.includes(s.id))
    const texts = chosenSets.map((s) => {
      const set = s.study_set
      return `Study Set: ${s.title}\nSummary: ${set.summary || ''}\nKey Concepts: ${(set.keyConcepts || []).join(', ')}`
    })

    setLoadingCombined(true)
    setError('')
    try {
      const res = await fetch(`${apiBase}/groups/${selectedGroup.id}/combined-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          study_set_ids: selectedSetIds.map(String),
          texts,
          language: 'English',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Combined summary generation failed.')
      setCombinedSummary(data)
    } catch (err) {
      setError(err.message || 'Combined summary failed.')
    } finally {
      setLoadingCombined(false)
    }
  }

  return (
    <div className="study-groups-view">
      <div className="groups-header-row">
        <div>
          <span className="section-kicker">COLLABORATIVE PEER LEARNING</span>
          <h2>AI Study Groups</h2>
          <p>Form study circles, share curated flashcards & quizzes, discuss concepts, and compete on group leaderboards.</p>
        </div>
        <div className="group-action-btns">
          <button
            type="button"
            className="btn-secondary-action"
            onClick={() => setShowJoinModal(true)}
          >
            + Join by Code
          </button>
          <button
            type="button"
            className="btn-primary-action"
            onClick={() => setShowCreateModal(true)}
          >
            Create Study Group
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {successMsg && <div className="success-banner">{successMsg}</div>}

      {/* Selected Group Detail View */}
      {selectedGroup ? (
        <div className="selected-group-panel">
          <div className="group-detail-header">
            <button
              type="button"
              className="btn-back-link"
              onClick={() => setSelectedGroup(null)}
            >
              ← All Groups
            </button>
            <div className="group-title-row">
              <div>
                <h3>{selectedGroup.name}</h3>
                <p>{selectedGroup.description || 'No description provided.'}</p>
              </div>
              <div className="group-header-right-actions">
                <div className="group-code-badge">
                  <span>Invite Code:</span>
                  <strong>{selectedGroup.invite_code}</strong>
                </div>
                {selectedGroup.owner_id === currentUser?.id && (
                  <button
                    type="button"
                    className="btn-delete-group"
                    onClick={() => setGroupToDelete(selectedGroup)}
                    title="Delete this study group"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                    Delete Group
                  </button>
                )}
              </div>
            </div>

            <div className="group-subtabs">
              <button
                type="button"
                className={`subtab-btn ${activeTab === 'sets' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('sets')
                  loadGroupTab(selectedGroup.id, 'sets')
                }}
              >
                Shared Study Sets ({selectedGroup.shared_sets?.length || 0})
              </button>
              <button
                type="button"
                className={`subtab-btn ${activeTab === 'discussions' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('discussions')
                  loadGroupTab(selectedGroup.id, 'discussions')
                }}
              >
                Discussions
              </button>
              <button
                type="button"
                className={`subtab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('leaderboard')
                  loadGroupTab(selectedGroup.id, 'leaderboard')
                }}
              >
                Quiz Leaderboard
              </button>
              <button
                type="button"
                className={`subtab-btn ${activeTab === 'combined' ? 'active' : ''}`}
                onClick={() => setActiveTab('combined')}
              >
                Combined AI Summary
              </button>
            </div>
          </div>

          <div className="group-subtab-content">
            {/* SHARED SETS TAB */}
            {activeTab === 'sets' && (
              <div className="shared-sets-area">
                {selectedGroup.shared_sets?.length === 0 ? (
                  <div className="empty-subtab">
                    <span className="empty-icon">📚</span>
                    <h4>No Study Sets Shared Yet</h4>
                    <p>Go to "My Library" and click "Share to Group" on any of your study sets to collaborate with peers.</p>
                  </div>
                ) : (
                  <div className="shared-sets-grid">
                    {selectedGroup.shared_sets.map((item) => (
                      <div key={item.id} className="shared-set-card">
                        <div className="card-top">
                          <span className="shared-by-tag">Shared by {item.user_name}</span>
                          <span className="shared-date">{new Date(item.shared_at).toLocaleDateString()}</span>
                        </div>
                        <h4>{item.title}</h4>
                        <div className="set-quick-meta">
                          <span>{item.study_set?.flashcards?.length || 0} Flashcards</span>
                          <span>•</span>
                          <span>{item.study_set?.difficulty || 'Medium'}</span>
                        </div>
                        <button
                          type="button"
                          className="btn-study-shared"
                          onClick={() => onOpenStudySet(item.study_set)}
                        >
                          Open in Workspace →
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* DISCUSSIONS TAB */}
            {activeTab === 'discussions' && (
              <div className="discussions-area">
                <div className="discussions-stream">
                  {discussions.length === 0 ? (
                    <p className="no-msgs-txt">No discussions yet. Start a conversation with your peers!</p>
                  ) : (
                    discussions.map((msg) => (
                      <div key={msg.id} className="discussion-post-card">
                        <div className="post-header">
                          <strong>{msg.author_name}</strong>
                          <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p>{msg.message}</p>
                      </div>
                    ))
                  )}
                </div>
                <form className="discussion-input-form" onSubmit={handleSendDiscussion}>
                  <input
                    type="text"
                    className="discussion-text-input"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Ask a question or share a thought with the group..."
                  />
                  <button type="submit" className="btn-send-discussion" disabled={!newMessage.trim()}>
                    Post Message
                  </button>
                </form>
              </div>
            )}

            {/* LEADERBOARD TAB */}
            {activeTab === 'leaderboard' && (
              <div className="leaderboard-area">
                <h4>Verified Group Quiz Rankings</h4>
                <p className="leaderboard-subtitle">Calculated from actual completed quiz attempts by group members.</p>
                {leaderboard.length === 0 ? (
                  <div className="empty-subtab">
                    <span className="empty-icon">🏆</span>
                    <h4>No Quiz Submissions Yet</h4>
                    <p>Complete a quiz on any shared study set to record your score on the leaderboard.</p>
                  </div>
                ) : (
                  <div className="leaderboard-table">
                    <div className="table-header-row">
                      <span>Rank</span>
                      <span>Student</span>
                      <span>Total Score</span>
                      <span>Quizzes Taken</span>
                      <span>Accuracy</span>
                    </div>
                    {leaderboard.map((entry, idx) => (
                      <div key={idx} className={`table-data-row ${idx === 0 ? 'rank-first' : ''}`}>
                        <span className="rank-num">#{idx + 1}</span>
                        <span className="student-name">{entry.user_name}</span>
                        <span className="total-pts"><strong>{entry.total_score}</strong> / {entry.possible_score}</span>
                        <span>{entry.quizzes_taken}</span>
                        <span className="accuracy-pct">{entry.avg_accuracy}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* COMBINED SUMMARY TAB */}
            {activeTab === 'combined' && (
              <div className="combined-summary-area">
                <h4>Generate Multi-Source Combined Summary</h4>
                <p>Select multiple study sets shared in this group to synthesize one comprehensive revision guide.</p>
                <div className="sets-checkbox-list">
                  {selectedGroup.shared_sets?.map((s) => (
                    <label key={s.id} className="checkbox-item">
                      <input
                        type="checkbox"
                        checked={selectedSetIds.includes(s.id)}
                        onChange={() => toggleSelectSet(s.id)}
                      />
                      <span>{s.title} (by {s.user_name})</span>
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  className="btn-primary-action"
                  onClick={handleGenerateCombinedSummary}
                  disabled={loadingCombined || selectedSetIds.length === 0}
                >
                  {loadingCombined ? 'Synthesizing Combined Summary...' : 'Synthesize Combined AI Summary →'}
                </button>

                {combinedSummary && (
                  <div className="combined-summary-result">
                    <h4>Comprehensive Summary</h4>
                    <p>{combinedSummary.summary}</p>
                    {combinedSummary.key_concepts && (
                      <div className="key-concepts-chips">
                        {combinedSummary.key_concepts.map((c, i) => (
                          <span key={i} className="concept-chip">✓ {c}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Groups List */
        <div className="groups-list-container">
          {loading ? (
            <p className="loading-txt">Loading your study groups...</p>
          ) : groups.length === 0 ? (
            <div className="empty-groups-box">
              <span className="empty-ico">👥</span>
              <h3>No Study Groups Joined Yet</h3>
              <p>Create a group for your course or enter an invitation code from your classmate.</p>
              <div className="empty-btns-row">
                <button
                  type="button"
                  className="btn-primary-action"
                  onClick={() => setShowCreateModal(true)}
                >
                  Create First Group
                </button>
                <button
                  type="button"
                  className="btn-secondary-action"
                  onClick={() => setShowJoinModal(true)}
                >
                  Join via Code
                </button>
              </div>
            </div>
          ) : (
            <div className="groups-cards-grid">
              {groups.map((g) => (
                <div key={g.id} className="group-overview-card" onClick={() => openGroupDetails(g.id)}>
                  <div className="card-top-line">
                    <span className="members-badge">👥 {g.member_count} Members</span>
                    <div className="card-top-right">
                      <span className="code-pill">Code: {g.invite_code}</span>
                      {g.owner_id === currentUser?.id && (
                        <button
                          type="button"
                          className="btn-delete-card-icon"
                          title="Delete study group"
                          onClick={(e) => {
                            e.stopPropagation()
                            setGroupToDelete(g)
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                  <h3>{g.name}</h3>
                  <p>{g.description || 'Collaborative study space'}</p>
                  <div className="card-footer">
                    <span>{g.shared_sets_count || 0} Shared Sets</span>
                    <span className="open-arrow">Open Group →</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Study Group</h3>
              <button type="button" className="close-btn" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateGroup}>
              <label className="field-label">
                Group Name
                <input
                  type="text"
                  className="source-text-input"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. Database Management Systems (Semester 4)"
                  required
                />
              </label>
              <label className="field-label">
                Description / Course Focus
                <textarea
                  className="source-textarea"
                  rows={3}
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  placeholder="e.g. Preparing for midterms and sharing SQL flashcards."
                />
              </label>
              <div className="modal-actions">
                <button type="button" className="btn-secondary-action" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary-action">
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* JOIN MODAL */}
      {showJoinModal && (
        <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Join Study Group</h3>
              <button type="button" className="close-btn" onClick={() => setShowJoinModal(false)}>×</button>
            </div>
            <form onSubmit={handleJoinGroup}>
              <label className="field-label">
                6-Character Invitation Code
                <input
                  type="text"
                  className="source-text-input"
                  maxLength={6}
                  style={{ textTransform: 'uppercase', letterSpacing: '3px', fontWeight: 'bold' }}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="e.g. ADDB9F"
                  required
                />
              </label>
              <div className="modal-actions">
                <button type="button" className="btn-secondary-action" onClick={() => setShowJoinModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary-action">
                  Join Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE GROUP CONFIRMATION MODAL */}
      {groupToDelete && (
        <div className="modal-overlay" onClick={() => !isDeleting && setGroupToDelete(null)}>
          <div className="modal-dialog modal-dialog-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ color: '#dc2626' }}>Delete Study Group</h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => !isDeleting && setGroupToDelete(null)}
                disabled={isDeleting}
              >
                ×
              </button>
            </div>
            <div className="delete-modal-body">
              <p>
                Are you sure you want to permanently delete <strong>"{groupToDelete.name}"</strong>?
              </p>
              <p className="delete-modal-warning">
                ⚠️ This will permanently remove all shared study sets, group discussions, member records, and quiz leaderboard scores. This action cannot be undone.
              </p>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary-action"
                onClick={() => setGroupToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger-action"
                onClick={handleDeleteGroup}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Group'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
