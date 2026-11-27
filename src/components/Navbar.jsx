import React from 'react'

export default function Navbar({ activeNav, setActiveNav, currentUser, onLogout, onOpenNotifications }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'learn', label: 'Learn Workspace' },
    { id: 'library', label: 'My Library' },
    { id: 'groups', label: 'Study Groups' },
    { id: 'revision', label: 'Revision (SRS)' },
    { id: 'progress', label: 'Analytics' },
  ]

  return (
    <header className="navbar">
      <div className="nav-left">
        <a
          href="#dashboard"
          className="brand"
          onClick={(e) => {
            e.preventDefault()
            setActiveNav('dashboard')
          }}
        >
          <span className="brand-mark">✦</span>
          <span>Flash<span>AI</span></span>
        </a>
      </div>

      <nav className="nav-links">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`nav-tab-btn ${activeNav === item.id ? 'active' : ''}`}
            onClick={() => setActiveNav(item.id)}
          >
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="nav-right">
        {currentUser ? (
          <>
            <button
              type="button"
              className="nav-notif-btn"
              onClick={onOpenNotifications}
              title="Gmail Notifications & Study Reminders"
              aria-label="Study Notifications"
            >
              <svg
                className="bell-svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span className="notif-badge-dot" />
            </button>

            <div className="user-profile-menu">
              <span className="user-avatar">
                {currentUser.name ? currentUser.name[0].toUpperCase() : (currentUser.email ? currentUser.email[0].toUpperCase() : 'U')}
              </span>
              <div className="user-info-text">
                <span className="user-name">{currentUser.name || currentUser.email?.split('@')[0]}</span>
                <span className="user-role">Student</span>
              </div>
              <button
                type="button"
                className="auth-logout-btn"
                onClick={onLogout}
                title="Sign out of FlashAI"
              >
                Sign out
              </button>
            </div>
          </>
        ) : null}
      </div>
    </header>
  )
}
