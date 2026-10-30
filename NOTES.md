# Web Task Agent development and test notes

Living evidence log for the presentation and final submission. Updated 30 October 2026. Times below are Dubai time (UTC+4); run folder timestamps are UTC. Append future tests, failures, fixes and reruns here. Preserve original failures and superseded results instead of rewriting them as successes.

## Current state

- Goal-driven DOM agent, own Chromium browser per task, CLI and Telegram entry points.
- Default configured model: OpenRouter `openai/gpt-4.1`. Screenshots are saved and sent to Telegram; they are not model image inputs. No vision benchmark has been run.
- Latest automated suite: 24 tests passed; TypeScript checks passed. Complete CLI regression: 11/11 after correcting the runner-only iframe assertion; original report preserved. Historical milestones below remain unchanged.
- Explicit selection goals now require code-checked proof before any model audit. Missing/invalid proof returns failed with a Not verified reason. Model approval cannot override the gate.
- Mandatory-goal recognition currently covers explicit English cheapest/lowest-priced, most-expensive/highest-priced, latest/newest/most-recent, earliest/oldest, and first wording. It is a keyword recognizer, not a general natural-language parser. Semantic scope and other phrasings still need model judgment/hardening.
- Implementation checkpoint: `09869f2` includes labelled evidence, bounded completion correction and the CLI suite; telemetry/proof gate previously committed in `a54b9d2`. Documentation finalisation is the next commit.
- Telegram end-to-end interaction and later labelled evidence runs passed. The bot has been restarted for the evidence session; process state is session-specific.

## Main bugs and fixes

| Bug or limitation found | Change made | Evidence / regression |
|---|---|---|
| Locked account described correctly but labelled succeeded | Independent final-goal audit; explicit blocked outcomes | Locked-account reruns correctly blocked; preserved first false success below |
| Initial Mini checkout loop lost progress / reused stale context | Better element context, action history with captured page text; stronger default model | GPT-4.1 checkout passed; later Mini benchmark still needed more recovery |
| Model final JSON failed shape validation | Supply full action JSON schema; validation feedback on bounded repair retries | Model adapter regression test; successful checkout reruns |
| Final evidence mixed current confirmation with earlier product facts | Current-page evidence for final state; earlier product details retained from history | Checkout confirmation and details both verified |
| Password field looked filled even when empty because of redaction | Preserve empty string for empty password; redact only a filled value | Login flows subsequently passed |
| First employee with blank job title skipped in favour of later populated row | Indexed table rows; aligned headers/cells; preserve empty cells and return null | OrangeHRM returned actual row 1 and null job title |
| Merely finding a returned price/name did not prove correct record | Source observation/collection/row references and field mappings; generic min/max/position checks | Books, OrangeHRM and checkout source proofs checked |
| Browser-side table helper initially failed in test | Reworked helper serialization; test asserts ARIA rows and empty cells | Browser fixture test passed before live reruns |
| Observation collided with page navigation | Retry observation on destroyed execution contexts / detached frames, bounded | OrangeHRM rerun passed |
| Product name mapping included whole card description/price/control text | Generic first nonempty product link/title fallback; semantic-column audit | Clean Onesie name in checkout rerun |
| Selection rules originally only first/cheapest | General position or min/max over a chosen number/date column | Latest, earliest, most-expensive, nth and cheapest tests |
| Ties, malformed values, mixed currencies could undermine ordering | Full-cell conservative parsing; reject tied extrema, missing values, mixed units and truncated collections | Dedicated parser/ordering negative tests |
| ISO-only date parsing too narrow | English abbreviated/full month names; numeric year-last dates only when day/month order is unambiguous | Oct 30, 2026 and 30/10/2026 accepted; 03/04/2026 rejected |
| Real sites did not actually show consent popups | Local normal/delayed overlay fixtures and transport-only routing harness | Real-site absence is not counted as dismissal coverage; local intercepted clicks recorded |
| Delayed-popup test finished before popup existed | Fixture button enabled at 3 seconds, popup shown at 2 seconds | Makes obstruction meaningful; initial too-fast run retained as noncoverage |
| Disabled target caused premature blocked result | Three task-wide two-second readiness retries, re-observe each time; explicit access blocks bypass retry | Delayed popup passed; normal popup passed; locked account and ISP remained blocked |
| Usage and latency were discarded | Per-HTTP-attempt modelCall events, raw usage/cost, latency and run totals | 19-test milestone and four model benchmark runs; missing usage remains null |
| Mini omitted selection proofs and its own audit approved success | Code-owned mandatory-proof gate before evidence/audit, with required operation/type check | Mini now not verified, audit count zero; GPT-4.1 still passes; 21-test milestone |

## Environment and access diagnostics

- Initial npm DNS failure in the sandbox required an approved network-enabled dependency install. Installed Playwright Chromium; no browser was borrowed from a human-opened tab.
- Initial TypeScript test runner IPC pipe failed in the sandbox; approved test execution allowed the runner and browser to launch.
- Heroku HTTPS: Playwright `net::ERR_CONNECTION_RESET`; curl error 35, connection reset by peer.
- Heroku HTTP: status 200 contained an iframe to `safe.etisalat.ae`, not the demo application. The misleading HTTP status was not treated as successful task access. User confirmed Heroku is blocked on Etisalat and alternatives are allowed.
- Stack Overflow: Cloudflare interstitial, not a cookie popup; agent stopped rather than inventing a question title.
- Localhost is rejected by production URL validation. The test-only harness routes a synthetic HTTPS fixture URL to local HTML via Playwright. It injects no actions, selectors or banner instructions into the agent.

## Complete saved-run ledger

Agent status is the original recorded status, not an endorsement. Assessments explicitly flag false successes and coverage gaps. Every row links to its local result; the same directory contains numbered screenshots, events.jsonl and trace.zip when captured. Runs are git-ignored; links require local artifacts and should be packaged selectively for submission after review.

| Dubai time | Target | Recorded status | Assessment | Evidence |
|---|---|---|---|---|
| 10:23:25 | the-internet.herokuapp.com/inputs | failed | HTTPS navigation reset before the task could start. Later HTTP checks identified an Etisalat filter page; not an agent login failure. | [result](runs/2026-10-30T06-23-25-879Z/result.json) |
| 10:24:35 | www.saucedemo.com/ | succeeded | FALSE SUCCESS: correctly recognised a locked account but incorrectly labelled the run succeeded. Superseded by the blocked rerun. | [result](runs/2026-10-30T06-24-35-105Z/result.json) |
| 10:25:18 | www.saucedemo.com/ | blocked | PASS (expected blocked): independent completion audit classified the locked account correctly. | [result](runs/2026-10-30T06-25-18-753Z/result.json) |
| 10:25:21 | www.saucedemo.com/ | failed | FAIL: initial smaller model lost progress, added/removed items and restarted login until the 45-step limit. Improved observation context/history and moved default to GPT-4.1. | [result](runs/2026-10-30T06-25-21-911Z/result.json) |
| 10:26:31 | www.saucedemo.com/ | failed | FAIL in reporting: browser reached checkout-complete, but model completion JSON failed validation. Added full action schema and validation feedback for repair retries. | [result](runs/2026-10-30T06-26-31-412Z/result.json) |
| 10:27:18 | www.saucedemo.com/ | blocked | FAIL in evidence handling: reached confirmation, then cited product facts absent from the current page and navigated away. Clarified current final-state evidence versus historical extracted data. | [result](runs/2026-10-30T06-27-18-768Z/result.json) |
| 10:28:21 | www.saucedemo.com/ | succeeded | PASS: cheapest item Sauce Labs Onesie, $7.99; order confirmation reached and product details returned. | [result](runs/2026-10-30T06-28-21-966Z/result.json) |
| 10:44:45 | www.saucedemo.com/ | succeeded | PASS: Telegram task accepted; screenshots delivered; question waited about 70 seconds; user reply resumed task; username filled and verified; no login. Bot stopped afterward. | [result](runs/2026-10-30T06-44-45-302Z/result.json) |
| 11:19:00 | the-internet.herokuapp.com/login | blocked | PASS (expected blocked): HTTP login task recognised the UAE/ISP block rather than claiming login success. | [result](runs/2026-10-30T07-19-00-633Z/result.json) |
| 11:20:28 | practicetestautomation.com/practice-test-login/ | succeeded | PASS: Practice Test Automation login; observed successful-login message and Log out button. | [result](runs/2026-10-30T07-20-28-107Z/result.json) |
| 11:26:24 | demoqa.com/dynamic-properties | succeeded | PASS: waited and re-observed; extracted Visible After 5 Seconds. | [result](runs/2026-10-30T07-26-24-703Z/result.json) |
| 11:29:03 | demoqa.com/text-box | succeeded | PASS: synthetic Demo User form data; all four submitted output fields matched (not merely the inputs). | [result](runs/2026-10-30T07-29-03-544Z/result.json) |
| 11:30:58 | www.saucedemo.com/ | succeeded | PASS: opened Backpack detail page; name, $29.99 price, and description extracted. | [result](runs/2026-10-30T07-30-58-966Z/result.json) |
| 11:33:48 | books.toscrape.com/ | succeeded | PASS on an unfamiliar site without code changes: compared first-page prices; opened detail after failed full-title evidence; Starving Hearts (Triangular Trade Trilogy, #1), £13.99. | [result](runs/2026-10-30T07-33-48-393Z/result.json) |
| 11:36:26 | opensource-demo.orangehrmlive.com/web/index.php/auth/login | succeeded | FALSE SUCCESS: returned Aisha Sharma / HR Associate, the first populated job title, rather than actual first employee ABC LMN with an empty job title. Manual inspection caught it. | [result](runs/2026-10-30T07-36-26-564Z/result.json) |
| 11:43:38 | books.toscrape.com/ | succeeded | PASS: Books regression after indexed records; Starving Hearts at £13.99. | [result](runs/2026-10-30T07-43-38-479Z/result.json) |
| 11:43:40 | www.saucedemo.com/ | succeeded | PARTIAL / output defect despite succeeded status: checkout completed, but product_name included the whole card text. Added generic nonempty-link title fallback and stricter semantic-column auditing. | [result](runs/2026-10-30T07-43-40-043Z/result.json) |
| 11:43:40 | opensource-demo.orangehrmlive.com/web/index.php/auth/login | failed | FAIL: observation collided with navigation (Execution context was destroyed). Added bounded observation retries for navigation/context-destruction errors. | [result](runs/2026-10-30T07-43-40-196Z/result.json) |
| 11:44:52 | www.saucedemo.com/ | succeeded | PASS: checkout regression; clean product name Sauce Labs Onesie and $7.99; valid source selection proof. | [result](runs/2026-10-30T07-44-52-596Z/result.json) |
| 11:44:53 | opensource-demo.orangehrmlive.com/web/index.php/auth/login | succeeded | PASS: OrangeHRM row 1 = ABC LMN; job_title null. Exact header/cell mappings and position verified. | [result](runs/2026-10-30T07-44-53-649Z/result.json) |
| 11:44:54 | books.toscrape.com/ | succeeded | PASS: Books regression; valid minimum-price source selection and full detail-page evidence. | [result](runs/2026-10-30T07-44-54-066Z/result.json) |
| 12:01:23 | opensource-demo.orangehrmlive.com/web/index.php/auth/login | succeeded | PASS with general position operator: first employee now 123445 34 444444; job_title null. Shared demo data changed; result was checked against this run, not an old expected name. | [result](runs/2026-10-30T08-01-23-759Z/result.json) |
| 12:01:23 | www.saucedemo.com/ | succeeded | PASS with general min/number operator: Onesie $7.99; order confirmation verified. | [result](runs/2026-10-30T08-01-23-837Z/result.json) |
| 12:01:23 | books.toscrape.com/ | succeeded | PASS with general min/number operator: Starving Hearts £13.99; original first-page source retained through detail navigation. | [result](runs/2026-10-30T08-01-23-862Z/result.json) |
| 12:10:56 | demoqa.com/dynamic-properties | succeeded | PASS unchanged: dynamic button appeared after waiting; exact text Visible After 5 Seconds. | [result](runs/2026-10-30T08-10-56-218Z/result.json) |
| 12:15:01 | demoqa.com/text-box | succeeded | PASS unchanged: Krish Khatri form test; name, email, current address Dubai and permanent address Mumbai all matched rendered submitted output. | [result](runs/2026-10-30T08-15-01-400Z/result.json) |
| 12:16:39 | www.saucedemo.com/ | succeeded | PASS unchanged: opened Fleece Jacket detail; exact name, $49.99 price and full description returned as JSON. | [result](runs/2026-10-30T08-16-39-587Z/result.json) |
| 12:18:55 | www.bbc.com/ | succeeded | EXTRACTION PASS ONLY: BBC lead headline read. No consent popup in observed DOM/screenshot. Does NOT establish popup-dismissal capability. | [result](runs/2026-10-30T08-18-55-796Z/result.json) |
| 12:22:39 | stackoverflow.com/questions?__cf_chl_rt_tk=SXLDD3o.A34RpiQcxQWP8HCKw33Sr8RM4I0TEe3zyOg-1793348560-1.0.1.1-q5jPUa5Czbi5o5GpQh2MtBfpX6pdj3k853_bacN1dY8 | blocked | PASS (expected blocked): Stack Overflow Cloudflare interstitial; no question extracted. No cookie popup observed. | [result](runs/2026-10-30T08-22-39-946Z/result.json) |
| 12:22:55 | automationexercise.com/ | succeeded | EXTRACTION PASS ONLY: Automation Exercise first product Blue Top. No popup observed, so dismissal still untested at this point. | [result](runs/2026-10-30T08-22-55-167Z/result.json) |
| 12:25:03 | local-fixture.test/task | succeeded | PASS: local blocking cookie overlay; initial button click intercepted; rejected optional cookies; retried button; Check complete. verified. Agent was not told about banner. | [result](runs/2026-10-30T08-25-03-637Z/result.json) |
| 12:26:37 | local-fixture.test/task | succeeded | TASK PASS, INVALID DELAYED-POPUP COVERAGE: agent clicked before the two-second popup appeared. Did not validate delayed-popup recovery. | [result](runs/2026-10-30T08-26-37-719Z/result.json) |
| 12:27:03 | local-fixture.test/task | blocked | PREMATURE BLOCK: delayed fixture button was disabled until three seconds; agent immediately gave up before popup handling. Triggered general readiness policy fix. | [result](runs/2026-10-30T08-27-03-705Z/result.json) |
| 12:31:35 | local-fixture.test/task | succeeded | PASS: delayed fixture; initial observation had no banner; one readiness wait; banner appeared, blocked click, was dismissed; check completed. | [result](runs/2026-10-30T08-31-35-168Z/result.json) |
| 12:31:35 | the-internet.herokuapp.com/login | blocked | PASS (expected blocked): ISP denial still stopped; zero readiness retries applied to the explicit block. | [result](runs/2026-10-30T08-31-35-848Z/result.json) |
| 12:31:35 | www.saucedemo.com/ | blocked | PASS (expected blocked): locked account still stopped; zero readiness retries applied to the explicit block. | [result](runs/2026-10-30T08-31-35-862Z/result.json) |
| 12:31:36 | local-fixture.test/task | succeeded | PASS: normal popup regression; intercepted click, reject optional cookies, retry, completion verified. | [result](runs/2026-10-30T08-31-36-069Z/result.json) |
| 12:55:29 | books.toscrape.com/ | succeeded | BENCHMARK PASS: GPT-4.1 Books, valid runtime source-selection proof. Metrics below. | [result](runs/2026-10-30T08-55-29-532Z/result.json) |
| 12:55:57 | www.saucedemo.com/ | succeeded | BENCHMARK PASS: GPT-4.1 checkout, valid runtime minimum proof and confirmation. Metrics below. | [result](runs/2026-10-30T08-55-57-137Z/result.json) |
| 12:56:52 | books.toscrape.com/ | succeeded | CORRECT OUTPUT BUT VERIFICATION GAP: Mini needed recovery and ultimately returned the correct book, but omitted selection proof. Its model audit incorrectly allowed success; manual review confirmed outcome separately. | [result](runs/2026-10-30T08-56-52-217Z/result.json) |
| 12:57:29 | www.saucedemo.com/ | succeeded | CORRECT OUTPUT BUT VERIFICATION GAP: Mini completed checkout and returned correct item/price, but omitted selection proof; model audit accepted it. This is not equivalent to deterministic verified success. | [result](runs/2026-10-30T08-57-29-676Z/result.json) |
| 13:02:45 | Mocked integration test | failed | MOCKED INTEGRATION TEST (not a live browser/model run): missing proof must fail before evidence checker or approving audit is invoked. | [result](runs/2026-10-30T09-02-45-568Z/result.json) |
| 13:03:17 | books.toscrape.com/ | failed | PASS OF NEGATIVE VERIFICATION TEST: Mini omitted cheapest-selection proof; code returned failed / Not verified, with zero model-audit calls. Incorrect candidate cannot be accepted merely because its detail-page text exists. | [result](runs/2026-10-30T09-03-17-321Z/result.json) |
| 13:03:44 | books.toscrape.com/ | succeeded | PASS: GPT-4.1 supplied valid min/number proof and confirmed full title and £13.99 on detail page; code gate and final audit passed. | [result](runs/2026-10-30T09-03-44-229Z/result.json) |

## Model comparison with measured usage

One sequential run per task/model with identical goal text and limits; both planner and final auditor use the selected model. These are single samples, not success-rate or latency distributions. Costs are OpenRouter-reported USD credit charges, including cache effects, all retries and final audits. No price estimates were substituted. Client model latency includes network and complete response-body reading; wall time includes browser work and cleanup. Steps are completed planning decisions, including finish/blocked decisions; calls also include JSON-repair attempts and audits.

### Before mandatory-proof enforcement

| Model | Task | Outcome | Steps | Calls | Input tokens | Output tokens | Total tokens | Cost USD | Model seconds | Wall seconds |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| openai/gpt-4.1 | Books | Verified pass | 3 | 5 | 50,043 | 914 | 50,957 | $0.090694 | 12.779 | 16.100 |
| openai/gpt-4.1 | Checkout | Verified pass | 12 | 13 | 60,706 | 841 | 61,547 | $0.128140 | 22.258 | 27.115 |
| openai/gpt-4.1-mini | Books | Correct on manual review; runtime proof missing | 9 | 10 | 128,500 | 1,141 | 129,641 | $0.050346 | 22.654 | 28.059 |
| openai/gpt-4.1-mini | Checkout | Correct on manual review; runtime proof missing | 16 | 17 | 84,195 | 806 | 85,001 | $0.028056 | 26.648 | 32.881 |

Mini was cheaper but slower and required more steps in these samples. Do not present all four as equivalent verified passes: Mini's results were correct on manual review, but the original runtime selection proof was absent. That defect motivated the code gate.

### After mandatory-proof enforcement on Books

| Model | Outcome | Steps | Calls | Total tokens | Cost USD | Model seconds | Wall seconds |
|---|---|---:|---:|---:|---:|---:|---:|
| openai/gpt-4.1-mini | Not verified; missing proof, no audit called | 3 | 3 | 26,214 | $0.006646 | 5.515 | 9.272 |
| openai/gpt-4.1 | Verified minimum proof and final evidence | 3 | 5 | 50,931 | $0.059934 | 11.364 | 13.845 |

Per-call modelCall events preserve requested and returned model, provider, response ID, HTTP status, phase, attempt, raw usage and latency. Aggregate metrics are in result.json. Model inputs/credentials are not duplicated into telemetry. Original run traces/events can contain task data; keep credentials out of slides and public evidence.

## Automated tests and verification milestones

The suite evolved as defects were found: 3 initial browser/action tests; 4 after JSON repair; 6 after record selection; 11 after generic ordering; 13 after common dates; 16 after readiness recovery; 19 after telemetry; 21 after mandatory proof. Meaningful code batches were type-checked and tested. An early table extraction test failed before being fixed; live navigation and output defects are preserved above.

Current test cases, all passing in the last run:

### browser.test.ts

- discovers controls, fills, verifies evidence, waits for dynamic content, and closes.

### core.test.ts

- rejects model-invented execution and malformed element references.
- navigation rejects local resources and embedded credentials.

### metrics.test.ts

- summary includes every planning, verification and retry call.
- missing usage or cost remains unknown, not zero.

### model.test.ts

- invalid completion JSON is repaired using validation feedback and full action schema.
- verification and failed network requests emit telemetry without inventing usage.

### readiness.test.ts

- disabled targets get a bounded wait budget, including across changing IDs.
- temporary blocked decisions share the same budget; real access blocks stop immediately.
- popup dismissal and other enabled actions remain available during readiness recovery.

### records.test.ts

- first record preserves empty fields; a populated later row cannot replace it.
- cheapest compares all records and binds outputs to the selected record.
- most expensive uses maximum numeric value with currency and grouped thousands.
- latest and earliest compare valid dates and timezone-normalized instants.
- ties, unparseable values and mixed units cannot certify an extremum.
- parsers reject malformed values rather than accepting partial numbers or normalized invalid dates.
- position supports nth selection and does not compare empty fields.
- common named and unambiguous numeric dates match ISO calendar dates.
- ambiguous numeric dates and impossible calendar dates remain unparseable.
- completion gate requires proof even without observed collections and rejects operation bypasses.

### selection-gate.test.ts

- missing selection proof fails before evidence checks or an approving model audit.

## Presentation outline and claims supported by evidence

1. Problem and constraints: Telegram task, independent browser, unseen flows, honest completion.
2. Architecture: CLI/Telegram -> agent loop -> browser/model; schema, readiness and deterministic records checks.
3. Observe and act: DOM controls, current element IDs, indexed records; own browser lifecycle.
4. Multi-step completion: cheapest-item checkout and final confirmation.
5. Generalisation: Books and OrangeHRM runs without site-specific execution scripts; explicit distinction from the evaluator's unknown held-out test.
6. Failure that improved the design: OrangeHRM first-row empty title and code-enforced proof requirement.
7. Recovery: normal and delayed popups; bounded readiness waits and preserved access-block behaviour.
8. Human interaction: Telegram screenshots, waiting for reply and resuming.
9. Model choice: measured cost/tokens/time table, with single-sample and missing-proof caveats.
10. Limits and next hardening: scope, vision fallback, broader goal contracts and reproducibility.

## Remaining limits and work

- Evaluator-provided held-out test has not occurred. Books/OrangeHRM are development-time unfamiliar-flow tests, not a claim of passing that held-out test.
- Screenshots are evidence/reporting only. Canvas-only controls, unlabeled visual targets and visual-only layouts are not covered by DOM reasoning.
- English selection-keyword gate is bounded in scope. Broader language needs an explicit task contract with conservative validation; do not claim arbitrary natural-language selectors are fully deterministic.
- DOM collections cover rendered records and cap at 100 rows. Virtualized/off-page records and incomplete scopes need more navigation; truncated collections cannot verify extrema.
- Dates use supported explicit formats; ambiguous dates and mixed date-only/timestamp comparisons are rejected. Extrema ties are not silently broken.
- Costs/timings before telemetry were not measured; do not backfill them from wall-clock guesses. No repeated-trial statistical benchmark or vision comparison exists.
- Missing required proof and invalid selection criteria end the task as not verified. Later work added one path-qualification-only metadata repair for existing proofs and up to two field-evidence correction iterations; neither grants success without subsequent checks.
- Real-site popup dismissal was not demonstrated on BBC/Automation Exercise. Local fixtures did demonstrate actual pointer interception and recovery, including delayed appearance.
- Final evidence packaging, a maximum-10-slide presentation, and clean submission ZIP remain to be prepared. README reconciliation was completed in the documentation review below.
- Submission deadline: 5pm Dubai, 30 October 2026. Earlier target was functionality by 2pm and package by 3pm. No submission email has been sent.

## Commit checkpoints

- `75debe4`: browser agent, Telegram, initial verification and tests.
- `3c12404`: indexed records and generic ordering.
- `5e8f2c2`: common date formats with ambiguity rejection.
- `bcad734`: bounded readiness waits and normal/delayed popup fixtures.
- Pending: per-call telemetry, mandatory selection-proof gate and this notes log.

## Maintenance rule

For every subsequent test or fix, append the task and model, code state, expected outcome, actual result, run artifact path, any defect, the general fix, and rerun results. Add measured tokens/cost/timing when available. Label unexercised cases and false successes explicitly; never delete the original failing evidence. Keep API keys, bot tokens and passwords out of this file and the presentation.

## Documentation review after test-log creation

Reviewed README against current code and saved results. Replaced stale four-test status with the latest 21-test result; removed the claim that Telegram and unfamiliar-flow testing were pending; replaced the blocked Heroku quick-start example with DemoQA. Added configuration variables, readiness/fixture commands, current proof-gate limits, telemetry semantics, measured-model caveats and pending submission work. No agent code changed and no new live tests were run for this documentation-only update.

## Clean Telegram evidence session

Added optional `[scenario-label]` message prefixes, stripped before the goal reaches the agent. Run folders now use a UTC timestamp plus a sanitised label, or hostname when absent. The bot announces the folder and appends each finished Telegram result/metrics here. Starting a new bot session for user-submitted scenario evidence; previous test results remain unchanged. TypeScript check passed after the naming change.

- Telegram evidence run [2026-10-30T09-19-57-805Z--checkout](runs/2026-10-30T09-19-57-805Z--checkout/result.json): **failed**. Not verified: Field Title must come from selected row 5: "Sauce Labs Onesie" Metrics: {"model":"openai/gpt-4.1","steps":12,"calls":12,"promptTokens":55805,"completionTokens":692,"totalTokens":56497,"costUsd":0.11714599999999999,"modelLatencyMs":17703,"wallMs":34195,"missingUsageCalls":0}

### Telegram checkout metadata mismatch

Run `2026-10-30T09-19-57-805Z--checkout` reached the order confirmation after 12 steps but failed strict verification. Data was nested under cheapest_product while proof fields were top-level Title/Price/Text. This was a proof/output-shape mismatch, not a failed checkout. Added exact dot-path resolution for nested outputs and clarified that flat outputs are preferred and proof keys must match exact output paths. Unqualified nested leaf keys still fail; no automatic fuzzy matching or bypass of missing-proof requirements. The original evidence remains failed/not verified. Added regression coverage for explicit paths, missing paths and mismatched nested values.

Nested-path fix verification: TypeScript passed and all 22 automated tests passed, including the new strict nested-path regression. The prior Telegram checkout run is preserved as not verified. Restarted the idle bot for the next user-submitted evidence run; no checkout was automatically repeated.

- Telegram evidence run [2026-10-30T09-25-45-720Z--checkout](runs/2026-10-30T09-25-45-720Z--checkout/result.json): **failed**. Not verified: Field Title must come from selected row 5: "Sauce Labs Onesie" Metrics: {"model":"openai/gpt-4.1","steps":12,"calls":12,"promptTokens":57269,"completionTokens":748,"totalTokens":58017,"costUsd":0.12052199999999999,"modelLatencyMs":18810,"wallMs":34463,"missingUsageCalls":0}

### Repeated Telegram checkout metadata failure and bounded repair

Run `2026-10-30T09-25-45-720Z--checkout` again reached confirmation in 12 steps but returned nested cheapest_product data with unqualified Title/Price proof keys. Merely adding explicit-path support and prompt instructions did not ensure model compliance. Added one metadata-only repair attempt when an existing proof references a missing output path. Only key qualification is allowed: captured source/row/order, column mappings and returned data are immutable; no browser action is repeated. Missing proofs, wrong values and other invalid proof cases still fail. Added integration coverage for successful qualification and rejected column changes; the approving audit is never called after failed repair. The original failed run stays unchanged.

Repair verification: all 23 automated tests and TypeScript checks passed. A live-model replay of the exact second failed final payload returned cheapest_product.Title / cheapest_product.Price paths and passed the deterministic selection check, without browser navigation or repeating checkout. Original run remains failed. Bot restarted with the bounded repair version for the next evidence task.

- Telegram evidence run [2026-10-30T09-32-03-653Z--checkout](runs/2026-10-30T09-32-03-653Z--checkout/result.json): **succeeded**. Successfully logged in, added the cheapest product ('Sauce Labs Onesie' at $7.99) to the cart, completed checkout, and reached the order confirmation page. Metrics: {"model":"openai/gpt-4.1","steps":12,"calls":14,"promptTokens":61001,"completionTokens":809,"totalTokens":61810,"costUsd":0.097562,"modelLatencyMs":25890,"wallMs":39454,"missingUsageCalls":0}

Checkout evidence review: `2026-10-30T09-32-03-653Z--checkout` succeeded. One metadata-only repair qualified product_name/price under cheapest_product; source observation, selected row 5, min/number price comparison, column mappings and returned data were unchanged. Strict selection check passed, current confirmation text passed, and independent goal audit passed. No browser action was repeated during repair. This is the clean successful Telegram checkout evidence after the two preserved failures.

- Telegram evidence run [2026-10-30T09-36-24-079Z--blocked-login](runs/2026-10-30T09-36-24-079Z--blocked-login/result.json): **blocked**. Account is locked and cannot proceed beyond login. The error message confirms the user is locked out. Metrics: {"model":"openai/gpt-4.1","steps":4,"calls":4,"promptTokens":10121,"completionTokens":207,"totalTokens":10328,"costUsd":0.016138,"modelLatencyMs":6270,"wallMs":15703,"missingUsageCalls":0}

- Telegram evidence run [2026-10-30T09-38-31-632Z--isp-block](runs/2026-10-30T09-38-31-632Z--isp-block/result.json): **blocked**. Site is blocked by ISP and cannot be accessed to perform login or confirm secure area. Metrics: {"model":"openai/gpt-4.1","steps":1,"calls":1,"promptTokens":3077,"completionTokens":58,"totalTokens":3135,"costUsd":0.003738,"modelLatencyMs":2881,"wallMs":5597,"missingUsageCalls":0}

- Telegram evidence run [2026-10-30T09-39-50-417Z--login](runs/2026-10-30T09-39-50-417Z--login/result.json): **succeeded**. Login with username 'student' and password 'Password123' succeeded, as confirmed by the success message and 'Log out' button. Metrics: {"model":"openai/gpt-4.1","steps":4,"calls":5,"promptTokens":17343,"completionTokens":327,"totalTokens":17670,"costUsd":0.028662,"modelLatencyMs":8738,"wallMs":19315,"missingUsageCalls":0}

- Telegram evidence run [2026-10-30T09-40-36-974Z--dynamic](runs/2026-10-30T09-40-36-974Z--dynamic/result.json): **succeeded**. The button that appears after 5 seconds has the text 'Visible After 5 Seconds'. Metrics: {"model":"openai/gpt-4.1","steps":2,"calls":3,"promptTokens":7543,"completionTokens":182,"totalTokens":7725,"costUsd":0.013661999999999999,"modelLatencyMs":4538,"wallMs":13163,"missingUsageCalls":0}

- Telegram evidence run [2026-10-30T09-40-59-346Z--form](runs/2026-10-30T09-40-59-346Z--form/result.json): **succeeded**. Form was filled and submitted. The output matches the entered values for name, email, current address, and permanent address. Metrics: {"model":"openai/gpt-4.1","steps":6,"calls":7,"promptTokens":22563,"completionTokens":442,"totalTokens":23005,"costUsd":0.04002200000000001,"modelLatencyMs":10640,"wallMs":19704,"missingUsageCalls":0}

- Telegram evidence run [2026-10-30T09-41-33-168Z--extract](runs/2026-10-30T09-41-33-168Z--extract/result.json): **failed**. Not verified: Field description must come from selected row 4: "Sauce Labs Fleece Jacket It's not every day that you come across a midweight quarter-zip fleece jacket capable of handling everything from a relaxing day outdoors to a busy day at the office. $49.99 Add to cart" Metrics: {"model":"openai/gpt-4.1","steps":4,"calls":5,"promptTokens":19960,"completionTokens":605,"totalTokens":20565,"costUsd":0.035928,"modelLatencyMs":12111,"wallMs":17186,"missingUsageCalls":0}

### Telegram extraction skipped detail navigation

Run `2026-10-30T09-41-33-168Z--extract` failed after four steps: agent attempted to finish on the inventory page although the user requested opening the fleece jacket. It mapped description to the entire card Text column, which also contains title, price and Add to cart text. Strict value equality correctly rejected this. Reinforced requested navigation and semantic column instructions; added at most two evidence-correction iterations for value-to-column mismatches. No success is granted on mismatch, missing required proof is still fatal, and wrong row/order/parsing checks are not bypassed. A description absent as a source column must use detail-page text evidence, not a fabricated Text-column mapping.

Exact user-goal CLI rerun `2026-10-30T09-45-07-232Z--www-saucedemo-com` passed in five steps: actual detail-page visit, name Sauce Labs Fleece Jacket, price $49.99 and exact description. Six model calls; 20,773 total tokens; $0.041528 reported cost; 9.842 model seconds and 12.240 wall seconds. TypeScript checks and all 24 tests passed; new regression rejects whole-card text as a description substring. Restarted bot for the next user-submitted extraction evidence run.

- Telegram evidence run [2026-10-30T09-47-04-345Z--extract](runs/2026-10-30T09-47-04-345Z--extract/result.json): **succeeded**. Extracted the name, price, and description for the Sauce Labs Fleece Jacket from the detail page after logging in as standard_user. Metrics: {"model":"openai/gpt-4.1","steps":5,"calls":6,"promptTokens":20298,"completionTokens":498,"totalTokens":20796,"costUsd":0.025572,"modelLatencyMs":10036,"wallMs":16385,"missingUsageCalls":0}

- Telegram evidence run [2026-10-30T09-48-39-867Z--books](runs/2026-10-30T09-48-39-867Z--books/result.json): **succeeded**. Identified the cheapest book on the first page: 'Starving Hearts (Triangular Trade Trilogy, #1)' with a price of £13.99. Metrics: {"model":"openai/gpt-4.1","steps":4,"calls":9,"promptTokens":121132,"completionTokens":1901,"totalTokens":123033,"costUsd":0.200832,"modelLatencyMs":20567,"wallMs":29456,"missingUsageCalls":0}

- Telegram evidence run [2026-10-30T09-49-58-190Z--orangehrm](runs/2026-10-30T09-49-58-190Z--orangehrm/result.json): **succeeded**. The first employee in the list is '123445 UpdatedMiddle 444444' with no job title shown (null). Metrics: {"model":"openai/gpt-4.1","steps":8,"calls":10,"promptTokens":80305,"completionTokens":1040,"totalTokens":81345,"costUsd":0.14205,"modelLatencyMs":18377,"wallMs":38144,"missingUsageCalls":0}

OrangeHRM Telegram evidence review: `2026-10-30T09-49-58-190Z--orangehrm` succeeded. Initial employee_name incorrectly included the ID column (dfgsjSJDH); strict field mapping rejected it. One bounded correction then used row 1, First (& Middle) Name column 2 and Last Name column 3, returning 123445 UpdatedMiddle 444444. Job Title column 4 was empty and returned null. Position-1 proof and final audit passed; no later populated row substituted. Valid evidence of recovery from a field-mapping error. Shared demo data differs from earlier runs.

- Telegram evidence run [2026-10-30T09-51-54-291Z--orangehrm](runs/2026-10-30T09-51-54-291Z--orangehrm/result.json): **succeeded**. Extracted the name and job title of the first employee from the employee list. The first employee's name is '123445 UpdatedMiddle 444444' and the job title is not shown (null). Metrics: {"model":"openai/gpt-4.1","steps":8,"calls":10,"promptTokens":64138,"completionTokens":916,"totalTokens":65054,"costUsd":0.100084,"modelLatencyMs":17645,"wallMs":37648,"missingUsageCalls":0}

- Telegram evidence run [2026-10-30T09-52-41-050Z--ask](runs/2026-10-30T09-52-41-050Z--ask/result.json): **succeeded**. Logged in with the provided username and the current page title is 'Swag Labs'. Metrics: {"model":"openai/gpt-4.1","steps":5,"calls":6,"promptTokens":20973,"completionTokens":361,"totalTokens":21334,"costUsd":0.039074,"modelLatencyMs":9568,"wallMs":35018,"missingUsageCalls":0}

- Telegram evidence run [2026-10-30T09-53-24-156Z--ask](runs/2026-10-30T09-53-24-156Z--ask/result.json): **succeeded**. Logged in with the provided username and reported the page title: 'Swag Labs'. Metrics: {"model":"openai/gpt-4.1","steps":9,"calls":10,"promptTokens":34428,"completionTokens":642,"totalTokens":35070,"costUsd":0.062472,"modelLatencyMs":15323,"wallMs":58843,"missingUsageCalls":0}

- CLI suite 2026-10-30T09-57-42-188Z, checkout: **PASS** (expected succeeded, actual succeeded). Order confirmed. The cheapest product 'Sauce Labs Onesie' ($7.99) was purchased and order confirmation is shown. Evidence: [result](runs/2026-10-30T09-57-42-568Z--suite-2026-10-30t09-57-42-188z-checkout/result.json).

- CLI suite 2026-10-30T09-57-42-188Z, blocked-login: **PASS** (expected blocked, actual blocked). User account is locked out and cannot proceed to product selection or checkout. Evidence: [result](runs/2026-10-30T09-58-08-011Z--suite-2026-10-30t09-57-42-188z-blocked-login/result.json).

- CLI suite 2026-10-30T09-57-42-188Z, isp-block: **FAIL** (expected blocked, actual blocked). Scenario-specific evidence check failed Evidence: [result](runs/2026-10-30T09-58-22-008Z--suite-2026-10-30t09-57-42-188z-isp-block/result.json).

- CLI suite 2026-10-30T09-57-42-188Z, login: **PASS** (expected succeeded, actual succeeded). Login as student was successful and the logged-in success page is verified by the congratulatory message and the presence of the Log out button. Evidence: [result](runs/2026-10-30T09-58-28-872Z--suite-2026-10-30t09-57-42-188z-login/result.json).

- CLI suite 2026-10-30T09-57-42-188Z, dynamic: **PASS** (expected succeeded, actual succeeded). The button that appeared after five seconds has the exact text: 'Visible After 5 Seconds'. Evidence: [result](runs/2026-10-30T09-58-40-876Z--suite-2026-10-30t09-57-42-188z-dynamic/result.json).

## Sequential CLI regression runner

Added `npm run scenarios` for the 11 requested scenarios, invoking CLI child processes sequentially with labelled evidence folders and fresh browsers. Demo credentials are read from TEST_* variables in ignored .env; no passwords added to the runner source. Each row checks expected status and scenario-specific evidence, including minimum/position proof where applicable. Expected blocked outcomes are passes only with observed block evidence. Logs and incremental JSON summaries are saved under runs/suite-<timestamp>; rows above are appended as each scenario finishes. TypeScript check passed before execution. Suite started with the configured GPT-4.1 model.

- CLI suite 2026-10-30T09-57-42-188Z, form: **PASS** (expected succeeded, actual succeeded). Verified that the rendered output after submission matches all four entered values: Krish Khatri, krish@test.com, Dubai, and Mumbai. Evidence: [result](runs/2026-10-30T09-58-56-383Z--suite-2026-10-30t09-57-42-188z-form/result.json).

- CLI suite 2026-10-30T09-57-42-188Z, extract: **PASS** (expected succeeded, actual succeeded). Extracted the name, price, and full description of the Sauce Labs Fleece Jacket from its product detail page. Evidence: [result](runs/2026-10-30T09-59-12-340Z--suite-2026-10-30t09-57-42-188z-extract/result.json).

- CLI suite 2026-10-30T09-57-42-188Z, books: **PASS** (expected succeeded, actual succeeded). The cheapest book on the first catalogue page is 'Starving Hearts (Triangular Trade Trilogy, #1)' priced at £13.99. The full title and price are confirmed on the detail page. Evidence: [result](runs/2026-10-30T09-59-25-395Z--suite-2026-10-30t09-57-42-188z-books/result.json).

- CLI suite 2026-10-30T09-57-42-188Z, orangehrm: **PASS** (expected succeeded, actual succeeded). Extracted the name and job title of the first employee in the default order from the employee list. Name: '123445 UpdatedMiddle 444444', Job Title: null (empty). Evidence: [result](runs/2026-10-30T09-59-42-945Z--suite-2026-10-30t09-57-42-188z-orangehrm/result.json).

- CLI suite 2026-10-30T09-57-42-188Z, popup: **PASS** (expected succeeded, actual succeeded). The check was run and completed successfully as indicated by the 'Check complete.' message. Evidence: [result](runs/2026-10-30T10-00-08-563Z--suite-2026-10-30t09-57-42-188z-popup/result.json).

- CLI suite 2026-10-30T09-57-42-188Z, delayed-popup: **PASS** (expected succeeded, actual succeeded). The check was completed successfully as indicated by the 'Check complete.' message on the page. Evidence: [result](runs/2026-10-30T10-00-25-882Z--suite-2026-10-30t09-57-42-188z-delayed-popup/result.json).

Suite evidence recheck: 11/11 passed after correcting the runner to include captured iframe element context. Original report preserved: runs/suite-2026-10-30T09-57-42-188Z/summary.json. Rechecked report: runs/suite-2026-10-30T09-57-42-188Z/rechecked-summary.json. No browser task was repeated or agent result changed.

Suite runner bug/fix: the initial 10/11 report was a false negative for isp-block because its assertion inspected only top-frame text. Captured iframe element context contains the explicit UAE denial. Updated the assertion to inspect observed element context as well as body text (not model reasoning), then re-evaluated all 11 saved runs: 11/11 pass. Original summary.json remains unchanged; rechecked-summary.json identifies the source report and previous pass flags. No agent logic changed for this assertion fix and no successful task was unnecessarily repeated.

Suite evidence recheck: 11/11 passed after correcting the runner to include captured iframe element context. Original report preserved: runs/suite-2026-10-30T09-57-42-188Z/summary.json. Rechecked report: runs/suite-2026-10-30T09-57-42-188Z/rechecked-summary.json. No browser task was repeated or agent result changed.

- Telegram evidence run [2026-10-30T10-41-14-121Z--isp-block](runs/2026-10-30T10-41-14-121Z--isp-block/result.json): **blocked**. Access to the website is denied due to regulatory restrictions in the UAE. Login and secure area confirmation are not possible. Metrics: {"model":"openai/gpt-4.1","steps":1,"calls":1,"promptTokens":3196,"completionTokens":74,"totalTokens":3270,"costUsd":0.006984,"modelLatencyMs":2285,"wallMs":5106,"missingUsageCalls":0}

## Documentation finalisation and repository credential review

Committed pending implementation as `09869f2` before documentation-only edits. Completed README setup/environment tables, CLI and labelled Telegram examples, full-suite commands, evidence paths, Heroku substitution note, current validation and model caveats. Added LIMITS.md covering reliability, unsupported UI, proof/parser/scope limits, bounded recovery, network constraints, telemetry and next hardening. Source-file hashes were captured before the docs work to confirm no agent code changes. Scanned nonignored files and historical Git blobs for key/token/private-key patterns and the exact configured API/bot values without printing them; no keys found. Local .env intentionally retains runtime credentials and is git-ignored, as are node_modules and raw runs. No live scenarios were repeated for documentation work.
