import { h_flex } from "gpui-base";
import { div, View } from "gpui-kit";
import { theme } from "herdr";
import { barModel } from "./core.js";

export default class ClaudeStatusline extends View {
  init() {
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
    this.error = null;
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
                .child(div().w(`${m.marker}%`))
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
