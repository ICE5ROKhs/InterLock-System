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
    <header className="flex items-center justify-between rounded-lg border border-border bg-card/40 px-4 py-2.5">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-md bg-cyan-500/15 font-mono text-sm font-bold text-cyan-300">
          CBI
        </div>
        <div>
          <h1 className="text-balance text-base font-semibold tracking-tight">计算机联锁模拟仿真系统</h1>
          <p className="font-mono text-[11px] text-muted-foreground">Computer-Based Interlocking Simulator · 行车值班员操作台</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-2 sm:flex">
          <span className="size-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px] shadow-emerald-400" />
          <span className="font-mono text-xs text-emerald-300">联锁机 在线</span>
        </div>
        <span className="font-mono text-xs text-slate-300">{time}</span>
      </div>
    </header>
  )
}
