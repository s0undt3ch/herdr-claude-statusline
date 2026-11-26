const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function parseData(stdout) {
  const line = stdout.trim().split("\n")[0];
  const fail = () => new Error(`unexpected output: ${stdout.slice(0, 80)}`);
  let data;
  try {
    data = JSON.parse(line);
  } catch {
    throw fail();
  }
  if (!data || typeof data !== "object" || !data.rate5h || !data.rate7d)
    throw fail();
  return { rate5h: data.rate5h, rate7d: data.rate7d };
}

const clamp = (n) => Math.min(100, Math.max(0, n));
const pad = (n) => String(n).padStart(2, "0");

export function formatReset(resetsAt, nowSec) {
  const diff = resetsAt - nowSec;
  if (diff <= 0) return "now";
  const d = new Date(resetsAt * 1000);
  const hhmm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return diff < 86400 ? hhmm : `${DAYS[d.getDay()]} ${hhmm}`;
}

export function barModel(label, rate, t, nowSec, error) {
  if (!rate || !rate.ok) {
    return {
      fill: 0,
      marker: null,
      colour: t.dim,
      dim: true,
      tooltip: `${label}: ${rate ? "no reading" : (error ?? "no reading")}`,
    };
  }
  const colours = { good: t.done, warn: t.ansi3, bad: t.blocked };
  return {
    fill: clamp(rate.used),
    marker: clamp(rate.target),
    colour: colours[rate.state] ?? t.dim,
    dim: false,
    tooltip: `${label}: ${rate.used}% used, pace ${rate.target}%, resets ${formatReset(rate.resets_at, nowSec)}`,
  };
}
