"use client"

import { useEffect, useState } from "react"

export function TitleBar() {
  const [time, setTime] = useState("")
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleString("zh-CN", { hour12: false }))
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <header className="flex items-center justify-between rounded-md border border-cyan-400/25 bg-[#0b1a2d] px-4 py-2.5 shadow-[0_0_0_1px_rgba(15,23,42,0.9),0_14px_32px_rgba(0,0,0,0.28)]">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded bg-cyan-400 font-mono text-sm font-bold text-[#06121f] shadow-[0_0_18px_rgba(34,211,238,0.45)]">
          CBI
        </div>
        <div>
          <h1 className="text-balance text-base font-semibold tracking-tight text-slate-50">计算机联锁模拟仿真系统</h1>
          <p className="font-mono text-[11px] text-cyan-200/70">Computer-Based Interlocking Simulator · 行车值班员操作台</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-2 rounded border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 sm:flex">
          <span className="size-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px] shadow-emerald-400" />
          <span className="font-mono text-xs text-emerald-300">联锁机 在线</span>
        </div>
        <span className="font-mono text-xs text-slate-200">{time}</span>
      </div>
    </header>
  )
}
