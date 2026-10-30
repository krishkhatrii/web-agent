# Reliability limits and next hardening

This is a development browser agent for public demo tasks, not a production automation service. The tested build completed the 11-scenario CLI suite and selected Telegram evidence runs. One passing suite does not establish a statistical success rate. Original failures, corrected outcomes and measured model samples are preserved in [NOTES.md](NOTES.md).

## What the evidence supports

The agent can launch its own browser, work through login/forms/checkout, wait for dynamic content, extract detail-page data, preserve empty fields in indexed rows, recover from tested click-blocking overlays, and report explicit account/network blocks honestly. Telegram can start tasks, send screenshots, ask a question, wait for a reply and resume.

The shared OrangeHRM demo changes as other users edit it. Tests verify the first row captured during that run, not a fixed employee name. Books and OrangeHRM were unfamiliar-flow development tests; the evaluator's held-out test has not occurred.

## Page perception

- Reasoning uses DOM text, interactive controls and structured records. Screenshots are evidence/reporting only; no images are sent to the model. Canvas-only controls, visual puzzles and unlabeled visual targets are unsupported.
- Observations cap main-page text at 24,000 characters and interactive controls at 200 per frame. Large pages can hide relevant content beyond those caps.
- Generic semantic tables and repeated currency-bearing product cards are heuristics, not universal page understanding. Product-card detection currently recognises $, £ and € price strings; other price representations may not form collections.
- Main body text comes from the top frame. Frame controls and their nearby text can be observed, but iframe body text is not fully consolidated. The regression runner explicitly checks captured element context for the ISP-denial iframe.
- Only rendered DOM records are captured. Virtualised rows, pagination, alternate sort orders and incomplete scopes need more navigation. Collections are capped at 100 rows; truncated collections cannot certify an extremum.
- New tabs, uploads/downloads, native file dialogs and multi-browser workflows are not implemented. JavaScript dialogs are dismissed by the driver; arbitrary dialog workflows have not been validated.

## Completion and record selection

A valid code-checked proof is necessary for recognised selection goals, but is not a universal guarantee of semantic correctness. The code checks referenced records, exact mapped values, positions and unique numeric/date extrema. It does not independently understand every user instruction.

- Mandatory-proof detection is an explicit English keyword recogniser. It covers cheapest/lowest-priced, most-expensive/highest-priced, latest/newest/most-recent, earliest/oldest and first. Other languages, phrasing, compound selectors, named records and ordinals need broader task-contract validation.
- The model still identifies the relevant source collection, comparison column, requested scope and semantic field meaning. An independent model audit checks those choices, requested navigation and overall completion; it can still make mistakes.
- Proof fields use exact data keys or explicit dot paths. Missing required proof fails before any model audit. An audit cannot override a rejected code check.
- A missing output path in an existing proof gets one metadata-only repair call. Only path qualification is accepted; source, row, order, column mappings and data remain fixed. The strict checks run again. Missing proofs never receive this repair.
- A value/column mismatch can trigger up to two evidence-correction iterations. These can gather detail-page evidence or correct mappings; they do not automatically approve mismatched values. Repeated or unresolved errors stop the task.
- Proof mappings check the fields they identify. Detail-page-only fields can instead rely on current text evidence and the semantic audit; not every returned JSON leaf is mechanically bound to a table cell.
- Text evidence is a substring check against current main-page text. It does not prove every causal claim or independently force a particular semantic element target. Recorded observations/history and the model audit supplement it.
- Empty selected cells are preserved, with null requested in output; they must not cause a later populated record to replace the requested one.

## Ordering and parsers

`position` selects a 1-based ordinal. `min` and `max` compare every captured value in the nominated column. Tied extrema, missing/unparseable values, mixed units/currencies and truncated collections cannot be verified.

Numbers support signed decimal values, comma-grouped thousands and a limited currency-symbol/code set. They do not guess decimal-comma locales, unit conversions or exchange rates. Numeric precision is limited to JavaScript numbers; oversized values are rejected.

Dates support valid ISO calendar dates, ISO timestamps with explicit timezone, English full/abbreviated month names, and slash/hyphen year-last numeric dates with unambiguous day/month order. Dates such as 03/04/2026, relative dates, invalid dates, mixed date-only/timestamp comparisons and unsupported locale formats are rejected. Even equal numeric components such as 10/10/2026 are conservatively rejected. There is no arbitrary tie-breaking rule.

## Recovery, interaction and execution

Three two-second readiness waits are available per task for disabled click targets or model-reported temporary not-ready states. The budget does not reset on navigation or changing IDs. Explicit locked-account, ISP/access-denied and CAPTCHA/anti-bot blocks should stop immediately. Readiness classification beyond a disabled target depends on the model.

Navigation and destroyed-context observation retries are bounded. Task step/time budgets and repeated-action detection prevent endless loops. Slow pages can still exhaust these limits. Time budgets are checked between steps and abort model requests; an in-flight browser operation can take its timeout to settle, so they are not hard real-time deadlines.

Telegram processes one task at a time from one allowed chat. Keep the laptop awake and poller running. Jobs and polling offsets are not durably persisted across restarts; there is no job queue, crash recovery or production supervision. Cancellation and shutdown may wait for in-flight browser/polling calls. These paths have less live coverage than task submission, screenshots and question/resumption.

## Network, credentials and data

Heroku is blocked on the tested Etisalat network: HTTPS resets, while HTTP returns a filtering page despite HTTP 200. This is valid blocked-task evidence, not successful Heroku login or dynamic-content coverage. Alternatives used were Practice Test Automation for login and DemoQA for dynamic/form tasks. Stack Overflow showed Cloudflare; no bypass was attempted. CAPTCHA solving is not implemented.

The browser has fresh task contexts but is not a network-isolated container. Basic public-URL validation is not an SSRF/security boundary. Do not expose the runner to untrusted users or use it for real purchases/account changes. Page instructions are treated as untrusted in model prompts, but this is not a proven prompt-injection defence.

Runtime credentials belong in ignored local `.env`. Demo task credentials/form data can appear in goal text, console output, screenshots, traces, events and model requests. Do not include raw artifacts or the credential-bearing original brief in a public repository/submission without review. The Git scan checks known key/token/private-key patterns and configured secret values; it is not a guarantee against every possible secret format.

## Model choice and measurements

Configured default: OpenRouter GPT-4.1 using text/DOM input. Single-run Books/checkout comparisons found GPT-4.1-mini cheaper but slower and needing more steps. Mini also omitted selection proofs; after the code gate it was correctly rejected rather than accepted by its own audit. No vision-mode comparison or repeated-trial reliability study has been performed.

Telemetry records every model HTTP attempt, including repair/audit calls, with reported usage/cost. Missing values stay unknown. Request latency includes network and response-body reading, not pure inference time. Wall time includes browser work and cleanup. Cache hits, provider routing, network and shared-site state can affect comparisons. Historical runs before telemetry do not have reliable token/cost measurements.

## Priorities with more time

1. Replace keyword-only selection detection with an explicit validated task contract covering scope, compound criteria, names, ordinals and navigation requirements.
2. Expand evidence binding to all extracted fields and consolidate frame text/record provenance while keeping strict failure behaviour.
3. Add optional vision for DOM-insufficient pages and benchmark cost, latency and success over repeated trials.
4. Add durable jobs, stronger cancellation/shutdown tests, redacted evidence export and production network/credential isolation.
5. Expand regression coverage to pagination, virtualised tables, real-site consent variants and changing layouts. Real BBC/Automation Exercise runs showed no popup; local popup tests must not be described as real-site consent coverage.
