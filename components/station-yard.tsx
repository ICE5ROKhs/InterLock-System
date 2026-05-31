"use client"

import { useInterlocking } from "./interlocking-provider"
import {
  SIGNALS,
  SWITCHES,
  SEGMENTS,
  THROAT_LINKS,
  TRACK_TARGETS,
  ROUTES,
  SIGNAL_COLORS,
  pointAt,
  type Aspect,
  type SignalDef,
} from "@/lib/interlocking-data"

const SEG_COLOR = {
  free: "#4b5563", // 空闲 灰
  locked: "#ffd60a", // 锁闭 黄
  occupied: "#ff3b30", // 占用 红
} as const

function aspectLamps(a: Aspect): string[] {
  switch (a) {
    case "red":
      return [SIGNAL_COLORS.red]
    case "green":
      return [SIGNAL_COLORS.green]
    case "yellow":
      return [SIGNAL_COLORS.yellow]
    case "double-yellow":
      return [SIGNAL_COLORS.yellow, SIGNAL_COLORS.yellow]
    case "red-white":
      return [SIGNAL_COLORS.red, SIGNAL_COLORS.white]
    case "white":
      return [SIGNAL_COLORS.white]
    case "blue":
      return [SIGNAL_COLORS.blue]
  }
}

export function StationYard() {
  const { state, dispatch } = useInterlocking()
  const train = state.train
  const trainRoute = train ? ROUTES.find((r) => r.id === train.routeId) : null
  const trainPose = train && trainRoute ? pointAt(trainRoute.trainPath, train.t) : null

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg border border-border bg-[#0b1220]">
      {/* 站场标题 */}
      <div className="pointer-events-none absolute left-4 top-3 z-10 font-mono text-xs tracking-widest text-cyan-300/80">
        中心站 · 咽喉区站场图
      </div>
      {state.selectedSignal && (
        <div className="pointer-events-none absolute right-4 top-3 z-10 animate-pulse font-mono text-xs text-amber-300">
          已选始端：{SIGNALS.find((s) => s.id === state.selectedSignal)?.label} — 请点击终端
        </div>
      )}

      <svg viewBox="0 0 1200 440" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0H0V40" fill="none" stroke="#13203a" strokeWidth="1" />
          </pattern>
          <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect x="0" y="0" width="1200" height="440" fill="url(#grid)" />

        {/* 咽喉连接线（轨道骨架） */}
        {THROAT_LINKS.map((pts, i) => (
          <polyline
            key={i}
            points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="#2b3a55"
            strokeWidth="6"
            strokeLinecap="round"
          />
        ))}

        {/* 轨道区段 */}
        {SEGMENTS.map((seg) => {
          const st = state.segs[seg.id]
          const color = SEG_COLOR[st]
          return (
            <g key={seg.id}>
              <polyline
                points={seg.path.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke={color}
                strokeWidth={st === "occupied" ? 9 : 7}
                strokeLinecap="round"
                className="transition-[stroke] duration-300"
                style={st === "occupied" ? { filter: "url(#glow)" } : undefined}
              />
              {/* 轨枕装饰 */}
              <text
                x={seg.labelPos.x}
                y={seg.labelPos.y}
                textAnchor="middle"
                className="font-mono"
                fontSize="11"
                fill={st === "free" ? "#64748b" : color}
              >
                {seg.label}
              </text>
            </g>
          )
        })}

        {/* 股道终端可点击区域 */}
        {state.selectedSignal &&
          TRACK_TARGETS.map((t) => (
            <rect
              key={t.id}
              x={t.rect.x}
              y={t.rect.y}
              width={t.rect.w}
              height={t.rect.h}
              rx="4"
              fill="rgba(56,189,248,0.12)"
              stroke="rgba(56,189,248,0.6)"
              strokeDasharray="4 3"
              className="cursor-pointer"
              onClick={() => dispatch({ type: "CLICK_TARGET", id: t.id })}
            >
              <title>选择终端：{t.label}</title>
            </rect>
          ))}

        {/* 道岔 */}
        {SWITCHES.map((sw) => {
          const pos = state.switchPos[sw.id]
          const end = pos === "normal" ? sw.normalEnd : sw.reverseEnd
          const locked = state.switchLocked[sw.id]
          const blocked = state.switchBlocked[sw.id]
          const moving = state.movingSwitch === sw.id
          return (
            <g
              key={sw.id}
              className="cursor-pointer"
              onClick={() => dispatch({ type: "CLICK_SWITCH", id: sw.id })}
            >
              {/* 尖轨方向 */}
              <line
                x1={sw.pivot.x}
                y1={sw.pivot.y}
                x2={end.x}
                y2={end.y}
                stroke={moving ? "#f59e0b" : pos === "reverse" ? "#38bdf8" : "#86efac"}
                strokeWidth="5"
                strokeLinecap="round"
                className="transition-all duration-300"
              />
              <circle
                cx={sw.pivot.x}
                cy={sw.pivot.y}
                r="7"
                fill="#0b1220"
                stroke={blocked ? "#ff3b30" : locked ? "#ffd60a" : "#94a3b8"}
                strokeWidth="2.5"
              />
              <text
                x={sw.pivot.x}
                y={sw.pivot.y - 12}
                textAnchor="middle"
                fontSize="11"
                className="font-mono"
                fill="#cbd5e1"
              >
                {sw.label}
              </text>
              {(locked || blocked) && (
                <text x={sw.pivot.x + 9} y={sw.pivot.y + 14} fontSize="11" fill={blocked ? "#ff3b30" : "#ffd60a"}>
                  {blocked ? "封" : "锁"}
                </text>
              )}
            </g>
          )
        })}

        {/* 信号机 */}
        {SIGNALS.map((sig) => (
          <SignalMast
            key={sig.id}
            sig={sig}
            aspect={state.aspects[sig.id]}
            selected={state.selectedSignal === sig.id}
            onClick={() => dispatch({ type: "CLICK_SIGNAL", id: sig.id })}
          />
        ))}

        {/* 列车 */}
        {trainPose && <Train x={trainPose.p.x} y={trainPose.p.y} angle={trainPose.angle} shunt={trainRoute?.kind === "shunt"} />}
      </svg>
    </div>
  )
}

function SignalMast({
  sig,
  aspect,
  selected,
  onClick,
}: {
  sig: SignalDef
  aspect: Aspect
  selected: boolean
  onClick: () => void
}) {
  const lamps = aspectLamps(aspect)
  const dir = sig.facing === "right" ? 1 : -1
  const small = sig.kind === "shunt"
  const r = small ? 5 : 6
  const headStart = sig.pos.x + dir * 14
  return (
    <g className="cursor-pointer" onClick={onClick}>
      {selected && (
        <circle cx={sig.pos.x} cy={sig.pos.y} r="20" fill="none" stroke="#fbbf24" strokeWidth="2" className="animate-pulse" />
      )}
      {/* 基座立柱 */}
      <line x1={sig.pos.x} y1={sig.pos.y} x2={sig.pos.x} y2={sig.pos.y + (small ? 12 : 16)} stroke="#94a3b8" strokeWidth="2.5" />
      <line x1={sig.pos.x - 5} y1={sig.pos.y + (small ? 12 : 16)} x2={sig.pos.x + 5} y2={sig.pos.y + (small ? 12 : 16)} stroke="#94a3b8" strokeWidth="2.5" />
      {/* 灯头横臂 */}
      <line x1={sig.pos.x} y1={sig.pos.y} x2={headStart} y2={sig.pos.y} stroke="#94a3b8" strokeWidth="2" />
      {/* 灯 */}
      {lamps.map((c, i) => {
        const cx = headStart + dir * (i * (r * 2 + 3) + r)
        return (
          <g key={i}>
            <circle cx={cx} cy={sig.pos.y} r={r + 2} fill="#0b1220" stroke="#1e293b" strokeWidth="1" />
            <circle cx={cx} cy={sig.pos.y} r={r} fill={c} style={{ filter: "url(#glow)" }}>
              {(aspect === "red-white" && i === 0) || aspect === "white" ? (
                <animate attributeName="opacity" values="1;0.35;1" dur="1s" repeatCount="indefinite" />
              ) : null}
            </circle>
          </g>
        )
      })}
      {/* 标签 */}
      <text
        x={sig.pos.x}
        y={sig.pos.y - (small ? 12 : 14)}
        textAnchor="middle"
        fontSize={small ? "11" : "13"}
        className="font-mono font-semibold"
        fill={sig.kind === "shunt" ? "#cbd5e1" : "#e2e8f0"}
      >
        {sig.label}
      </text>
    </g>
  )
}

function Train({ x, y, angle, shunt }: { x: number; y: number; angle: number; shunt?: boolean }) {
  const w = 46
  const h = 16
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`} className="pointer-events-none">
      {/* 车体 */}
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx="4" fill={shunt ? "#0ea5e9" : "#f8fafc"} stroke="#0b1220" strokeWidth="1.5" />
      {/* 车头 */}
      <rect x={w / 2 - 12} y={-h / 2} width={12} height={h} rx="3" fill={shunt ? "#0284c7" : "#ef4444"} />
      {/* 车窗 */}
      <rect x={-w / 2 + 5} y={-4} width={8} height={8} rx="1.5" fill="#1e293b" />
      <rect x={-w / 2 + 17} y={-4} width={8} height={8} rx="1.5" fill="#1e293b" />
      {/* 前灯 */}
      <circle cx={w / 2 - 3} cy={0} r="2.4" fill="#fde047">
        <animate attributeName="opacity" values="1;0.4;1" dur="0.8s" repeatCount="indefinite" />
      </circle>
    </g>
  )
}
