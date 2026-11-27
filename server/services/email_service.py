import os
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("flashai.email")

def get_smtp_config():
    load_dotenv(override=True)
    host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER", "").strip()
    password = os.getenv("SMTP_PASSWORD", "").strip().replace(" ", "")
    from_email = os.getenv("FROM_EMAIL", user).strip() or user
    app_url = os.getenv("APP_URL", "http://localhost:5173").strip()
    return host, port, user, password, from_email, app_url

SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_USER = ""
SMTP_PASSWORD = ""
FROM_EMAIL = ""
APP_URL = "http://localhost:5173"

def refresh_config():
    global SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, FROM_EMAIL, APP_URL
    host, port, user, password, from_email, app_url = get_smtp_config()
    SMTP_HOST = host
    SMTP_PORT = port
    SMTP_USER = user
    SMTP_PASSWORD = password
    FROM_EMAIL = from_email
    APP_URL = app_url

refresh_config()

def is_smtp_configured() -> bool:
    """Check if SMTP credentials are provided in environment variables."""
    refresh_config()
    return bool(SMTP_USER and SMTP_PASSWORD)

def get_base_html_template(title: str, preview_text: str, content_html: str, action_url: str, action_label: str) -> str:
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f7fb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0b1220;">
  <div style="display: none; max-height: 0px; overflow: hidden;">{preview_text}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f7fb; padding: 40px 10px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 20px; border: 1px solid #e4e8f0; box-shadow: 0 10px 35px rgba(13, 28, 52, 0.06); overflow: hidden;">
          
          <!-- Header Bar -->
          <tr>
            <td style="padding: 28px 36px; background-color: #ffffff; border-bottom: 1px solid #edf1f7;">
              <table role="presentation" width="100%">
                <tr>
                  <td>
                    <span style="font-size: 22px; font-weight: 850; color: #0b1220; letter-spacing: -0.5px;">
                      <span style="color: #6D5AE6;">✦</span> Flash<span style="color: #2764ff;">AI</span>
                    </span>
                  </td>
                  <td align="right">
                    <span style="font-size: 11px; font-weight: 800; background-color: #edf3ff; color: #2764ff; padding: 5px 10px; border-radius: 6px; letter-spacing: 0.8px;">
                      STUDY REMINDER
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 36px 36px 28px 36px;">
              {content_html}

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 32px 0 16px 0;">
                <tr>
                  <td align="center">
                    <a href="{action_url}" target="_blank" style="display: inline-block; background-color: #2764ff; color: #ffffff; font-size: 15px; font-weight: 750; text-decoration: none; padding: 14px 34px; border-radius: 12px; box-shadow: 0 4px 14px rgba(39, 100, 255, 0.3);">
                      {action_label} →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Tip / Footer Box -->
          <tr>
            <td style="padding: 20px 36px; background-color: #fbfcfe; border-top: 1px solid #edf1f7; font-size: 12px; color: #657085; line-height: 1.6;">
              <p style="margin: 0;">
                💡 <strong>The Spaced Repetition Rule:</strong> Reviewing just 5 minutes today protects 80% of what you learned from being forgotten.
              </p>
            </td>
          </tr>

          <!-- Legal / Unsubscribe -->
          <tr>
            <td style="padding: 24px 36px; background-color: #ffffff; text-align: center; font-size: 11px; color: #8993a6;">
              <p style="margin: 0 0 6px 0;">You received this email because you are a registered student on FlashAI.</p>
              <p style="margin: 0;">FlashAI Universal AI Learning Platform • Keep your streak alive.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

def send_email(to_email: str, subject: str, html_body: str, text_body: Optional[str] = None) -> bool:
    """Send an email using SMTP (configured for Gmail or custom provider)."""
    refresh_config()
    if not is_smtp_configured():
        raise ValueError(
            "SMTP credentials not configured in server/.env. "
            "Please set SMTP_USER and SMTP_PASSWORD (for Gmail, generate an App Password in your Google Account security settings)."
        )

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"FlashAI Learning <{FROM_EMAIL}>"
    msg["To"] = to_email

    # Plain text fallback
    if text_body:
        msg.attach(MIMEText(text_body, "plain", "utf-8"))
    else:
        msg.attach(MIMEText("Please view this email in an HTML-compatible client.", "plain", "utf-8"))

    # HTML body
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        logger.info(f"Connecting to SMTP server {SMTP_HOST}:{SMTP_PORT}...")
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20)
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        logger.info(f"Successfully sent email to {to_email}")
        return True
    except smtplib.SMTPAuthenticationError as e:
        logger.error(f"SMTP Authentication failed: {e}")
        raise ValueError("SMTP Authentication failed. For Gmail, make sure 2-Step Verification is enabled and you are using a 16-character App Password without spaces.")
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        raise RuntimeError(f"Failed to send email: {str(e)}")

def send_daily_reminder(user_name: str, to_email: str, due_cards_count: int = 0) -> bool:
    """Send a friendly daily reminder email to a student who hasn't studied today."""
    first_name = user_name.split()[0] if user_name else "Scholar"
    subject = f"⏳ Hey {first_name}, don't break your study habit today!"
    preview = f"You haven't reviewed your FlashAI material today. Complete a quick 3-minute review session now."

    cards_badge = ""
    if due_cards_count > 0:
        cards_badge = f"""
        <div style="background-color: #f7f5ff; border: 1.5px solid #ddd6fe; border-radius: 12px; padding: 14px 18px; margin: 20px 0;">
          <table role="presentation" width="100%">
            <tr>
              <td style="font-size: 24px; width: 36px;">🎴</td>
              <td>
                <strong style="color: #6D5AE6; font-size: 15px; display: block;">{due_cards_count} Flashcards Scheduled for Today</strong>
                <span style="color: #25213B; font-size: 13px;">Your Spaced Repetition queue is ready for active recall review.</span>
              </td>
            </tr>
          </table>
        </div>
        """
    else:
        cards_badge = f"""
        <div style="background-color: #f0fafa; border: 1.5px solid #bfe6e2; border-radius: 12px; padding: 14px 18px; margin: 20px 0;">
          <table role="presentation" width="100%">
            <tr>
              <td style="font-size: 24px; width: 36px;">✨</td>
              <td>
                <strong style="color: #0f8b8d; font-size: 15px; display: block;">Keep Your Daily Momentum Going</strong>
                <span style="color: #17343b; font-size: 13px;">Upload a lecture slide, take a practice quiz, or review key concepts.</span>
              </td>
            </tr>
          </table>
        </div>
        """

    content = f"""
      <h2 style="font-size: 22px; color: #0b1220; margin: 0 0 14px 0; font-weight: 800;">
        You haven't studied today, {first_name}!
      </h2>
      <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 16px 0;">
        Consistency is the single biggest factor in academic achievement. Just a single quick 3-minute session today keeps your knowledge fresh and prevents forgetting curve decay.
      </p>

      {cards_badge}

      <p style="font-size: 14px; color: #64748b; line-height: 1.5; margin: 0;">
        Open your workspace now and test yourself with flashcards or an AI assessment quiz.
      </p>
    """

    html = get_base_html_template(
        title="FlashAI Daily Study Reminder",
        preview_text=preview,
        content_html=content,
        action_url=APP_URL,
        action_label="Start 3-Minute Review"
    )

    text_fallback = f"Hey {first_name},\n\nYou haven't studied today on FlashAI! Log in now to review your flashcards and take a quiz: {APP_URL}"
    return send_email(to_email, subject, html, text_fallback)

def send_inactivity_alert(user_name: str, to_email: str, days_inactive: int = 4) -> bool:
    """Send an urgent retention alert if the student hasn't studied in 4 or more days."""
    first_name = user_name.split()[0] if user_name else "Scholar"
    subject = f"⚠️ {first_name}, you haven't studied in {days_inactive} days — Don't lose your progress!"
    preview = f"It has been {days_inactive} days since your last study session. Memory retention drops by 70% without spaced review."

    content = f"""
      <div style="background-color: #fef2f2; border: 1.5px solid #fecaca; border-radius: 12px; padding: 14px 18px; margin-bottom: 22px;">
        <span style="color: #dc2626; font-size: 12px; font-weight: 850; letter-spacing: 0.5px; text-transform: uppercase;">
          RETENTION ALERT: {days_inactive} DAYS INACTIVE
        </span>
      </div>

      <h2 style="font-size: 22px; color: #0b1220; margin: 0 0 14px 0; font-weight: 800;">
        We noticed you haven't been active for {days_inactive} days
      </h2>

      <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 16px 0;">
        According to cognitive memory science (Ebbinghaus Forgetting Curve), students lose up to <strong>75% of new material</strong> after 4 days without revision.
      </p>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px; margin: 20px 0;">
        <h4 style="margin: 0 0 8px 0; color: #1e293b; font-size: 14px;">How to recover quickly:</h4>
        <ul style="margin: 0; padding-left: 20px; color: #475569; font-size: 13px; line-height: 1.6;">
          <li>Flip through 5 cards on your most difficult topic.</li>
          <li>Take a quick 5-question assessment quiz.</li>
          <li>Ask the AI Tutor to summarize concepts you feel hazy on.</li>
        </ul>
      </div>

      <p style="font-size: 14px; color: #64748b; line-height: 1.5; margin: 0;">
        Don't let your hard work slip away. Jump back in and refresh your memory in just a couple minutes!
      </p>
    """

    html = get_base_html_template(
        title="FlashAI Inactivity Alert",
        preview_text=preview,
        content_html=content,
        action_url=APP_URL,
        action_label=f"Resume Studying ({days_inactive}d Streak Reset)"
    )

    text_fallback = f"Hey {first_name},\n\nYou haven't studied in {days_inactive} days on FlashAI! Jump back in to protect your memory retention: {APP_URL}"
    return send_email(to_email, subject, html, text_fallback)

def send_test_email(user_name: str, to_email: str) -> bool:
    """Send an instant test email to verify that SMTP/Gmail configuration is 100% working."""
    first_name = user_name.split()[0] if user_name else "Scholar"
    subject = "✦ FlashAI Email System Connected Successfully!"
    preview = "Your FlashAI automated email notifications and daily reminders are now active."

    content = f"""
      <div style="background-color: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 12px; padding: 14px 18px; margin-bottom: 22px;">
        <span style="color: #16a34a; font-size: 12px; font-weight: 850; letter-spacing: 0.5px; text-transform: uppercase;">
          ✓ CONNECTION VERIFIED
        </span>
      </div>

      <h2 style="font-size: 22px; color: #0b1220; margin: 0 0 14px 0; font-weight: 800;">
        Awesome, {first_name}! Your email alerts are ready.
      </h2>

      <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 16px 0;">
        This test confirms that your FlashAI backend is connected to Gmail SMTP. You will now receive:
      </p>

      <div style="background-color: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 18px; margin: 20px 0;">
        <table role="presentation" width="100%" style="font-size: 13px; color: #334155; line-height: 1.8;">
          <tr>
            <td style="width: 24px;">📅</td>
            <td><strong>Daily Study Reminders:</strong> Sent if you haven't reviewed during the day.</td>
          </tr>
          <tr>
            <td style="width: 24px;">⚠️</td>
            <td><strong>Inactivity Streak Alerts:</strong> Sent if you haven't studied for 4+ days.</td>
          </tr>
          <tr>
            <td style="width: 24px;">🏆</td>
            <td><strong>Group Peer Activity:</strong> Updates when classmates share new sets or beat your leaderboard score.</td>
          </tr>
        </table>
      </div>
    """

    html = get_base_html_template(
        title="FlashAI Test Email",
        preview_text=preview,
        content_html=content,
        action_url=APP_URL,
        action_label="Open Learning Platform"
    )

    text_fallback = f"Hey {first_name},\n\nYour FlashAI email notifications are now active! Visit: {APP_URL}"
    return send_email(to_email, subject, html, text_fallback)
