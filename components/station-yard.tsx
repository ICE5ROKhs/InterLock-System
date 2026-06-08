"use client"

import { useInterlocking } from "./interlocking-provider"
import {
  SIGNALS,
  SWITCHES,
  SEGMENTS,
  THROAT_LINKS,
  OUTDOOR_EQUIPMENT,
  TRACK_TARGETS,
  ROUTES,
  SIGNAL_COLORS,
  pointAt,
  type Aspect,
  type SignalDef,
} from "@/lib/interlocking-data"
import { VALIDATION_GUIDE_STEPS } from "@/lib/validation-guide"

const SEG_COLOR = {
  free: "#8a96a8", // 空闲 灰
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
  const guideStep = state.validationGuide.active ? VALIDATION_GUIDE_STEPS[state.validationGuide.step] : null
  const guideSegments = new Set(guideStep?.segmentIds ?? [])
  const guideSignals = new Set(guideStep?.signalIds ?? [])
  const guideSwitches = new Set(guideStep?.switchIds ?? [])
  const guideTargets = new Set(guideStep?.targetIds ?? [])

  return (
    <div className="relative h-full w-full overflow-hidden rounded-md border border-cyan-400/25 bg-[#07101d] shadow-[inset_0_0_0_1px_rgba(15,23,42,0.8),0_18px_40px_rgba(0,0,0,0.34)]">
      {/* 站场标题 */}
      <div className="pointer-events-none absolute left-4 top-3 z-10 rounded border border-cyan-400/20 bg-[#081827]/85 px-2.5 py-1 font-mono text-xs tracking-widest text-cyan-200">
        中心站 · 咽喉区站场图
      </div>
      <div className="pointer-events-none absolute bottom-3 right-4 z-10 rounded border border-slate-500/25 bg-[#081827]/85 px-2.5 py-1 font-mono text-[11px] text-slate-300">
        灰=空闲 黄=锁闭 红=占用
      </div>
      {state.selectedSignal && (
        <div className="pointer-events-none absolute right-4 top-3 z-10 animate-pulse rounded border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 font-mono text-xs text-amber-200">
          已选始端：{SIGNALS.find((s) => s.id === state.selectedSignal)?.label} — 请点击终端
        </div>
      )}

      <svg viewBox="0 0 1200 440" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0H0V40" fill="none" stroke="#102033" strokeWidth="0.8" />
          </pattern>
          <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect x="0" y="0" width="1200" height="440" fill="#07101d" />
        <rect x="0" y="0" width="1200" height="440" fill="url(#grid)" opacity="0.65" />

        {/* 咽喉连接线（轨道骨架） */}
        {THROAT_LINKS.map((pts, i) => (
          <polyline
            key={i}
            points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="#586577"
            strokeWidth="7"
            strokeLinecap="round"
          />
        ))}

        {/* 轨道区段 */}
        {SEGMENTS.map((seg) => {
          const st = state.segs[seg.id]
          const color = SEG_COLOR[st]
          const guided = guideSegments.has(seg.id)
          return (
            <g key={seg.id}>
              {guided && (
                <polyline
                  points={seg.path.map((p) => `${p.x},${p.y}`).join(" ")}
                  fill="none"
                  stroke="#34d399"
                  strokeWidth="22"
                  strokeLinecap="round"
                  opacity="0.28"
                  className="guide-target-pulse animate-pulse"
                />
              )}
              <polyline
                points={seg.path.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke={color}
                strokeWidth={st === "occupied" ? 10 : 8}
                strokeLinecap="round"
              />
              {/* 轨枕装饰 */}
              <text
                x={seg.labelPos.x}
                y={seg.labelPos.y}
                textAnchor="middle"
                className="font-mono"
                fontSize="13"
                fill={st === "free" ? "#cbd5e1" : color}
              >
                {seg.label}
              </text>
            </g>
          )
        })}

        {/* 室外辅助设备与边界标识 */}
        {OUTDOOR_EQUIPMENT.map((eq) => (
          <OutdoorEquipment key={eq.id} eq={eq} />
        ))}

        {/* 股道终端可点击区域 */}
        {(state.selectedSignal || guideTargets.size > 0) &&
          TRACK_TARGETS.map((t) => (
            <rect
              key={t.id}
              x={t.rect.x}
              y={t.rect.y}
              width={t.rect.w}
              height={t.rect.h}
              rx="4"
              fill={guideTargets.has(t.id) ? "rgba(52,211,153,0.16)" : "rgba(56,189,248,0.12)"}
              stroke={guideTargets.has(t.id) ? "rgba(52,211,153,0.85)" : "rgba(56,189,248,0.6)"}
              strokeDasharray="4 3"
              className={guideTargets.has(t.id) ? "guide-target-pulse cursor-pointer animate-pulse" : "cursor-pointer"}
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
          const guided = guideSwitches.has(sw.id)
          return (
            <g
              key={sw.id}
              className="cursor-pointer"
              onClick={() => dispatch({ type: "CLICK_SWITCH", id: sw.id })}
            >
              {/* 尖轨方向 */}
              {guided && (
                <g className="guide-click-ring animate-pulse">
                  <circle cx={sw.pivot.x} cy={sw.pivot.y} r="28" fill="rgba(52,211,153,0.2)" stroke="#34d399" strokeWidth="3" />
                  <circle cx={sw.pivot.x} cy={sw.pivot.y} r="36" fill="none" stroke="#a7f3d0" strokeWidth="1.5" strokeDasharray="5 5" />
                </g>
              )}
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
                fontSize="13"
                className="font-mono"
                fill="#f8fafc"
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
            wireBroken={state.signalWireBroken[sig.id]}
            guided={guideSignals.has(sig.id)}
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
  wireBroken,
  guided,
  selected,
  onClick,
}: {
  sig: SignalDef
  aspect: Aspect
  wireBroken: boolean
  guided: boolean
  selected: boolean
  onClick: () => void
}) {
  const lamps = wireBroken ? [SIGNAL_COLORS.off] : aspectLamps(aspect)
  const dir = sig.facing === "right" ? 1 : -1
  const small = sig.kind === "shunt"
  const r = small ? 5 : 6
  const headStart = sig.pos.x + dir * 14
  return (
    <g className="cursor-pointer" onClick={onClick}>
      {guided && (
        <g className="guide-click-ring animate-pulse">
          <circle cx={sig.pos.x} cy={sig.pos.y} r="28" fill="rgba(52,211,153,0.2)" stroke="#34d399" strokeWidth="3" />
          <circle cx={sig.pos.x} cy={sig.pos.y} r="36" fill="none" stroke="#a7f3d0" strokeWidth="1.5" strokeDasharray="5 5" />
        </g>
      )}
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
              {!wireBroken && ((aspect === "red-white" && i === 0) || aspect === "white") ? (
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
      {wireBroken && (
        <g>
          <line x1={sig.pos.x - 14} y1={sig.pos.y - 14} x2={sig.pos.x + 14} y2={sig.pos.y + 14} stroke="#ff3b30" strokeWidth="3" />
          <line x1={sig.pos.x + 14} y1={sig.pos.y - 14} x2={sig.pos.x - 14} y2={sig.pos.y + 14} stroke="#ff3b30" strokeWidth="3" />
          <text x={sig.pos.x} y={sig.pos.y + 32} textAnchor="middle" fontSize="10" fill="#ff8a80">
            断丝
          </text>
        </g>
      )}
    </g>
  )
}

function OutdoorEquipment({
  eq,
}: {
  eq: {
    id: string
    label: string
    kind: "boundary" | "safety-line" | "derailer" | "marker" | "wire-broken"
    pos: { x: number; y: number }
    path?: { x: number; y: number }[]
  }
}) {
  if (eq.kind === "safety-line" && eq.path) {
    const start = eq.path[0]
    return (
      <g>
        <polyline
          points={eq.path.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke="#b28b4c"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <line x1={start.x} y1={start.y - 16} x2={start.x} y2={start.y + 16} stroke="#b28b4c" strokeWidth="5" />
        <line x1={start.x + 18} y1={start.y - 13} x2={start.x + 18} y2={start.y + 13} stroke="#b28b4c" strokeWidth="4" />
        <text x={eq.pos.x} y={eq.pos.y - 12} textAnchor="middle" fontSize="13" fill="#f8fafc">
          {eq.label}
        </text>
      </g>
    )
  }

  if (eq.kind === "derailer") {
    return (
      <g>
        <circle cx={eq.pos.x} cy={eq.pos.y - 12} r="9" fill="#0b1220" stroke="#e2e8f0" strokeWidth="3" />
        <text x={eq.pos.x} y={eq.pos.y + 10} textAnchor="middle" fontSize="12" fill="#f8fafc">
          {eq.label}
        </text>
      </g>
    )
  }

  if (eq.kind === "wire-broken") {
    return (
      <g opacity="0.85">
        <line x1={eq.pos.x - 16} y1={eq.pos.y + 12} x2={eq.pos.x + 18} y2={eq.pos.y - 18} stroke="#94a3b8" strokeWidth="2" />
        <line x1={eq.pos.x - 6} y1={eq.pos.y - 4} x2={eq.pos.x + 4} y2={eq.pos.y + 4} stroke="#ff3b30" strokeWidth="3" />
        <text x={eq.pos.x + 34} y={eq.pos.y - 8} textAnchor="middle" fontSize="11" fill="#cbd5e1">
          {eq.label}仿真
        </text>
      </g>
    )
  }

  return (
    <g>
      <rect x={eq.pos.x - 12} y={eq.pos.y - 12} width="24" height="24" rx="2" fill="#0b1220" stroke="#cbd5e1" strokeWidth="3" />
      <text x={eq.pos.x} y={eq.pos.y + 30} textAnchor="middle" fontSize="12" fill="#f8fafc">
        {eq.label}
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
