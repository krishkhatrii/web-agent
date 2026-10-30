# Web Task Agent

A goal-driven browser agent controlled from a CLI or Telegram. Each task launches a fresh Chromium browser, observes visible page text and interactive controls, chooses one validated action, then observes again. There are no target-site selector scripts in the runtime.

## Setup

Requires Node.js 22 or newer.

```bash
npm ci
npx playwright install chromium
cp .env.example .env
```

Set `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` in `.env`. The initial development model is `openai/gpt-4.1`; it is configurable. Never include `.env` or the original credential-bearing brief in a submission archive.

## Run locally

```bash
npm run agent -- https://the-internet.herokuapp.com/inputs "Enter 42 into the number input and verify its value is 42."
```

Supply credentials and form data in the goal when required. The CLI reports blocked if more information is needed; Telegram supports interactive replies. Exit code 0 indicates verified success, 2 indicates an incomplete task, and 1 indicates invalid setup.

## Telegram

Create a bot using @BotFather and add its token to `TELEGRAM_BOT_TOKEN`. Set `TELEGRAM_ALLOWED_CHAT_ID` to your numeric chat ID (available from @userinfobot). Only this chat is accepted. Open your bot and press Start, then run:

```bash
npm run bot
```

Send a public sandbox URL and a task in one message. Progress screenshots and the final result are returned to that chat. Reply to clarification questions normally. `/cancel` stops the current task; `/help` shows usage. One task runs at a time. No webhook or hosted server is needed. Keep the laptop awake and the bot process running.

## Architecture

- `src/browser.ts`: browser lifecycle, generic DOM observation, action execution, evidence checks, Playwright traces.
- `src/model.ts`: OpenRouter adapter and general planning instructions.
- `src/schema.ts`: validated action protocol and navigation checks.
- `src/agent.ts`: observe, decide, act, verify, recover, stop; shared by both interfaces.
- `src/telegram.ts`: polling, allowed chat, progress images, questions, replies, cancellation.

The model receives visible page text and current element IDs. It cannot execute JavaScript or provide arbitrary selectors. The browser executor supports click, fill, select, key press, navigation, scrolling, and bounded waiting. A claimed completion must include observed text, URL, or input-value evidence checked by the executor. An independent model audit then checks the full goal against the observation and recent history, and can reject completion or classify it as blocked. Both goal interpretation and the audit still depend on model judgment.

## Verification and artifacts

```bash
npm run check
npm test
```

Each run writes `runs/<timestamp>/events.jsonl`, numbered screenshots, `result.json`, and `trace.zip`. Inspect a trace with `npx playwright show-trace runs/<timestamp>/trace.zip`. Artifacts can contain task data; review and redact before sharing. Run artifacts are ignored by git by default; copy reviewed evidence deliberately into the final submission.

## Limits and next hardening

Current perception uses DOM text and controls; screenshots are recorded and sent to Telegram but are not yet passed to the model. Canvas-only interfaces and visual puzzles are unsupported. CAPTCHA and unavailable credentials require human input; locked accounts should stop. The browser is headless by default; set `HEADLESS=false` to inspect it.

Actions have timeouts; task execution has step and time budgets; repeated identical actions on unchanged observations stop the run. Cancellation is checked between steps and aborts model requests; an in-flight browser operation may take its timeout to settle. Basic public URL checks are not a network security boundary. Use only public demo sites; do not expose this runner to untrusted users or real payment tasks. Downloads, uploads, cross-tab flows, durable job recovery, and production network isolation need additional work.

Model choice is intended to keep text-based steps fast and inexpensive. Actual reliability, latency, and cost need measurement on the target suite before the final model choice. Add vision selectively for pages whose DOM is insufficient rather than claiming visual capability from screenshots alone.

## Initial validation on 30 October 2026

TypeScript checks and four automated tests pass. A live Sauce Demo run completed checkout for the cheapest item, Sauce Labs Onesie at $7.99, and returned structured details after checking confirmation evidence and the independent completion audit. A locked-account run correctly returned blocked. The smaller initial model failed to maintain progress, so development switched to GPT-4.1 with explicit observation history and response schema feedback.

The Internet demo site reset the connection during both browser and curl checks. Its login, dynamic-loading, and input tasks remain unvalidated against the live site. Telegram code is implemented but awaits bot credentials and a live integration test. Unfamiliar-site testing and submission packaging are still pending.
