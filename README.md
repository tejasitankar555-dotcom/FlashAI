# FlashAI — Universal AI Learning & Collaboration Platform

**FlashAI** is an AI-powered educational technology platform engineered to transform static study materials into interactive, adaptive learning experiences. Students can process multiple source types, generate structured summaries and flashcards, take quizzes, consult an AI Tutor grounded in their materials, participate in collaborative peer study groups with live leaderboards, and optimize long-term retention using a Spaced Repetition System (SRS).

---

## 🌟 Core System Capabilities

### 1. 🌐 Universal Learning Inputs
FlashAI supports 8 distinct source input formats:
- **YouTube Lessons:** Automatic subtitle extraction with multilingual transcript selection.
- **PDF Documents:** Structured multi-page text extraction (`pypdf`).
- **PowerPoint Slide Decks:** Extraction of slide titles, bullet points, and speaker notes (`python-pptx`).
- **Word Documents:** Paragraph and table extraction (`python-docx`).
- **Diagrams & Screenshots:** AI Vision OCR and visual structure understanding.
- **Audio Recordings & Lectures:** Speech-to-text transcript generation.
- **Website & Article URLs:** Extraction and cleanup of educational articles (`beautifulsoup4`).
- **Typed Study Notes:** Direct text input for quick revision.

### 2. 🎴 Unified Learning Workspace
Once content is loaded, students can seamlessly switch between interactive study modes:
- **AI Summary & Key Concepts:** Structured executive summary with 5–8 high-yield concept tags.
- **Interactive Flashcards:** Themed in **Lavender & Violet** (`#F7F5FF`, `#6D5AE6`, `#EAE5FF`, `#25213B`, `#DDD6FE`, `#168A63`, `#D9485F`). Includes 3D card-flip animations, progress tracking, and navigation dots.
- **Assessment Quiz Player:** Themed in **Teal & Blue** (`#F0FAFA`, `#0F8B8D`, `#2563EB`, `#D9F3F1`, `#17343B`, `#BFE6E2`). Features 4-option questions, instant answer validation, scoring, and retakes.
- **Hierarchical Mind Maps:** Interactive visual node trees depicting concept dependencies.
- **Revision Notes:** Formatted study sheets with rules, formulas, and bullet points.
- **Exam & Viva Questions:** Academic questions with comprehensive model answers.
- **Source Inspection:** Full view of the raw extracted material.

### 3. 🎓 Grounded AI Tutor Chat
- Contextual Q&A grounded strictly in the loaded study material.
- Pre-built prompt chips (*"Explain simply"*, *"Give a real-world example"*, *"Key exam points"*).
- Clear indications when an answer is not covered in the source text.

### 4. 👥 Collaborative Peer Study Groups
- **Create & Join:** Unique 6-character invitation codes (e.g., `ADDB9F`).
- **Resource Sharing:** Share study sets with group members with one click.
- **Peer Discussions:** Real-time group messaging board with author and timestamp.
- **Verified Leaderboards:** Ranked by actual quiz scores and accuracy percentages.
- **Combined AI Summary:** Synthesize multiple shared study sets into one master revision guide.

### 5. 🔄 Spaced Repetition System (SRS)
- Scientifically-backed intervals (1 day, 3 days, 7 days, 14+ days) based on recall difficulty.
- Revision dashboard categorizing cards as **Due Today**, **In Learning**, **In Review**, and **Mastered**.
- Interactive review sessions with recall grading (*"Remembered"* vs. *"Needs Revision"*).

### 6. 📈 Real Academic Progress Analytics
- 100% computed from actual saved study sets, quiz logs, and SRS card ratings.
- Zero fabricated metrics or fake counters.

### 7. 📬 Automated Gmail Study Notifications & Retention Alerts
- **Real Gmail Delivery:** Sends styled HTML emails directly to students' Gmail accounts.
- **Daily Study Habit Reminder:** Dispatches an active-recall nudge if a student hasn't reviewed their materials today.
- **Inactivity Retention Alert:** Dispatches an urgent alert if a student has been inactive for 4 or more days (preventing forgetting curve decay).
- **Background Worker:** Automated scheduler runs in the FastAPI backend every 2 hours, querying inactivity records and dispatching reminders without manual intervention.
- **In-App Management:** In-app Notification Modal with 1-click test email verification and reminder simulation.

---

## 🏛️ System Architecture

```
FlashAI/
├── src/                          # React 19 + Vite Frontend
│   ├── components/
│   │   ├── Navbar.jsx            # Top navigation, user status & notification bell
│   │   ├── DashboardView.jsx     # Overview, study alert banner & launchpad
│   │   ├── NotificationModal.jsx # Gmail SMTP controls & email testing modal
│   │   ├── UniversalSourceUploader.jsx # 8-in-1 source uploader
│   │   ├── UnifiedStudyWorkspace.jsx   # Master multi-tab workspace
│   │   ├── MindMapViewer.jsx     # Interactive concept hierarchy
│   │   ├── AITutorChat.jsx       # Grounded AI tutor
│   │   ├── LibraryView.jsx       # Saved study sets & search
│   │   ├── StudyGroupsView.jsx   # Collaborative circles & leaderboards
│   │   ├── RevisionDashboard.jsx # Spaced repetition recall
│   │   └── ProgressAnalytics.jsx # Real performance metrics
│   ├── App.jsx                   # Application router & core state
│   ├── App.css                   # Polished Light Theme & Color Palettes
│   └── main.jsx
├── server/                       # FastAPI Python Backend
│   ├── services/
│   │   ├── gemini_service.py     # Resilient Gemini AI client & fallback
│   │   ├── email_service.py      # Real Gmail SMTP sender & styled HTML templates
│   │   ├── document_service.py   # PDF, DOCX, PPTX, text extractors
│   │   ├── website_service.py    # Clean web scraper
│   │   └── db_service.py         # SQLite relational storage, PBKDF2 auth & study tracking
│   ├── main.py                   # REST API routes, background reminder worker & CORS
│   ├── test_suite.py             # Backend unit test suite
│   ├── test_e2e_api.py           # End-to-end API integration tests
│   ├── requirements.txt          # Python dependencies
│   ├── .env                      # Active server environment variables
│   └── .env.example              # Configuration template
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18+)
- **Python** (v3.10+)
- **Google Gemini API Key** (Free tier supported)

### 1. Backend Setup
1. Open a terminal and navigate to the `server/` directory:
   ```powershell
   cd server
   ```
2. Activate your virtual environment:
   ```powershell
   .\venv\Scripts\activate
   ```
3. Install required Python packages:
   ```powershell
   pip install -r requirements.txt
   ```
4. Verify your `server/.env` file contains your Gemini API key and Gmail SMTP credentials:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here

   # Real Gmail SMTP Notification System
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASSWORD=your_16_character_app_password
   FROM_EMAIL=your_email@gmail.com
   APP_URL=http://localhost:5173
   ```

### 📧 Setting Up Gmail App Password for Real Emails
To send real emails from your Gmail account without Google security blocks:
1. Open your [Google Account Security Settings](https://myaccount.google.com/security).
2. Turn **ON** **2-Step Verification** (if not already enabled).
3. Search for **"App passwords"** or navigate directly to [Google App Passwords](https://myaccount.google.com/apppasswords).
4. Create an App Password with the name **FlashAI**.
5. Google will generate a 16-character code (e.g., `abcd efgh ijkl mnop`).
6. Copy the code and paste it into `server/.env` as `SMTP_PASSWORD` (remove any spaces).
7. In the FlashAI dashboard, click the **🔔 Notification** icon or the **"Check Email Status / Send Test"** button to send an instant verification email to your Gmail!

5. Start the FastAPI server:
   ```powershell
   uvicorn main:app --reload --port 8000
   ```
   *The backend will be available at `http://127.0.0.1:8000` (API docs at `http://127.0.0.1:8000/docs`).*

### 2. Frontend Setup
1. In the project root directory, install dependencies:
   ```powershell
   npm install
   ```
2. Start the Vite development server:
   ```powershell
   npm run dev
   ```
   *The frontend will run at `http://localhost:5173`.*

---

## 🧪 Running Automated Tests

Run backend unit and end-to-end API tests:
```powershell
cd server
.\venv\Scripts\python.exe test_suite.py
.\venv\Scripts\python.exe test_e2e_api.py
```

Build and type-check the frontend:
```powershell
npm run build
```
