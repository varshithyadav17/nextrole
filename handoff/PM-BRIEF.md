# NextRole Job Radar — Master Execution Prompt

You already have the context of this project, our previous discussions, the product vision, the existing codebase and the roadmap we discussed. Continue from that context. Do not restart the conversation, repeat generic advice, or ask me to explain the product again.

I want you to take ownership of moving NextRole from its current state toward a polished, reliable, production-ready career platform.

You are my senior product manager, technical architect, full-stack engineer, AI engineer, UX designer and implementation lead.

**Your job is not just to tell me what to build. Your job is to help me build it, test it, and verify that it works.**

You have substantial freedom to improve my ideas. If you identify a better solution, a missing feature, a more efficient architecture or a smarter implementation strategy, propose it and use your judgment for ordinary, reversible decisions. Explain significant deviations from our roadmap. Prioritize actual user value over blindly following my initial suggestions.

At the same time, protect existing functionality, avoid unnecessary rewrites, and ask for approval before destructive changes, major architectural decisions, new paid commitments, significant privacy changes or production deployment.

## PART 1 — Establish the current state

Use the project files, website, documentation and conclusions already available in this conversation.

Before changing anything, determine:
- What has already been implemented and verified.
- What is incomplete, broken, mocked or unverified.
- What infrastructure, credentials, external APIs or scheduled tasks are required.
- Which features can be reused.
- Which existing bugs or architectural problems could block progress.

Do not repeat the previous audit unless you need to verify something that has changed. If the audit is already complete, use its findings.

If important information is missing, investigate the actual codebase before making assumptions.

## PART 2 — Follow this product vision

### A. Universal Job Discovery — highest priority

Our main objective is to help users discover substantially more relevant jobs and internships without searching dozens of websites individually.

Build a modular discovery system that can expand across:

- Search-engine APIs and job-search providers.
- Official employer APIs, feeds and structured job data.
- Company career pages and ATS job boards.
- LinkedIn, Unstop, Internshala and other relevant platforms, using their actual available and permitted access methods.
- Startup hiring pages, niche job boards, student opportunities and other valuable sources.

Use large language models to assist with discovery-query generation, extraction, normalization and classification when they provide measurable value. Combine them with actual search results, retrieved source evidence, deterministic parsers and validation.

Do not assume that an LLM has universal website access. Investigate available APIs, pricing, permissions, terms and alternatives for each source. Do not invent jobs or bypass access controls.

Every usable listing should have source attribution, a working application URL where available, retrieval and verification timestamps, duplicate detection, and an appropriate freshness or closure status.

Make it easy to add more sources through a common adapter architecture.

Measure progress by unique relevant jobs, source diversity, accuracy, freshness, working links, duplicate rate, coverage gaps and cost per usable listing.

**Deliverable:** A tested end-to-end discovery pipeline that demonstrates genuine ingestion from multiple distinct source categories, not merely a redesigned interface or a larger collection of hardcoded listings.

### B. AI Application Assistant — available for every job

Every job card should have:
- The normal Apply button.
- A separate circular eye icon that opens that job's AI Application Assistant.

The assistant should:
1. Analyze the job description.
2. Evaluate the user's eligibility and fit against verified profile information.
3. Explain relevant strengths, missing requirements and uncertainties.
4. Generate a truthful, role-tailored resume using a professional LaTeX template.
5. Provide a downloadable PDF and preserve resume versions.
6. Prepare polished, role-specific answers to application questions.
7. Provide editable answers, individual copy buttons and review indicators.
8. Flag unknown facts instead of inventing achievements or experience.
9. Save the job snapshot, resume version and answer history.
10. Open the official application form.

Investigate ways to inspect actual application questions where access is permitted. Support pasted questions or a suitable user-assisted workflow when external forms require authentication or cannot be inspected.

Clearly distinguish actual observed questions from predicted questions. Never pretend to have accessed an external form that you have not accessed.

The objective is to let a user prepare a strong application with minimal prompting and copy-pasting.

### C. Optional Auto-Apply — Settings only

Auto-Apply must be disabled by default. Manual AI assistance must work independently of Auto-Apply.

Allow users to configure:
- Roles and job types.
- Degree, branch, graduation year and other eligibility conditions.
- Required skills.
- Minimum and maximum stipend or salary.
- Minimum and maximum internship duration in months.
- Location and work arrangement.
- PPO preference.
- Availability and other relevant constraints.
- Excluded companies or categories.

Require mandatory eligibility checks to pass. Send unknown or conflicting critical facts to manual review.

Before submission, recheck that the job is open, the user has not already applied, and the correct profile and resume are available. Respect each platform's permitted automation and any human-required steps. Never bypass CAPTCHA, falsify attestations or report an unconfirmed submission as successful.

Include clear controls to enable, pause and disable the feature, plus an audit log and failure reporting.

### D. Career Intelligence

Continue improving:
- Personalized job digests and notifications.
- Application tracking and status history.
- Resume and application-kit history.
- OA and interview deadlines.
- Company research and interview preparation.
- Publicly sourced interview experiences with links and dates.
- Application analytics.
- Personalized next-action recommendations.

Keep official information separate from candidate-reported experiences and AI-generated practice content.

## PART 3 — Improve the product beyond this specification

Do not treat the above feature list as a ceiling.

Think independently about:
- What would make students return to NextRole every day?
- Which repetitive application tasks can be eliminated safely?
- Which integrations would increase job coverage most?
- Which features would provide the most value for the least effort?
- How can we reduce hallucinations, stale jobs and wasted applications?
- How can we make the product easier to understand and use?
- Which features are not worth building yet?

Rank additional ideas by user impact, effort, risk, dependencies and ongoing cost. Implement sensible, low-risk improvements that support the agreed priorities. Do not allow interesting side features to distract from the core product.

## PART 4 — Execute, do not just plan

If the current state and previous audit are sufficiently clear, begin implementation rather than returning another lengthy strategy document.

Work in small, verifiable milestones.

For each milestone:
1. State the specific outcome.
2. Identify the relevant existing code and dependencies.
3. Implement the smallest complete solution.
4. Run the available tests, type checks, linting and build.
5. Test the actual user workflow wherever possible.
6. Review the diff for regressions and security issues.
7. Update documentation and database migrations when needed.
8. Report what works, what failed, what remains unverified and what comes next.

Do not claim that a feature is complete merely because its UI exists or the build passes.

Do not leave fake integrations, hardcoded sample results or placeholder success messages masquerading as working features.

If you need an API key, paid provider, account connection, user approval or unavailable external capability, explain the blocker immediately and continue with independent work that can safely proceed.

Preserve the existing project and use reversible changes wherever possible.

## PART 5 — Prioritization and delivery

Use this default sequence:

**Milestone 1:** Verify the current implementation and deliver a working, multi-source Universal Job Discovery improvement.

**Milestone 2:** Deliver the end-to-end AI Application Assistant, including tailored resume PDF generation and editable, copyable application answers.

**Milestone 3:** Deliver configurable, optional Auto-Apply with strict eligibility rules and safe workflow controls.

**Milestone 4:** Improve notifications, tracking, interview preparation, analytics and personalized recommendations.

You may change the sequence if the existing codebase or a technical dependency makes another order clearly better. Explain why and choose the fastest path to a meaningful, verified result.

For each milestone, define acceptance criteria before implementation.

If a milestone is too large, divide it into smaller tasks that each produce testable progress. Do not wait until every feature is finished before testing.

Do not overwrite the production deployment or perform destructive database operations without approval.

## PART 6 — How to communicate with me

I want practical execution, not endless discussion.

Be concise when reporting progress, but detailed when explaining important technical decisions.

Do not repeatedly ask me to choose between ordinary implementation details. Make reasonable decisions yourself and explain them afterward.

Ask questions only when my input is genuinely necessary, especially for product trade-offs, personal data, API credentials, payments or high-impact actions.

Clearly distinguish:
- Verified facts.
- Assumptions.
- Recommendations.
- Implemented changes.
- Tested results.
- Remaining blockers.

Do not invent completion, test results, credentials or access to external services.

## YOUR IMMEDIATE NEXT ACTION

Review the context and findings already established in this conversation.

If the audit is complete, do not redo it. Select the highest-value next implementation milestone and begin working on it in the available project environment.

If the source archive or necessary files are not actually accessible to you, state precisely what is missing and request only what is necessary.

Return a short execution plan for the immediate milestone, then proceed with the work that is authorized and possible. Do not stop at another generic roadmap.

**My expectation is that you use your judgment, build on the existing work, move quickly, test thoroughly and help turn NextRole into a genuinely useful product.**