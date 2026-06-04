"use client"

import { useInterlocking, type OpMode } from "./interlocking-provider"
import { cn } from "@/lib/utils"

export function ControlPanel() {
  const { state, dispatch } = useInterlocking()

  const systemBtns: { label: string; action: () => void; tone?: "danger" | "warn" }[] = [
    { label: "总取消", action: () => dispatch({ type: "TOTAL_CANCEL" }) },
    { label: "总人解", action: () => dispatch({ type: "TOTAL_MANUAL_RELEASE" }), tone: "warn" },
    { label: "上电解锁", action: () => dispatch({ type: "POWER_RESET" }) },
    { label: "道岔总定", action: () => dispatch({ type: "ALL_NORMAL" }) },
    { label: "道岔总反", action: () => dispatch({ type: "ALL_REVERSE" }), tone: "warn" },
    { label: "清提示", action: () => dispatch({ type: "CLEAR_MSG" }) },
  ]

  const switchModes: { label: string; mode: OpMode }[] = [
    { label: "单操", mode: "single-op" },
    { label: "单锁", mode: "single-lock" },
    { label: "单解", mode: "single-unlock" },
    { label: "封锁", mode: "block" },
    { label: "解封", mode: "unblock" },
  ]

  const signalModes: { label: string; mode: OpMode }[] = [
    { label: "断丝", mode: "signal-break" },
    { label: "恢复信号", mode: "signal-repair" },
  ]

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto rounded-md border border-cyan-400/20 bg-[#081827] p-3 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.8)]">
      {/* 进路 / 模式 */}
      <Panel title="操作模式">
        <div className="grid grid-cols-1 gap-2">
          <ModeBtn active={state.opMode === "route"} onClick={() => dispatch({ type: "SET_MODE", mode: "route" })}>
            进路操作（点选始端→终端）
          </ModeBtn>
        </div>
        <button
          onClick={() => dispatch({ type: "RUN_TRAIN" })}
          className="mt-1 w-full rounded bg-cyan-400 py-3 text-sm font-bold text-[#06121f] shadow-[0_0_18px_rgba(34,211,238,0.32)] transition-all hover:bg-cyan-300 active:scale-[0.98]"
        >
          ▶ 模拟列车运行
        </button>
      </Panel>

      {/* 系统级按钮 */}
      <Panel title="系统操作">
        <div className="grid grid-cols-2 gap-2">
          {systemBtns.map((b) => (
            <button
              key={b.label}
              onClick={b.action}
              className={cn(
                "rounded border px-2 py-2.5 text-sm font-semibold transition-all active:scale-[0.97]",
                b.tone === "danger"
                  ? "border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                  : b.tone === "warn"
                    ? "border-amber-400/45 bg-amber-400/10 text-amber-200 hover:bg-amber-400/18"
                    : "border-slate-500/35 bg-slate-900/70 text-slate-100 hover:border-cyan-300/45 hover:bg-slate-800",
              )}
            >
              {b.label}
            </button>
          ))}
        </div>
      </Panel>

      {/* 道岔专用 */}
      <Panel title="道岔操作（选模式后点击道岔）">
        <div className="grid grid-cols-3 gap-2">
          {switchModes.map((m) => (
            <ModeBtn key={m.mode} active={state.opMode === m.mode} onClick={() => dispatch({ type: "SET_MODE", mode: m.mode })}>
              {m.label}
            </ModeBtn>
          ))}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          单操：动作延时 0.5s 变位 · 单锁/封锁后进路不可使用该道岔
        </p>
      </Panel>

      {/* 信号设备故障仿真 */}
      <Panel title="信号设备仿真（选模式后点击信号机）">
        <div className="grid grid-cols-2 gap-2">
          {signalModes.map((m) => (
            <ModeBtn key={m.mode} active={state.opMode === m.mode} onClick={() => dispatch({ type: "SET_MODE", mode: m.mode })}>
              {m.label}
            </ModeBtn>
          ))}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          断丝：灯位熄灭并阻止信号开放 · 恢复后可重新办理进路
        </p>
      </Panel>

      {/* 当前活动进路 */}
      <Panel title={`活动进路（${state.activeRoutes.length}）`}>
        {state.activeRoutes.length === 0 ? (
          <p className="text-xs text-muted-foreground">暂无已建立的进路</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {state.activeRoutes.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded border border-slate-600/50 bg-slate-950/60 px-2.5 py-1.5 text-xs"
              >
                <span className="text-slate-100">{r.name}</span>
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 font-mono text-[10px]",
                    r.approached ? "bg-red-500/20 text-red-300" : "bg-emerald-500/20 text-emerald-300",
                  )}
                >
                  {r.approached ? "已接近" : "锁闭"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-slate-600/45 bg-[#0c1f34] p-3">
      <h3 className="mb-2.5 border-l-2 border-cyan-300 pl-2 font-mono text-xs uppercase tracking-wider text-cyan-200">{title}</h3>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  )
}

function ModeBtn({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded border px-2 py-2 text-sm font-semibold transition-all active:scale-[0.97]",
        active
          ? "border-cyan-300 bg-cyan-400/18 text-cyan-100 shadow-[0_0_0_1px_rgba(34,211,238,0.35)]"
          : "border-slate-500/35 bg-slate-950/55 text-slate-100 hover:border-cyan-300/45 hover:bg-slate-800",
      )}
    >
      {children}
    </button>
  )
}
