import "dotenv/config";
import { mkdir, appendFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { BrowserDriver, type Observation } from "./browser.js";
import { checkCompletionSelection, type RecordSource } from "./records.js";
import { ReadinessBudget } from "./readiness.js";
import { summarizeCalls, type ModelCall } from "./metrics.js";
import { Model } from "./model.js";
import { publicUrl } from "./schema.js";
export type Result = {
  status: "succeeded" | "blocked" | "failed" | "cancelled";
  summary: string;
  runDir: string;
  data?: unknown;
  metrics?: ReturnType<typeof summarizeCalls>;
};
export type Hooks = {
  runLabel?: string;
  progress?: (message: string, screenshot?: string) => Promise<void>;
  ask?: (question: string) => Promise<string>;
  signal?: AbortSignal;
};
export async function runTask(
  url: string,
  goal: string,
  hooks: Hooks = {},
): Promise<Result> {
  publicUrl(url);
  const started = performance.now();
  let steps = 0,
    activeStep = -1;
  let metadataRepairs = 0,
    fieldCorrections = 0;
  const calls: ModelCall[] = [];
  const label =
    (hooks.runLabel || new URL(url).hostname)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "task";
  const runDir = path.resolve(
    "runs",
    new Date().toISOString().replace(/[:.]/g, "-") + "--" + label,
  );
  await mkdir(runDir, { recursive: true });
  const driver = new BrowserDriver();
  const history: any[] = [];
  const recordSources: RecordSource[] = [];
  const readiness = new ReadinessBudget();
  let result: Result = {
    status: "failed",
    summary: "Step limit reached without verified completion",
    runDir,
  };
  const deadline = Date.now() + Number(process.env.MAX_MINUTES || 10) * 60000;
  const signal = AbortSignal.any([
    AbortSignal.timeout(Math.max(1000, deadline - Date.now())),
    ...(hooks.signal ? [hooks.signal] : []),
  ]);
  const notify = async (message: string, screenshot?: string) => {
    console.log(message);
    try {
      await hooks.progress?.(message, screenshot);
    } catch {
      console.warn("Progress delivery failed; local run artifacts retained");
    }
  };
  const log = async (event: unknown) =>
    appendFile(
      path.join(runDir, "events.jsonl"),
      JSON.stringify({ at: new Date().toISOString(), ...(event as object) }) +
        "\n",
    );
  const model = new Model(undefined, undefined, async (call) => {
    calls.push(call);
    await log({ step: activeStep, modelCall: call });
  });
  try {
    await driver.start(url);
    await log({ runLabel: label });
    await notify(`Browser launched. Evidence run: ${path.basename(runDir)}`);
    let repeats = 0;
    let previous = "";
    for (let step = 0; step < Number(process.env.MAX_STEPS || 45); step++) {
      signal.throwIfAborted();
      activeStep = step;
      const observation = await driver.observe(
        path.join(runDir, `${String(step).padStart(3, "0")}.png`),
      );
      await log({ step, observation });
      if (observation.collections.length)
        recordSources.push({
          step,
          url: observation.url,
          collections: observation.collections,
        });
      const decision = await model.decide(
        {
          goal,
          step,
          observation,
          recordSources,
          history: history.slice(-16),
          readiness: {
            waitsUsed: readiness.used,
            waitLimit: 3,
            waitMilliseconds: 2000,
          },
        },
        signal,
      );
      steps++;
      const policy = readiness.apply(decision.action, observation.elements);
      const action = policy.action;
      await log({ step, decision });
      if (policy.retry)
        await log({
          step,
          readinessWait: readiness.used,
          effectiveAction: action,
        });
      await notify(
        `Step ${step + 1}: ${policy.retry ? `Not ready yet; waiting and re-observing (${readiness.used}/3).` : decision.reason}`,
        observation.screenshot,
      );
      const signature = JSON.stringify({
        action,
        url: observation.url,
        text: observation.text,
        elements: observation.elements,
      });
      repeats = signature === previous ? repeats + 1 : 0;
      previous = signature;
      if (repeats >= 2 && !policy.retry) {
        result = {
          status: "blocked",
          summary: "Repeated action produced no observable progress",
          runDir,
        };
        break;
      }
      if (action.type === "blocked") {
        result = { status: "blocked", summary: action.reason, runDir };
        break;
      }
      if (action.type === "ask") {
        if (!hooks.ask) {
          result = { status: "blocked", summary: action.question, runDir };
          break;
        }
        const answer = await Promise.race([
          hooks.ask(action.question),
          new Promise<never>((_, reject) => {
            signal.addEventListener(
              "abort",
              () => reject(new Error("Question cancelled or timed out")),
              { once: true },
            );
          }),
        ]);
        history.push({ question: action.question, answer });
        continue;
      }
      if (action.type === "finish") {
        let completion = action;
        let selectionCheck = checkCompletionSelection(
          goal,
          completion,
          recordSources,
        );
        if (
          !selectionCheck.passed &&
          "repairable" in selectionCheck &&
          selectionCheck.repairable &&
          completion.selection &&
          metadataRepairs < 1
        ) {
          metadataRepairs++;
          await log({ step, selectionCheck });
          await notify(
            "Checking completion: repairing output field paths only. No browser action will be repeated.",
          );
          const fields = await model.repairSelectionFields(
            {
              data: completion.data,
              fields: completion.selection.fields,
              error: selectionCheck.reason,
            },
            signal,
          );
          // Repair may qualify keys only; it cannot change mappings, source, row, order or data.
          const original = Object.entries(completion.selection.fields);
          const entries = Object.entries(fields);
          const used = new Set<string>();
          const pathsOnly =
            entries.length === original.length &&
            original.every(([key, columns]) => {
              const matches = entries.filter(
                ([path, value]) =>
                  !used.has(path) &&
                  (path === key || path.endsWith("." + key)) &&
                  JSON.stringify(value) === JSON.stringify(columns),
              );
              if (matches.length !== 1) return false;
              used.add(matches[0][0]);
              return true;
            });
          if (pathsOnly)
            completion = {
              ...completion,
              selection: { ...completion.selection, fields },
            };
          await log({
            step,
            completionRepair: {
              accepted: pathsOnly,
              originalFields: action.selection?.fields,
              proposedFields: fields,
            },
          });
          selectionCheck = checkCompletionSelection(
            goal,
            completion,
            recordSources,
          );
        }
        await log({ step, selectionCheck });
        if (
          !selectionCheck.passed &&
          "fieldMismatch" in selectionCheck &&
          selectionCheck.fieldMismatch &&
          fieldCorrections < 2
        ) {
          fieldCorrections++;
          history.push({
            action: completion,
            error: selectionCheck.reason,
            correction:
              "This completion is NOT verified. Correct the field mapping or gather the requested detail-page evidence. Never map a description to an entire card Text column. Map only source columns that actually represent the output field; other extracted fields need current-page evidence and the final audit. Complete any requested navigation before finishing.",
          });
          await log({ step, fieldCorrection: fieldCorrections });
          await notify(
            `Result not verified yet; gathering or correcting field evidence (${fieldCorrections}/2).`,
          );
          continue;
        }
        if (!selectionCheck.passed) {
          result = {
            status: "failed",
            summary: `Not verified: ${selectionCheck.reason}`,
            runDir,
          };
          break;
        }
        const checks = await driver.verify(completion, observation);
        await log({ step, checks });
        if (checks.every((c) => c.passed)) {
          const audit = await model.verifyGoal(
            {
              goal,
              observation,
              recordSources,
              selectionCheck,
              history: history.slice(-16),
              claim: completion,
            },
            signal,
          );
          await log({ step, audit });
          if (audit.verdict === "succeeded") {
            result = {
              status: "succeeded",
              summary: completion.summary,
              data: completion.data,
              runDir,
            };
            break;
          }
          if (audit.verdict === "blocked") {
            result = { status: "blocked", summary: audit.reason, runDir };
            break;
          }
          history.push({ action, error: audit.reason });
          continue;
        }
        history.push({
          action,
          error: "Completion evidence did not match the observed page",
          checks,
        });
        continue;
      }
      try {
        await driver.act(action);
        history.push({
          action,
          reason: decision.reason,
          before: {
            url: observation.url,
            text: observation.text.slice(0, 5000),
          },
          result: "Executed; inspect next observation to verify effect",
        });
      } catch (error) {
        history.push({
          action,
          error:
            error instanceof Error ? error.message : "Browser action failed",
        });
      }
    }
  } catch (error) {
    result = {
      status: hooks.signal?.aborted ? "cancelled" : "failed",
      summary: signal.aborted
        ? "Task cancelled or time limit reached"
        : error instanceof Error
          ? error.message
          : "Task failed",
      runDir,
    };
  } finally {
    await driver.close(path.join(runDir, "trace.zip")).catch(() => {});
    result.metrics = summarizeCalls(
      calls,
      process.env.OPENROUTER_MODEL!,
      steps,
      Math.round(performance.now() - started),
    );
    await writeFile(
      path.join(runDir, "result.json"),
      JSON.stringify(result, null, 2),
    );
  }
  await notify(`${result.status.toUpperCase()}: ${result.summary}`);
  return result;
}
