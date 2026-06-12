"use client"

import { useState } from "react"
import { useInterlocking, type OpMode } from "./interlocking-provider"
import { TutorialPanel } from "./tutorial-panel"
import { cn } from "@/lib/utils"
import { VALIDATION_GUIDE_STEPS } from "@/lib/validation-guide"

export function ControlPanel() {
  const { state, dispatch } = useInterlocking()
  const [tutorialOpen, setTutorialOpen] = useState(false)
  const guideStep = state.validationGuide.active ? VALIDATION_GUIDE_STEPS[state.validationGuide.step] : null
  const guidePassed = guideStep ? !!state.validationGuide.passed[state.validationGuide.step] : false
  const guideButtons = guideStep?.buttonLabels ?? []
  const guideButtonClass = "animate-pulse border-emerald-300 bg-emerald-400/18 text-emerald-100 shadow-[0_0_0_2px_rgba(52,211,153,0.45),0_0_22px_rgba(52,211,153,0.3)]"

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
      <TutorialPanel open={tutorialOpen} onClose={() => setTutorialOpen(false)} />
      {/* 进路 / 模式 */}
      <Panel title="操作模式">
        <div className="grid grid-cols-1 gap-2">
          <ModeBtn active={state.opMode === "route"} onClick={() => dispatch({ type: "SET_MODE", mode: "route" })}>
            进路操作（点选始端→终端）
          </ModeBtn>
        </div>
        {/* Simulation control: start / pause / resume */}
        <button
          onClick={() => {
            if (!state.train) dispatch({ type: "RUN_TRAIN" })
            else dispatch({ type: "TOGGLE_PAUSE" })
          }}
          className={cn(
            "mt-1 w-full rounded py-3 text-sm font-bold transition-all active:scale-[0.98]",
            // running
            state.train && !state.paused
              ? "bg-amber-400 text-[#06121f] shadow-[0_0_18px_rgba(250,204,21,0.25)] hover:bg-amber-300"
              : // paused
              state.train && state.paused
              ? "bg-emerald-400 text-[#06121f] shadow-[0_0_18px_rgba(52,211,153,0.25)] hover:bg-emerald-300"
              : // idle
                "bg-cyan-400 text-[#06121f] shadow-[0_0_18px_rgba(34,211,238,0.32)] hover:bg-cyan-300",
            guideButtons.includes("▶ 模拟列车运行") && guideButtonClass,
          )}
        >
          {!state.train ? (
            <>▶ 模拟列车运行</>
          ) : state.paused ? (
            <>▶ 继续运行</>
          ) : (
            <>⏸ 暂停模拟</>
          )}
        </button>
      </Panel>

      {/* 教程 */}
      <Panel title="演示教程">
        <button
          onClick={() => setTutorialOpen(true)}
          className="w-full rounded border border-emerald-300/45 bg-emerald-400/12 px-2 py-2.5 text-sm font-semibold text-emerald-100 transition-all hover:bg-emerald-400/20 active:scale-[0.98]"
        >
          功能验收教程
        </button>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          按评分项查看演示步骤和观察要点
        </p>
      </Panel>

      {/* 验收引导模式 */}
      <Panel title="验收引导模式">
        {!guideStep ? (
          <button
            onClick={() => dispatch({ type: "GUIDE_START" })}
            className="w-full rounded border border-cyan-300/45 bg-cyan-400/12 px-2 py-2.5 text-sm font-semibold text-cyan-100 transition-all hover:bg-cyan-400/20 active:scale-[0.98]"
          >
            开始验收引导
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="rounded border border-emerald-300/35 bg-emerald-400/10 p-2">
              <div className="flex items-center justify-between gap-2 font-mono text-[11px] text-emerald-200">
                <span>
                  {state.validationGuide.step + 1}/{VALIDATION_GUIDE_STEPS.length}
                </span>
                <span>{guideStep.score}</span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-50">{guideStep.title}</p>
                <span
                  className={cn(
                    "shrink-0 rounded border px-2 py-0.5 text-[11px] font-bold",
                    guidePassed
                      ? "border-emerald-300/55 bg-emerald-300/20 text-emerald-100"
                      : "border-amber-300/45 bg-amber-300/12 text-amber-100",
                  )}
                >
                  {guidePassed ? "演示成功" : "等待演示"}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-amber-100">准备：{guideStep.prepare}</p>
              <p className="mt-1 text-xs leading-relaxed text-cyan-100">点击：{guideStep.click}</p>
              <p className="mt-1 text-xs leading-relaxed text-emerald-100">观察：{guideStep.observe}</p>
              {guidePassed && (
                <p className="mt-1 rounded border border-emerald-300/35 bg-emerald-300/12 px-2 py-1 text-xs font-semibold text-emerald-100">
                  本项已满足验收条件，可以继续下一项。
                </p>
              )}
            </div>
            <button
              onClick={() => dispatch({ type: "GUIDE_PREPARE" })}
              className="rounded border border-amber-300/50 bg-amber-300/14 px-2 py-2 text-xs font-semibold text-amber-100 shadow-[0_0_0_1px_rgba(251,191,36,0.18)] hover:bg-amber-300/22"
            >
              准备本项
            </button>
            <p className="text-[11px] leading-relaxed text-slate-300">
              建议每项演示前先点一次，系统会清除上一项留下的进路、占用、锁闭、封锁、断丝和倒计时。
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => dispatch({ type: "GUIDE_PREV" })}
                className="rounded border border-slate-500/40 bg-slate-950/55 px-2 py-2 text-xs font-semibold text-slate-100 hover:border-cyan-300/45"
              >
                上一项
              </button>
              <button
                onClick={() => dispatch({ type: "GUIDE_NEXT" })}
                className="rounded border border-cyan-300/45 bg-cyan-400/12 px-2 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-400/20"
              >
                下一项
              </button>
              <button
                onClick={() => dispatch({ type: "GUIDE_STOP" })}
                className="rounded border border-red-400/40 bg-red-500/10 px-2 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/18"
              >
                退出
              </button>
            </div>
          </div>
        )}
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
                guideButtons.includes(b.label) && guideButtonClass,
                // 总取消按钮：当处于 total-cancel 模式时高亮
                b.label === "总取消" && state.opMode === "total-cancel"
                  ? "border-red-400 bg-red-500/30 text-red-100 shadow-[0_0_14px_rgba(239,68,68,0.35)]"
                  : // 总人解按钮：当处于 manual-unlock 模式时高亮
                  b.label === "总人解" && state.opMode === "manual-unlock"
                    ? "border-amber-300 bg-amber-400/30 text-amber-50 shadow-[0_0_14px_rgba(251,191,36,0.35)]"
                    : b.tone === "danger"
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
            <ModeBtn key={m.mode} active={state.opMode === m.mode} guide={guideButtons.includes(m.label)} onClick={() => dispatch({ type: "SET_MODE", mode: m.mode })}>
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
            <ModeBtn key={m.mode} active={state.opMode === m.mode} guide={guideButtons.includes(m.label)} onClick={() => dispatch({ type: "SET_MODE", mode: m.mode })}>
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
  guide,
  onClick,
  children,
}: {
  active: boolean
  guide?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded border px-2 py-2 text-sm font-semibold transition-all active:scale-[0.97]",
        guide && "border-emerald-300 bg-emerald-400/18 text-emerald-100 shadow-[0_0_0_2px_rgba(52,211,153,0.45)]",
        active
          ? "border-cyan-300 bg-cyan-400/18 text-cyan-100 shadow-[0_0_0_1px_rgba(34,211,238,0.35)]"
          : "border-slate-500/35 bg-slate-950/55 text-slate-100 hover:border-cyan-300/45 hover:bg-slate-800",
      )}
    >
      {children}
    </button>
  )
}
