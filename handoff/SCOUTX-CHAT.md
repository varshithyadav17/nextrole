# ScoutX conversational chat — 23 October 2026

ScoutX uses the applicant’s enabled API connections after separate text-chat consent. Sign in with ChatGPT provides identity; it does not supply ChatGPT subscription credits. There is no operator-key fallback. Guided JD checks and factual résumé exports remain available without a model connection.

The interface retains the animated raccoon, original PDF cards, soft composer, expandable chat and reduced-motion behavior. Replies render escaped paragraphs, emphasis, lists and code. They cannot execute HTML or load remote images. AI chat, Enable AI and Connect AI distinguish the mode. Follow-up suggestions send real messages. The composer and server accept up to 6,000 characters.

## Conversation and context

The existing private per-job thread is replayed as user/assistant turns for OpenAI and Groq, and user/model turns for Gemini. At most 24 turns and 24,000 history characters are sent; the latest question is retained. This is bounded thread context, not permanent memory. Closing the panel keeps the saved thread. Clear chat removes its history and cached Scout replies. A different student or job cannot acquire that context.

The current JD, selected résumé content, reviewed facts/draft and applicable latest compatibility check accompany the conversation. A PDF and explicitly prefixed JD can be attached in one message. General-chat JDs stay private and never enter the job catalogue. A pasted JD is data, not a tool command. Changing the JD detaches earlier tailoring. Check context is fingerprinted against the description, file revision, draft revision and Career revision so stale checks are not supplied as the current result.

History and textual context redact email, phone and credential patterns. This is pattern redaction, not complete anonymization. Sending the original PDF still needs separate per-file/revision consent and is restricted to enabled OpenAI/Gemini connections. Personal provider quotas, daily limits, cooldowns, fallback policy and encryption are retained. Cache keys include conversation history so the same follow-up with a different preceding reply cannot reuse a stale response.

ScoutX’s instructions prioritize the latest question and natural follow-ups such as “explain that,” “make it shorter” and “change the tone.” General coaching is distinct from sourced applicant/employer claims. Replies cannot claim live web browsing, application submission or an employer ATS score. The internal compatibility metric and fixed nextrole-letter-v1 template remain unchanged. Suggested factual edits still require source checks and user accuracy confirmation; ordinary conversation never silently changes a résumé.

## Verification and limits

`scripts/verify-scout-conversation.mjs` exercises actual isolated D1-backed chat state and intercepted OpenAI/Gemini/Groq adapters: longer multi-turn context, consent, redaction, provider roles, history-aware caching, cross-account isolation, pasted JDs, character bounds, clearing, no-key fallback and escaped reply rendering, including incomplete Markdown. Wider Scout/PDF tests retain original-byte, source-evidence, review, versioning and download coverage.

Synthetic responses verify adapter behavior; they do not establish model quality or a student’s access/credits. Replies arrive when the provider completes; streaming, voice, live browsing and ChatGPT feature parity are not claimed. Real browser/device and production load checks remain separate. Managed preview was previously unavailable with ERR_CONNECTION_REFUSED; no new browser sign-off is implied. Exact source/deployment receipts identify what is live.

No migration, sharing change, schedule change, new secret or data reset is required.
