import type { Action } from "./schema.js";
// One task-wide budget prevents new element IDs or page changes from resetting retries.
export class ReadinessBudget {
  private attempts = 0;
  constructor(
    private readonly limit = 3,
    private readonly delay = 2000,
  ) {}
  get used() {
    return this.attempts;
  }
  apply(
    action: Action,
    elements: { id: string; disabled?: boolean }[],
  ): { action: Action; retry: boolean } {
    const disabledClick =
      action.type === "click" &&
      elements.some((e) => e.id === action.target && e.disabled);
    const notReady = action.type === "blocked" && action.cause === "not_ready";
    if (!disabledClick && !notReady) return { action, retry: false };
    if (this.attempts >= this.limit)
      return {
        action: {
          type: "blocked",
          cause: "not_ready",
          reason: `Page or control remained unavailable after ${this.limit} bounded readiness waits.`,
        },
        retry: false,
      };
    this.attempts++;
    return { action: { type: "wait", milliseconds: this.delay }, retry: true };
  }
}
