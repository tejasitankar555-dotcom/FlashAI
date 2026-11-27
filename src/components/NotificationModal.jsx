import React, { useState, useEffect } from 'react'

const API_BASE = 'http://127.0.0.1:8000'

export default function NotificationModal({ currentUser, isOpen, onClose }) {
  const [status, setStatus] = useState(null)
  const [loadingStatus, setLoadingStatus] = useState(false)

  // Test email state
  const [testEmail, setTestEmail] = useState(currentUser?.email || '')
  const [isSendingTest, setIsSendingTest] = useState(false)
  const [testMessage, setTestMessage] = useState({ type: '', text: '' })

  // Help drawer toggle
  const [showSetupGuide, setShowSetupGuide] = useState(false)

  useEffect(() => {
    if (currentUser?.email) {
      setTestEmail(currentUser.email)
    }
  }, [currentUser])

  const fetchStatus = async () => {
    setLoadingStatus(true)
    try {
      const res = await fetch(`${API_BASE}/notifications/status`)
      if (res.ok) {
        const data = await res.json()
        setStatus(data)
      }
    } catch (err) {
      console.warn('Could not reach backend notification status:', err)
    } finally {
      setLoadingStatus(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchStatus()
      setTestMessage({ type: '', text: '' })
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSendTest = async (e) => {
    e.preventDefault()
    if (!testEmail) return
    setIsSendingTest(true)
    setTestMessage({ type: '', text: '' })

    try {
      const res = await fetch(`${API_BASE}/notifications/test-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_email: testEmail.trim(),
          user_name: currentUser?.name || 'Student',
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setTestMessage({
          type: 'success',
          text: `✓ Verification email sent to ${testEmail}! Check your inbox (and Spam/Promotions folder).`,
        })
      } else {
        setTestMessage({
          type: 'error',
          text: data.detail || 'Failed to send test email. Please check server/.env credentials.',
        })
      }
    } catch (err) {
      setTestMessage({
        type: 'error',
        text: 'Network error connecting to backend email service. Ensure FastAPI server is running.',
      })
    } finally {
      setIsSendingTest(false)
    }
  }

  const isConfigured = status?.smtp_configured

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card notification-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px' }}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-with-icon">
            <span className="modal-header-icon">📧</span>
            <div>
              <h3>Email Notifications & Daily Study Reminders</h3>
              <p className="modal-subtitle">
                Automated Gmail alerts for study reminders and inactivity retention
              </p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-content">
          {/* Status Bar */}
          <div className={`smtp-status-banner ${isConfigured ? 'connected' : 'warning'}`}>
            <div className="smtp-status-info">
              <span className="status-indicator-dot" />
              <div>
                <strong>
                  {isConfigured
                    ? 'Gmail SMTP Server Connected'
                    : 'Gmail SMTP Not Yet Configured'}
                </strong>
                <p>
                  {isConfigured
                    ? `Active Sender: ${status?.sender_email || 'Configured in .env'}`
                    : 'Add your Gmail and App Password to server/.env to start sending real emails.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              className="guide-toggle-btn"
              onClick={() => setShowSetupGuide(!showSetupGuide)}
            >
              {showSetupGuide ? 'Hide Setup Guide ▲' : 'Setup Guide ▼'}
            </button>
          </div>

          {/* Setup Guide Collapsible */}
          {showSetupGuide && (
            <div className="smtp-setup-guide">
              <h4>✦ How to set up real Gmail sending in 2 minutes:</h4>
              <ol>
                <li>
                  Go to your Google Account:{' '}
                  <a
                    href="https://myaccount.google.com/security"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Google Security Settings
                  </a>
                </li>
                <li>Turn ON <strong>2-Step Verification</strong> (if not already enabled).</li>
                <li>
                  Search for <strong>"App passwords"</strong> or go to{' '}
                  <a
                    href="https://myaccount.google.com/apppasswords"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Google App Passwords
                  </a>
                </li>
                <li>Create an App Password named <strong>FlashAI</strong>.</li>
                <li>
                  Copy the 16-letter code and open <code>server/.env</code> in your project:
                  <pre>
                    SMTP_USER=your_email@gmail.com{'\n'}
                    SMTP_PASSWORD=xxxx xxxx xxxx xxxx (remove spaces){'\n'}
                    FROM_EMAIL=your_email@gmail.com
                  </pre>
                </li>
                <li>Restart the server. All emails will now send directly from your Gmail!</li>
              </ol>
            </div>
          )}

          {/* Feature Highlight Cards */}
          <div className="email-features-grid">
            <div className="email-feature-card">
              <span className="feature-icon">⏳</span>
              <div>
                <strong>Daily Study Reminder</strong>
                <p>Dispatched automatically when a student hasn't reviewed their materials today.</p>
              </div>
            </div>

            <div className="email-feature-card">
              <span className="feature-icon">⚠️</span>
              <div>
                <strong>4+ Days Inactivity Alert</strong>
                <p>Urgent retention reminder sent if a student hasn't studied in 4 or more days.</p>
              </div>
            </div>
          </div>

          {/* Send Instant Test Email Section */}
          <div className="modal-section-box">
            <h4>Send Verification Test Email</h4>
            <p className="section-desc">
              Sends an immediate styled HTML test email to verify your Gmail SMTP connection.
            </p>

            <form onSubmit={handleSendTest} className="test-email-form">
              <div className="test-email-input-row">
                <input
                  type="email"
                  className="test-email-input-field"
                  placeholder="recipient@gmail.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  required
                />
                <button
                  type="submit"
                  className="test-email-submit-btn"
                  disabled={isSendingTest || !isConfigured}
                  title={!isConfigured ? 'Configure SMTP_USER and SMTP_PASSWORD in server/.env first' : ''}
                >
                  {isSendingTest ? 'Sending...' : 'Send Test Email →'}
                </button>
              </div>
            </form>

            {testMessage.text && (
              <div className={`notification-alert-box ${testMessage.type}`}>
                {testMessage.text}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <span className="worker-note">
            <span className="worker-dot" /> Automated background study reminder active
          </span>
          <button type="button" className="btn-secondary-action modal-close-btn-footer" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}