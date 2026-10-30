# Web Task Agent

A goal-driven browser agent controlled from a CLI or Telegram. Each task launches a fresh Chromium browser, observes the page, chooses a validated action, executes it and checks the result. Runtime actions use controls discovered from the current page, with no target-site selector scripts.

Development history, original failures, fixes and presentation evidence are in [NOTES.md](NOTES.md). Reliability boundaries and next hardening steps are in [LIMITS.md](LIMITS.md).

## Setup

Requires Node.js 22 or newer.

```bash
npm ci
npx playwright install chromium
cp .env.example .env
```

Copy the environment template only for a new setup; preserve an existing `.env`. Configure these variables:

| Variable | Purpose |
|---|---|
| `OPENROUTER_API_KEY` | Required OpenRouter credential |
| `OPENROUTER_MODEL` | Required model ID; the tested default configuration uses `openai/gpt-4.1` |
| `TELEGRAM_BOT_TOKEN` | Required only for Telegram mode |
| `TELEGRAM_ALLOWED_CHAT_ID` | Numeric ID of the only chat permitted to run tasks |
| `HEADLESS` | `true` by default; `false` shows the browser |
| `MAX_STEPS` | Task step limit, default 45 |
| `MAX_MINUTES` | Task time budget, default 10 |

For the optional CLI scenario suite, also set the following demo-account credentials in local `.env` using the values supplied by the task brief/demo sites:

| Variables | Demo |
|---|---|
| `TEST_SAUCE_USERNAME`, `TEST_SAUCE_LOCKED_USERNAME`, `TEST_SAUCE_PASSWORD` | Sauce Demo normal and locked accounts |
| `TEST_LOGIN_USERNAME`, `TEST_LOGIN_PASSWORD` | Practice Test Automation login |
| `TEST_ORANGEHRM_USERNAME`, `TEST_ORANGEHRM_PASSWORD` | OrangeHRM demo |
| `TEST_INTERNET_USERNAME`, `TEST_INTERNET_PASSWORD` | Original Heroku login scenario; currently an expected ISP block |

These values are used by the regression runner to construct goals. The standalone CLI/Telegram agent receives login credentials in the task itself; it does not automatically use the `TEST_*` values.

The model ID is configurable, not hardcoded as a fallback. Keep `.env`, dependencies and raw run artifacts out of source control. Do not include `.env` or the original credential-bearing brief in a submission archive.

## Run from the terminal

```bash
npm run agent -- https://demoqa.com/text-box "Fill full name Demo User, email demo.user@example.com, current address Dubai and permanent address Mumbai. Submit and verify that all four values match the rendered output."
```

Include credentials and form data in the goal where required. If information is missing, the CLI reports blocked; Telegram supports questions and replies. Exit code 0 indicates verified success, 2 an incomplete/blocked/failed task, and 1 a startup/configuration error.

To test a different model without changing `.env`:

```bash
OPENROUTER_MODEL=openai/gpt-4.1-mini npm run agent -- https://books.toscrape.com/ "Find the cheapest book on the first catalogue page and return its full title and price."
```

## Run through Telegram

Create a bot using @BotFather. Set its token and your numeric chat ID in `.env` (the chat ID is available from @userinfobot). Open your bot and press Start, then run:

```bash
npm run bot
```

Send `[scenario-label]` followed by a public sandbox URL and a goal in one message. The optional label becomes the readable suffix of its timestamped evidence folder; without a label the hostname is used. Example: `[dynamic] https://demoqa.com/dynamic-properties Wait for the delayed button and return its text.` Labels are removed from the model goal. The bot announces the evidence folder and appends completed Telegram results/metrics to `NOTES.md`. The bot sends progress screenshots, a final status and extracted data when available. If it asks a question, reply normally in the same chat to resume. `/cancel` requests cancellation; `/help` shows usage. Only the configured chat is accepted, and one task runs at a time. Long polling needs no webhook or hosted server; keep the laptop awake and the process running.

Telegram task submission, screenshots, waiting for a user reply and resumption have been tested end to end, followed by labelled scenario evidence runs. Start the bot explicitly with `npm run bot`; installation or CLI task execution does not start it. Stop the polling process with Ctrl+C; an in-flight polling request may take a short time to settle. Do not run multiple pollers for the same bot token.

## Example tasks

Send these as Telegram messages. Replace credential placeholders with the demo values before sending. Labels affect folder naming only, not planning. Use URLs as plain text.

```text
[checkout] https://www.saucedemo.com/ Log in as <demo username> with password <demo password>. Find the cheapest product, add exactly one to the cart, and complete checkout with first name Demo, last name User, postal code 00000. Verify confirmation and return product name and price.

[blocked-login] https://www.saucedemo.com/ Log in as <locked demo username> with password <demo password> and complete checkout. Report honestly if the account is blocked.

[login] https://practicetestautomation.com/practice-test-login/ Log in as <demo username> with password <demo password> and verify the logged-in success page.

[dynamic] https://demoqa.com/dynamic-properties Wait for the button that appears after five seconds and return its exact text.

[form] https://demoqa.com/text-box Fill name Demo User, email demo.user@example.com, current address Dubai, permanent address Mumbai. Submit and verify all four values in the rendered output.

[extract] https://www.saucedemo.com/ Log in as <demo username> with password <demo password>, open the fleece jacket and return name, price and description as JSON.

[books] https://books.toscrape.com/ Find the cheapest book on the first catalogue page only. Compare all prices and return its full title and price, opening its detail page if the title is truncated.

[orangehrm] https://opensource-demo.orangehrmlive.com/ Log in as <demo username> with password <demo password>, go to the employee list and return the first employee's name and job title. Preserve an empty job title as null. Do not edit records.

[ask-user] https://www.saucedemo.com/ Ask me which username to use and wait for my reply. Then fill only the username field and verify its value. Do not log in.
```

For CLI tasks, use `npm run agent -- <url> "<goal>"` with the URL outside the quoted goal. To label a CLI run, set `RUN_LABEL=extract` before the command; otherwise the hostname is the folder suffix. Do not put API keys or bot tokens in task text.

## Project structure

| File | Responsibility |
|---|---|
| `src/cli.ts` | Terminal entry point and exit codes |
| `src/telegram.ts` | Polling, allowed chat, screenshots, questions/replies and cancellation |
| `src/agent.ts` | Shared observe/decide/act/verify loop, history, task limits and artifacts |
| `src/browser.ts` | All production Playwright control: lifecycle, navigation, observation, actions, evidence checks and traces |
| `src/model.ts` | OpenRouter requests, planning instructions, response validation, completion audit and call telemetry |
| `src/schema.ts` | Validated action protocol and basic public-URL checks |
| `src/readiness.ts` | Bounded retry policy for temporarily unavailable controls/pages |
| `src/records.ts` | Indexed-record verification, number/date parsing, min/max/position and mandatory-proof gate |
| `src/metrics.ts` | Run-level usage, cost, latency and step summaries |
| `tests/*.test.ts` | Automated regression tests |
| `tests/local-fixture.ts` | Transport-only harness serving local HTML at a test URL |
| `tests/fixtures/` | Immediate and delayed click-blocking cookie overlays |

Browser tests and the fixture harness also import Playwright; runtime browser execution is isolated in `src/browser.ts`.

## Observation and verification

The model receives visible DOM text, current element IDs and structured records. Screenshots are saved and sent to Telegram, but are not passed as model image inputs. The model cannot execute JavaScript or supply arbitrary selectors. Supported browser actions include click, fill, select, key press, navigation, back, scroll and bounded wait.

Observations preserve 1-based table row indices, aligned headers/cells and empty fields. Generic repeated product cards expose title, price and text columns. Extracted empty fields are reported as null instead of selecting another populated record.

Selection proofs reference a captured observation, collection, row and field-to-column mappings. Mapping keys must identify exact returned data keys; flat output is preferred, while nested output uses explicit dot paths such as `cheapest_product.Title`. Unqualified nested leaf names do not match automatically. They use `position` with a 1-based ordinal, or `min`/`max` with a comparison column and a number/date value type. Code checks the position or unique extremum and verifies that mapped output values came from that record.

A code-level gate recognises explicit English cheapest/lowest-priced, most-expensive/highest-priced, latest/newest/most-recent, earliest/oldest and first wording. Such goals require a valid proof before any evidence check or model audit; missing/invalid proof returns failed with a `Not verified` reason. An existing proof with a missing output path gets one metadata-only repair attempt: only exact field-path qualification is permitted, while source, row, order, column mappings and data remain fixed. The full checks run again; failed repair stays not verified. A missing proof never receives this repair. The required operation/type is also checked: for example, position cannot replace the minimum required by cheapest. First-page scope and first-name form labels are excluded from first-record detection.

This recogniser is not a general language parser. Although the proof protocol supports other ordinals and named records, mandatory-proof detection for other phrasings still depends on further hardening. The independent model audit remains responsible for semantic scope, column meaning and overall goal completion. It cannot override a rejected code-level proof.

A value-to-column mismatch gets at most two evidence-correction iterations; success remains disallowed until the proof is valid. This can gather the requested detail-page evidence instead of treating a whole-card Text column as a standalone description. Missing required proofs and invalid selection criteria still fail immediately. Final-state evidence must match current page text, URL or an input value. Earlier selection facts remain available from captured records/history, so checkout confirmation does not need to repeat the product name and price on its final page.

## Recovery and limits

Disabled click targets and model-reported temporary not-ready states receive up to three task-wide two-second waits. Each wait is followed by a fresh observation and decision. New element IDs or navigation do not reset the budget. Explicit locked-account, ISP/access-denied and CAPTCHA/anti-bot states stop without these readiness retries. Missing data requires user input.

Actions have timeouts, tasks have time/step budgets, and repeated identical actions on unchanged observations stop the run. Observation retries handle navigation-related execution-context destruction. Cancellation aborts model requests and is checked between steps; an in-flight browser operation may take its timeout to settle.

Record collections include rendered DOM records only and are capped at 100 rows. Truncated collections cannot verify extrema. Virtualised records, pagination and incomplete scopes require further navigation. Tied extrema, missing/unparseable comparison values and mixed units/currencies cannot be verified.

Number parsing accepts signed decimals, correctly comma-grouped thousands and supported currency symbols/codes. Date parsing accepts valid ISO dates, ISO timestamps with seconds and explicit timezone, English month names (`Oct 30, 2026`, `30 October 2026`), and slash/hyphen year-last dates with unambiguous day/month order (`30/10/2026`, `10/30/2026`). Numeric dates with both components at most 12 are rejected, including equal components. Mixed date-only/timestamp comparisons are rejected.

Canvas-only controls, visual puzzles, downloads/uploads, multi-tab workflows, durable jobs and production network isolation are not implemented. Basic URL checks are not a network security boundary. Use public test sites and synthetic data; do not use this runner for real payments. CAPTCHA solving is not implemented.

## Tests and local popup fixtures

```bash
npm run check
npm test
```

The latest code verification passed TypeScript checks and all 24 automated tests. Coverage includes browser observation/actions, empty cells, selection ordering, ties and parsing failures, JSON repair, readiness budgets, telemetry, and an integration test proving a missing selection proof prevents even an approving audit from running.

To exercise actual popup obstruction with the configured model:

```bash
node --import tsx tests/local-fixture.ts tests/fixtures/overlay.html "Click the Run check button and confirm the check completed successfully."
node --import tsx tests/local-fixture.ts tests/fixtures/delayed-overlay.html "Click the Run check button and confirm the check completed successfully."
```

These are live-model manual runs, separate from `npm test`. The harness routes local HTML to a synthetic HTTPS URL because production navigation rejects localhost. It injects no page-specific decisions or actions. The immediate overlay covers the button. The delayed version shows the overlay at two seconds and enables the button at three seconds, ensuring a meaningful readiness/obstruction challenge. Both passed; the delayed run observed the page before the banner appeared, waited, dismissed it after a blocked click, and verified completion.

## Sequential CLI scenario suite

Configure the `TEST_*` demo-account variables listed in `.env.example`, then run:

```bash
npm run scenarios
```

This runs checkout, locked-account login, HTTP ISP denial, successful login, delayed content, form submission, product-detail extraction, Books, OrangeHRM, and both local popup fixtures sequentially. Each scenario launches the CLI in its own process and fresh browser; no site-specific execution steps are injected into the agent. Expected blocked outcomes count as passes only when the page contains corresponding block evidence. Success cases also check scenario-specific outputs/evidence. The delayed-content case requires observing the button absent before it appears, so a page that finishes loading after the delay does not count as dynamic-wait coverage.

Each scenario gets a labelled run folder. The runner writes its console log and incremental `summary.json` into `runs/suite-<timestamp>/`, appends results to `NOTES.md`, continues after individual failures, and prints a final pass/fail table with steps, tokens, USD cost and elapsed time. Exit code is 0 only when all scenarios pass. To recheck saved evidence without repeating browser/model calls, run `npm run scenarios -- --recheck runs/suite-<timestamp>/summary.json`; this preserves the original report and writes `rechecked-summary.json`. Do not interpret this fixed regression suite as the evaluator's held-out test.

## Run artifacts and telemetry

Each task writes `runs/<UTC timestamp>--<label-or-hostname>/` containing numbered screenshots, `events.jsonl`, `result.json` and a Playwright `trace.zip` when tracing is available. Inspect a trace with:

```bash
npx playwright show-trace runs/<timestamp>/trace.zip
```

Every model HTTP attempt, including JSON-repair retries, metadata-only repairs and final audits, records a `modelCall` event with its step, phase, attempt, requested/returned model, provider, response ID, HTTP status, raw OpenRouter usage and `latencyMs`. Request latency includes network and complete response-body reading; it is not server-only inference time or time to first token.

`usage.cost` is the OpenRouter-reported USD credit charge. Missing usage/cost remains null rather than being zero-filled or estimated. `result.json.metrics` totals tokens, cost and model-call latency, and records wall time through browser cleanup. Steps count completed planning decisions, including finish/blocked decisions; repair attempts and audits are separate calls, not extra steps.

Raw screenshots, traces and task events can contain credentials or form data. Runs are ignored by git; review and redact evidence before sharing or deliberately packaging selected runs.

## Validation and model choice

Live validation on 30 October 2026 covered:

- Cheapest-item checkout: Sauce Labs Onesie at $7.99, final order confirmation.
- Locked-account and Etisalat ISP-denial pages: correctly reported blocked.
- Login: Practice Test Automation demo, with successful-login message and logout control.
- Delayed content: DemoQA button text `Visible After 5 Seconds` observed after waiting.
- Forms: DemoQA submitted output matched all four supplied fields.
- Detail extraction: Sauce Demo Backpack and Fleece Jacket name, price and description.
- Unfamiliar-flow development tests: Books first-page cheapest title/price; OrangeHRM actual row 1 with an empty job title preserved as null.
- Telegram screenshots and clarification/resumption; immediate and delayed local popup recovery.

### Heroku access and alternative test sites

Heroku HTTPS resets connections on the current Etisalat network. HTTP returns an ISP filtering page, not the target application. Its successful login/dynamic/input scenarios therefore remain untested on that site; alternatives above were exercised. Stack Overflow stopped at a Cloudflare interstitial. BBC and Automation Exercise showed no consent popup, so their extraction runs do not count as popup-dismissal tests.

The original successful-login scenario was replaced with Practice Test Automation, delayed content with DemoQA Dynamic Properties, and input/form coverage with DemoQA Text Box. The HTTP Heroku task remains a negative test of honest ISP-block reporting. These substitutions were accepted in the task discussion; they are not claims that Heroku itself was successfully exercised.

### Regression results and model comparison

The complete sequential suite executed all 11 scenarios with GPT-4.1. All 11 passed after correcting the runner's ISP assertion to inspect captured iframe context; the original 10/11 report is preserved alongside the rechecked report. This was a runner assertion fix, not a change to the agent's correct blocked outcome. Both blocked scenarios are expected passes, not successful logins.

A single sequential run per task/model found GPT-4.1 faster but more expensive than GPT-4.1-mini on Books and checkout. Mini's outputs were correct on manual review but omitted selection proofs; its audit originally accepted them. After the code-level gate, a Books rerun with Mini was rejected as not verified and GPT-4.1 still passed with a valid proof. Detailed tokens/cost/timing and the historical caveat are in [NOTES.md](NOTES.md). These samples do not establish statistical success rates, and no vision-mode benchmark has been run.

Implementation, setup/usage documentation, the limitations note and recorded regression evidence are complete for this development checkpoint. See [NOTES.md](NOTES.md) for the evidence history and [LIMITS.md](LIMITS.md) for the short limits summary. The evaluator's held-out test has not occurred.
