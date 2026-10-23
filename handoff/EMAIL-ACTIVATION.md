# Nightly email activation

The product's sending path is implemented and tested with a synthetic provider. This hosting account currently lacks an approved mail provider key and verified sender. No actual email was sent and inbox delivery is unverified.

Configure through authenticated Sites runtime controls, never in source:

| Setting | Required value |
| --- | --- |
| NEXTROLE_MAIL_APPROVAL | approved after reviewing the chosen account/domain and costs |
| NEXTROLE_MAIL_API_KEY | An operator-owned Resend sending key |
| NEXTROLE_MAIL_FROM | A sender email on a verified sending domain |
| NEXTROLE_PUBLIC_URL | https://nextrole-job-radar.ivorypine64.chatgpt.site |
| NEXTROLE_MAIL_DAILY_BUDGET | Optional integer 1–100000; default 50 reservations/day. Set to the provider's approved account budget, not a guessed unlimited quota. |

Verify the sending domain in the provider dashboard, including required DNS records. Do not invent credentials or purchase a plan/domain without the owner's account action. A connected personal inbox is unnecessary. Reference: https://resend.com/docs/api-reference/emails/send-email.

The owner-only nextrole_send_daily_digests tool takes no arguments. It returns configured:false without setup, waits until 21:00 Asia/Kolkata, then processes five opted-in accounts per call. Resume while pending; stop on the budget guard. The linked nightly task is separate from the existing 09:00/14:00/19:00 source task; inspect native Site schedule metadata to avoid duplicates. The deployment receipt records whether scheduling succeeded.

Only an explicitly opted-in student's authenticated account email is eligible. Emails include up to 20 detailed highlights and a CSV of all matching new public-source jobs, source links, key reported skills, deadlines if known and discovery-window dates. Previously handled jobs and private imported jobs are excluded. Provider acceptance is not inbox delivery. No résumé, entire career profile or student API key is sent.

Daily idempotency prevents duplicate sends. Timeouts/ambiguous responses are not retried blindly and pause that recipient's automatic delivery. Rejected/preparation-failed results also need investigation. Each message has unsubscribe controls; settings off prevents new dispatches. Host Operations and owner refresh_status show aggregate readiness, counts, budget reservations and result states without addresses.

After setup, opt in with the owner's test account, preview the actual content, exercise one send through the linked owner connection during the nightly window, check inbox/spam/unsubscribe, and inspect provider logs. Test bounces/rate limits and verify budget/backlog before expanding the cohort. Do not enable other users' opt-in or send unsolicited test messages.
