import unittest
from fastapi.testclient import TestClient
from main import app
from services import db_service

client = TestClient(app)

class TestE2EAPI(unittest.TestCase):
    def setUp(self):
        db_service.init_db()

    def test_root_and_health(self):
        r1 = client.get("/")
        self.assertEqual(r1.status_code, 200)
        self.assertIn("FlashAI", r1.json()["message"])

        r2 = client.get("/health")
        self.assertEqual(r2.status_code, 200)
        self.assertEqual(r2.json()["status"], "ok")

    def test_sources_notes(self):
        r = client.post("/sources/notes", json={
            "notes": "Relational databases use SQL to query structured data organized into tables.",
            "title": "DBMS Notes"
        })
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(data["source_type"], "notes")
        self.assertEqual(data["filename"], "DBMS Notes")
        self.assertIn("Relational databases", data["text"])

    def test_sources_upload_txt(self):
        sample_txt = b"Artificial intelligence enables machines to mimic cognitive human problem-solving."
        r = client.post(
            "/sources/upload",
            files={"file": ("lecture.txt", sample_txt, "text/plain")}
        )
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(data["source_type"], "notes")
        self.assertIn("Artificial intelligence", data["text"])

    def test_auth_and_groups_full_flow(self):
        import uuid
        uid = uuid.uuid4().hex[:6]
        # 1. Register Owner
        reg1 = client.post("/auth/register", json={
            "name": "Sarah Connor",
            "email": f"sarah_{uid}@cyberdyne.org",
            "password": "terminatorpass"
        })
        self.assertEqual(reg1.status_code, 200)
        u1 = reg1.json()

        # 2. Register Member
        reg2 = client.post("/auth/register", json={
            "name": "John Connor",
            "email": f"john_{uid}@cyberdyne.org",
            "password": "resistancepass"
        })
        self.assertEqual(reg2.status_code, 200)
        u2 = reg2.json()

        # 3. Create Group
        grp_res = client.post("/groups/create", json={
            "name": "AI & Robotics",
            "description": "Autonomous systems course",
            "user_id": u1["id"],
            "user_name": u1["name"],
            "user_email": u1["email"]
        })
        self.assertEqual(grp_res.status_code, 200)
        group = grp_res.json()
        group_id = group["id"]
        invite_code = group["invite_code"]

        # 4. Member Joins Group
        join_res = client.post("/groups/join", json={
            "invite_code": invite_code,
            "user_id": u2["id"],
            "user_name": u2["name"],
            "user_email": u2["email"]
        })
        self.assertEqual(join_res.status_code, 200)

        # 5. Share Study Set
        share_res = client.post(f"/groups/{group_id}/share", json={
            "user_id": u1["id"],
            "user_name": u1["name"],
            "study_set": {
                "title": "Robotics Laws",
                "numberOfCards": 3,
                "flashcards": [
                    {"question": "First Law?", "answer": "Do not harm a human", "options": ["Do not harm a human", "A", "B", "C"]}
                ]
            }
        })
        self.assertEqual(share_res.status_code, 200)

        # 6. Post and Get Discussions
        disc_res = client.post(f"/groups/{group_id}/discussions", json={
            "user_id": u2["id"],
            "author_name": u2["name"],
            "message": "Are we studying Asimov's laws?"
        })
        self.assertEqual(disc_res.status_code, 200)

        get_disc = client.get(f"/groups/{group_id}/discussions?user_id={u1['id']}")
        self.assertEqual(get_disc.status_code, 200)
        self.assertTrue(len(get_disc.json()["discussions"]) >= 1)

        # 7. Submit Quiz and Check Leaderboard
        quiz_sub = client.post(f"/groups/{group_id}/quiz-submit", json={
            "user_id": u2["id"],
            "user_name": u2["name"],
            "study_set_id": "123",
            "study_set_title": "Robotics Laws",
            "score": 3,
            "total": 3
        })
        self.assertEqual(quiz_sub.status_code, 200)
        self.assertEqual(quiz_sub.json()["percentage"], 100.0)

        l_res = client.get(f"/groups/{group_id}/leaderboard?user_id={u1['id']}")
        self.assertEqual(l_res.status_code, 200)
        lb = l_res.json()["leaderboard"]
        self.assertTrue(len(lb) >= 1)
        self.assertEqual(lb[0]["user_name"], "John Connor")

        # 8. Spaced Repetition API
        srs_res = client.post("/revision/card", json={
            "user_id": u2["id"],
            "card_id": "card_rob_1",
            "study_set_id": "123",
            "question": "First Law of Robotics?",
            "answer": "Do not harm human",
            "options": ["Do not harm human", "Obey orders", "Protect self", "None"],
            "known": True
        })
        self.assertEqual(srs_res.status_code, 200)

        all_rev = client.get(f"/revision/all?user_id={u2['id']}")
        self.assertEqual(all_rev.status_code, 200)
        self.assertTrue(len(all_rev.json()["cards"]) >= 1)

        # 9. Analytics API
        analytics_res = client.get(f"/analytics/{u2['id']}")
        self.assertEqual(analytics_res.status_code, 200)
        stats = analytics_res.json()
        self.assertEqual(stats["total_cards_tracked"], 1)
        self.assertEqual(stats["groups_joined"], 1)

        # 10. Notifications API
        notif_status = client.get("/notifications/status")
        self.assertEqual(notif_status.status_code, 200)
        n_data = notif_status.json()
        self.assertIn("smtp_configured", n_data)
        self.assertIn("pending_reminders_count", n_data)

if __name__ == "__main__":
    unittest.main()
