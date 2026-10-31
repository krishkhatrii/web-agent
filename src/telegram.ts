import "dotenv/config";
import path from "node:path";
import { readFile, appendFile } from "node:fs/promises";
import { runTask } from "./agent.js";
const token = process.env.TELEGRAM_BOT_TOKEN;
const allowed = process.env.TELEGRAM_ALLOWED_CHAT_ID;
if (!token || !allowed) {
  console.error(
    "Set TELEGRAM_BOT_TOKEN and TELEGRAM_ALLOWED_CHAT_ID in .env. Use the numeric chat ID shown by @userinfobot.",
  );
  process.exit(1);
}
async function api(
  method: string,
  payload: Record<string, unknown> | FormData,
) {
  const multipart = payload instanceof FormData;
  const response = await fetch(
    `https://api.telegram.org/bot${token}/${method}`,
    {
      method: "POST",
      headers: multipart ? undefined : { "Content-Type": "application/json" },
      body: multipart ? payload : JSON.stringify(payload),
      signal: AbortSignal.timeout(35000),
    },
  );
  const data: any = await response.json();
  if (!data.ok)
    throw new Error(`Telegram ${method} failed (${response.status})`);
  return data.result;
}
const send = (text: string) =>
  api("sendMessage", { chat_id: allowed, text: text.slice(0, 4000) });
async function progress(message: string, screenshot?: string) {
  if (!screenshot) {
    await send(message);
    return;
  }
  const form = new FormData();
  form.set("chat_id", allowed!);
  form.set("caption", message.slice(0, 1000));
  form.set(
    "photo",
    new Blob([await readFile(screenshot)], { type: "image/png" }),
    "progress.png",
  );
  await api("sendPhoto", form);
  console.log("Telegram progress screenshot delivered.");
}
let offset = 0;
let active: AbortController | undefined;
let answer: ((text: string) => void) | undefined;
let running = true;
process.on("SIGINT", () => {
  running = false;
  active?.abort();
});
console.log("Telegram polling ready. Only the configured chat can run tasks.");
while (running) {
  try {
    const updates = await api("getUpdates", {
      offset,
      timeout: 25,
      allowed_updates: ["message"],
    });
    for (const update of updates) {
      offset = update.update_id + 1;
      const message = update.message;
      if (
        String(message?.chat?.id) !== allowed ||
        typeof message?.text !== "string"
      )
        continue;
      const text = message.text.trim();
      if (text === "/cancel") {
        active?.abort();
        answer?.("Task cancelled");
        answer = undefined;
        await send("Cancellation requested.");
        continue;
      }
      if (text === "/start" || text === "/help") {
        await send(
          "Send [scenario-label] followed by a public sandbox URL and goal. Example: [dynamic] https://demoqa.com/dynamic-properties Wait for the delayed button and return its text. Labels name your evidence folder. Use /cancel to stop. Reply normally when I ask a question.",
        );
        continue;
      }
      if (answer) {
        const resolve = answer;
        answer = undefined;
        console.log("Telegram user reply received; resuming task.");
        resolve(text);
        continue;
      }
      if (active) {
        await send("A task is already running. Use /cancel first.");
        continue;
      }
      const labelled = text.match(/^\[([^\]\n]{1,60})\]\s*/);
      const task = labelled ? text.slice(labelled[0].length) : text;
      const match = task.match(/https?:\/\/[^\s]+/);
      if (!match) {
        await send("Include the site URL with your task.");
        continue;
      }
      const goal = task.replace(match[0], "").trim();
      if (!goal) {
        await send("Include a goal alongside the URL.");
        continue;
      }
      const controller = new AbortController();
      active = controller;
      void runTask(match[0], goal, {
        runLabel: labelled?.[1],
        signal: controller.signal,
        progress,
        ask: async (question) => {
          const reply = new Promise<string>((resolve, reject) => {
            const cancel = () => {
              answer = undefined;
              reject(new Error("Cancelled"));
            };
            answer = (text) => {
              controller.signal.removeEventListener("abort", cancel);
              resolve(text);
            };
            controller.signal.addEventListener("abort", cancel, { once: true });
          });
          await send(`I need your input: ${question}`);
          console.log("Telegram question delivered; waiting for user reply.");
          return reply;
        },
      })
        .then(async (result) => {
          const folder = path.basename(result.runDir);
          const summary = result.summary
            .replace(/\s+/g, " ")
            .replace(/\|/g, "/");
          await appendFile(
            "NOTES.md",
            `\n- Telegram evidence run [${folder}](runs/${folder}/result.json): **${result.status}**. ${summary} Metrics: ${JSON.stringify(result.metrics)}\n`,
          );
          if (result.data) await send(JSON.stringify(result.data, null, 2));
        })
        .catch(async () => {
          await send(
            "Task could not start. Check local configuration and logs.",
          );
        })
        .finally(() => {
          active = undefined;
          answer = undefined;
        });
    }
  } catch {
    console.warn("Telegram polling failed; retrying in 3 seconds.");
    await new Promise((r) => setTimeout(r, 3000));
  }
}
