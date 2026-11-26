import assert from "node:assert/strict";
import { test } from "node:test";
import {
  barModel,
  candidates,
  configDirFrom,
  formatReset,
  parseData,
  stateDir,
} from "../mods/claude-statusline/core.js";

const t = { done: "D", ansi3: "Y", blocked: "B", dim: "M" };
const now = 1764158400;

const reading = {
  rate5h: {
    ok: true,
    used: 75,
    target: 50,
    state: "warn",
    resets_at: 1760009000,
  },
  rate7d: { ok: false },
};
const json = JSON.stringify(reading);

test("parses a full reading", () => {
  assert.deepEqual(parseData(json), reading);
});

test("parses only the first line", () => {
  assert.deepEqual(parseData(`${json}\n\n`), reading);
  assert.deepEqual(parseData(`${json}\nnoise`), reading);
});

test("rejects junk", () => {
  assert.throws(() => parseData("Usage: …"), /unexpected output/);
  assert.throws(() => parseData('{"rate5h":{"ok":false}}'));
});

test("maps state to colour", () => {
  const rate = (state) => ({
    ok: true,
    used: 8,
    target: 54,
    state,
    resets_at: now + 3600,
  });
  assert.deepEqual(pick(barModel("5h", rate("bad"), t, now)), {
    fill: 8,
    marker: 54,
    colour: "B",
    dim: false,
  });
  assert.equal(barModel("5h", rate("good"), t, now).colour, "D");
  assert.equal(barModel("5h", rate("warn"), t, now).colour, "Y");
});

test("clamps out-of-range percentages", () => {
  const m = barModel(
    "5h",
    { ok: true, used: 130, target: -5, state: "bad", resets_at: now + 3600 },
    t,
    now,
  );
  assert.equal(m.fill, 100);
  assert.equal(m.marker, 0);
  assert.match(m.tooltip, /130%/);
});

test("no reading is dim", () => {
  const m = barModel("7d", { ok: false }, t, now);
  assert.equal(m.fill, 0);
  assert.equal(m.marker, null);
  assert.equal(m.dim, true);
  assert.equal(m.colour, "M");
  assert.equal(m.tooltip, "7d: no reading");
});

test("error is dim with reason", () => {
  const m = barModel("5h", null, t, now, "boom");
  assert.equal(m.dim, true);
  assert.equal(m.tooltip, "5h: boom");
});

test("tooltip text", () => {
  const m = barModel(
    "5h",
    { ok: true, used: 8, target: 54, state: "bad", resets_at: now + 3600 },
    t,
    now,
  );
  assert.equal(m.tooltip, "5h: 8% used, pace 54%, resets 13:00");
});

test("past reset says now", () => {
  assert.equal(formatReset(now - 10, now), "now");
});

test("far reset shows weekday", () => {
  assert.equal(formatReset(now + 3 * 86400, now), "Sat 12:00");
});

test("candidates order", () => {
  assert.deepEqual(candidates(undefined, "/h/.claude-work"), [
    "/h/.claude-work/plugins/data/statusline-claude-statusline/bin/claude-statusline",
    "/h/.claude-work/claude-statusline/claude-statusline",
    "claude-statusline",
  ]);
});

test("candidates puts the prop first and skips an empty prop", () => {
  assert.equal(candidates("/opt/cs", "/h/.c")[0], "/opt/cs");
  assert.deepEqual(candidates("", "/h/.c"), candidates(undefined, "/h/.c"));
});

test("state dir for plugin binary", () => {
  assert.equal(
    stateDir(
      "/h/.c/plugins/data/statusline-claude-statusline/bin/claude-statusline",
      "/h/.c",
    ),
    "/h/.c/plugins/data/statusline-claude-statusline",
  );
});

test("state dir otherwise", () => {
  assert.equal(
    stateDir("/h/.c/claude-statusline/claude-statusline", "/h/.c"),
    "/h/.c/claude-statusline",
  );
  assert.equal(
    stateDir("/usr/local/bin/claude-statusline", "/h/.c"),
    "/h/.c/claude-statusline",
  );
});

test("config dir default", () => {
  assert.equal(configDirFrom("", "/h"), "/h/.claude");
  assert.equal(configDirFrom("/h/.claude-work/\n", "/h"), "/h/.claude-work");
});

function pick(m) {
  return { fill: m.fill, marker: m.marker, colour: m.colour, dim: m.dim };
}
