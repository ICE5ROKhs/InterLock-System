"use client"

import { useInterlocking } from "./interlocking-provider"
import { cn } from "@/lib/utils"

export function InfoPanel() {
  const { state } = useInterlocking()

  return (
    <div className="grid h-full grid-cols-1 gap-3 lg:grid-cols-[1fr_260px]">
      {/* 提示信息窗 */}
      <section className="flex min-h-0 flex-col rounded-md border border-cyan-400/20 bg-[#081827] p-3 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.8)]">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="border-l-2 border-cyan-300 pl-2 font-mono text-xs uppercase tracking-wider text-cyan-200">操作提示 · 报警信息</h3>
          {state.countdown && (
            <span className="flex items-center gap-1.5 rounded border border-amber-400/35 bg-amber-400/12 px-2 py-1 font-mono text-xs text-amber-200">
              <span className="size-2 animate-ping rounded-full bg-amber-400" />
              人工解锁倒计时 {state.countdown.remain}s
            </span>
          )}
        </div>
        <ul className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto rounded border border-slate-700/55 bg-[#050b13] p-2 font-mono text-xs">
          {state.messages.length === 0 && <li className="text-slate-500">— 暂无提示 —</li>}
          {state.messages.map((m) => (
            <li
              key={m.id}
              className={cn(
                "flex gap-2 rounded px-2 py-1",
                m.level === "ok" && "text-emerald-300",
                m.level === "warn" && "text-amber-300",
                m.level === "error" && "bg-red-500/12 text-red-300",
                m.level === "info" && "text-slate-300",
              )}
            >
              <span className="shrink-0 text-slate-500">{m.time}</span>
              <span className="text-pretty">{m.text}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* 图例 */}
      <section className="rounded-md border border-cyan-400/20 bg-[#081827] p-3 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.8)]">
        <h3 className="mb-2 border-l-2 border-cyan-300 pl-2 font-mono text-xs uppercase tracking-wider text-cyan-200">显示图例</h3>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
          <Legend color="#4b5563" label="区段空闲" line />
          <Legend color="#ffd60a" label="区段锁闭" line />
          <Legend color="#ff3b30" label="区段占用" line />
          <Legend color="#34d96b" label="绿灯·通过" />
          <Legend color="#ffd60a" label="黄灯·侧线" />
          <Legend color="#ff3b30" label="红灯·禁止" />
          <Legend color="#f5f7fa" label="月白·调车" />
          <Legend color="#2f86ff" label="蓝灯·禁调" />
          <Legend color="#86efac" label="道岔定位" line />
          <Legend color="#38bdf8" label="道岔反位" line />
        </div>
      </section>
    </div>
  )
}

function Legend({ color, label, line }: { color: string; label: string; line?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-slate-200">
      {line ? (
        <span className="h-1 w-5 rounded-full" style={{ backgroundColor: color }} />
      ) : (
        <span className="size-3 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }} />
      )}
      <span>{label}</span>
    </div>
  )
}
