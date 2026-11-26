import { h_flex } from "gpui-base";
import { div, View } from "gpui-kit";
import { checking, exec, home, props, theme, watchFolder } from "herdr";
import {
  barModel,
  candidates,
  configDirFrom,
  describeFailure,
  parseData,
  stateDir,
} from "./core.js";

export default class ClaudeStatusline extends View {
  init(_props, cx) {
    this.data = null;
    this.error = null;
    this.binary = null;
    this.propBinary = undefined;
    this.configDir = null;
    if (checking()) {
      this.data = {
        rate5h: {
          ok: true,
          used: 8,
          target: 54,
          state: "bad",
          resets_at: Math.floor(Date.now() / 1000) + 3600,
        },
        rate7d: { ok: false },
      };
      return;
    }
    cx.spawn(async (cx) => {
      await this.refresh();
      cx.notify();
      for (;;) {
        try {
          if (!this.configDir) throw new Error("no config dir");
          await watchFolder(
            `${stateDir(this.binary ?? "", this.configDir)}/cache`,
          );
        } catch {
          await cx.sleep(60000);
        }
        await this.refresh();
        cx.notify();
      }
    });
    // ok flips to false at reset without a cache write
    cx.timer.every(60000, (cx) => {
      this.refresh().then(() => cx.notify());
    });
  }

  async resolve() {
    const env = await exec("sh", ["-c", 'printf %s "$CLAUDE_CONFIG_DIR"']);
    this.configDir = configDirFrom(env.stdout ?? "", home());
    this.propBinary = props()?.binary;
    const list = candidates(this.propBinary, this.configDir);
    for (const c of list) {
      const bare = !c.includes("/");
      const r = bare
        ? await exec("sh", ["-c", `command -v ${c}`])
        : await exec("test", ["-x", c]);
      if (r.code === 0) {
        this.binary = bare ? r.stdout.trim() || c : c;
        return;
      }
    }
    this.error = "claude-statusline not found";
    this.data = null;
  }

  async refresh() {
    try {
      if (this.binary && props()?.binary !== this.propBinary)
        this.binary = null;
      if (!this.binary) await this.resolve();
      if (!this.binary) return;
      const r = await exec(this.binary, ["rate-bars", "--data"], {
        timeout: 5000,
      });
      if (r.code !== 0) {
        this.error = describeFailure({ code: r.code, stderr: r.stderr ?? "" });
        this.data = null;
        this.binary = null;
        return;
      }
      this.data = parseData(r.stdout);
      this.error = null;
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
      this.data = null;
      this.binary = null;
    }
  }

  bar(label, rate, t, nowSec) {
    const m = barModel(label, rate, t, nowSec, this.error ?? undefined);
    return h_flex()
      .gap(6)
      .items_center()
      .child(div().child(label))
      .child(
        div()
          .id(label)
          .relative()
          .w(80)
          .h(6)
          .rounded(3)
          .bg(t.border)
          .tooltip(m.tooltip)
          .child(div().w(`${m.fill}%`).h_full().rounded(3).bg(m.colour))
          .when(m.marker !== null, (el) =>
            el.child(
              h_flex()
                .absolute()
                .inset_0()
                .child(
                  div()
                    .w(`${Math.min(m.marker, 97.5)}%`)
                    .flex_shrink_0(),
                )
                .child(div().w(2).h_full().bg(t.foreground)),
            ),
          ),
      );
  }

  render() {
    const t = theme();
    const nowSec = Math.floor(Date.now() / 1000);
    return h_flex()
      .size_full()
      .px(14)
      .gap(12)
      .items_center()
      .justify_end()
      .bg(t.chrome)
      .border_t(1)
      .border_color(t.border)
      .text_size(11.8)
      .text_color(t.muted)
      .child(this.bar("5h", this.data?.rate5h ?? null, t, nowSec))
      .child(this.bar("7d", this.data?.rate7d ?? null, t, nowSec));
  }
}
