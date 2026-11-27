import unittest
import io
import json
from services import db_service, document_service, website_service, gemini_service

class TestFlashAIServer(unittest.TestCase):
    def setUp(self):
        db_service.init_db()

    def test_database_user_and_auth(self):
        import uuid
        uid = uuid.uuid4().hex[:6]
        email = f"student_{uid}@flashai.test"
        # Register
        u = db_service.create_user("Alice Test", email, "password123")
        self.assertEqual(u["name"], "Alice Test")
        self.assertEqual(u["email"], email.lower())

        # Authenticate with correct pw
        auth_success = db_service.authenticate_user(email, "password123")
        self.assertIsNotNone(auth_success)
        self.assertEqual(auth_success["id"], u["id"])

        # Authenticate with wrong pw
        auth_fail = db_service.authenticate_user(email, "wrongpw")
        self.assertIsNone(auth_fail)

    def test_study_groups_flow(self):
        import uuid
        uid = uuid.uuid4().hex[:6]
        u1 = db_service.create_user("Owner Bob", f"bob_{uid}@flashai.test", "bobpass123")
        u2 = db_service.create_user("Member Charlie", f"charlie_{uid}@flashai.test", "charliepass123")

        # Create group
        group = db_service.create_study_group("Operating Systems", "OS course study", u1["id"], u1["name"], u1["email"])
        self.assertIn("invite_code", group)
        invite_code = group["invite_code"]

        # Join group
        joined = db_service.join_study_group(invite_code, u2["id"], u2["name"], u2["email"])
        self.assertEqual(joined["id"], group["id"])

        # Share study set
        mock_set = {
            "title": "CPU Scheduling Flashcards",
            "numberOfCards": 5,
            "flashcards": [{"question": "What is FCFS?", "answer": "First Come First Served", "options": ["First Come First Served", "A", "B", "C"]}]
        }
        shared = db_service.share_study_set(group["id"], u1["id"], u1["name"], mock_set)
        self.assertEqual(shared["title"], "CPU Scheduling Flashcards")

        # Discussion
        post = db_service.add_discussion_post(group["id"], u2["id"], u2["name"], "Can someone explain Round Robin?")
        self.assertEqual(post["author_name"], "Member Charlie")

        discussions = db_service.get_group_discussions(group["id"], u1["id"])
        self.assertTrue(len(discussions) >= 1)

        # Quiz submission & leaderboard
        db_service.submit_quiz_score(group["id"], u2["id"], u2["name"], "set_1", "CPU Scheduling", 4, 5)
        leaderboard = db_service.get_group_leaderboard(group["id"], u1["id"])
        self.assertTrue(len(leaderboard) >= 1)
        self.assertEqual(leaderboard[0]["user_name"], "Member Charlie")
        self.assertEqual(leaderboard[0]["total_score"], 4)

    def test_document_extraction_notes(self):
        notes_text = "Data Structures: Arrays store items in contiguous memory. Linked lists store elements with pointers."
        res = document_service.extract_text_from_notes(notes_text, "Data Structures")
        self.assertEqual(res["source_type"], "notes")
        self.assertTrue(res["word_count"] > 5)

    def test_spaced_repetition(self):
        import uuid
        uid = uuid.uuid4().hex[:6]
        u = db_service.create_user("Review Dave", f"dave_{uid}@flashai.test", "davepass123")
        res1 = db_service.save_revision_item(
            user_id=u["id"],
            card_id="card_101",
            study_set_id="set_5",
            question="What is an index in DBMS?",
            answer="A data structure that improves data retrieval speed.",
            options=["A data structure", "A file", "A table", "A query"],
            known=True
        )
        self.assertEqual(res1["card_id"], "card_101")
        all_rev = db_service.get_all_revisions(u["id"])
        self.assertEqual(len(all_rev), 1)

    def test_email_notifications_and_tracking(self):
        import uuid
        from services import email_service
        uid = uuid.uuid4().hex[:6]
        user = db_service.create_user("Reminder Student", f"student_{uid}@gmail.com", "pass123")
        
        # Test studying updates timestamp
        db_service.update_user_activity(user["id"])
        
        # Test HTML template generation works cleanly
        html = email_service.get_base_html_template(
            title="Test Email",
            preview_text="Preview",
            content_html="<p>Test</p>",
            action_url="http://localhost:5173",
            action_label="Start Study"
        )
        self.assertIn("FlashAI", html)
        self.assertIn("Test", html)

        # Test users needing reminder query
        needing = db_service.get_users_needing_reminders()
        self.assertIsInstance(needing, list)

if __name__ == "__main__":
    unittest.main()
