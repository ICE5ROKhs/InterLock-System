"use client"

import { createContext, useContext, useEffect, useReducer, useRef, type ReactNode } from "react"
import {
  SIGNALS,
  SWITCHES,
  SEGMENTS,
  findRoute,
  type Aspect,
  type RouteDef,
} from "@/lib/interlocking-data"

export type OpMode = "route" | "single-op" | "single-lock" | "single-unlock" | "block" | "unblock"

export type SegState = "free" | "locked" | "occupied"

export interface ActiveRoute {
  id: string
  from: string
  name: string
  kind: "train" | "shunt"
  segments: string[]
  approached: boolean
}

export interface LogMsg {
  id: number
  time: string
  text: string
  level: "info" | "ok" | "warn" | "error"
}

interface State {
  aspects: Record<string, Aspect>
  switchPos: Record<string, "normal" | "reverse">
  switchLocked: Record<string, boolean>
  switchBlocked: Record<string, boolean>
  segs: Record<string, SegState>
  selectedSignal: string | null
  selectedSwitch: string | null
  activeRoutes: ActiveRoute[]
  opMode: OpMode
  messages: LogMsg[]
  countdown: { routeId: string; remain: number } | null
  train: { routeId: string; t: number; running: boolean } | null
  movingSwitch: string | null
  msgSeq: number
}

type Action =
  | { type: "CLICK_SIGNAL"; id: string }
  | { type: "CLICK_TARGET"; id: string }
  | { type: "CLICK_SWITCH"; id: string }
  | { type: "SET_MODE"; mode: OpMode }
  | { type: "TOTAL_CANCEL" }
  | { type: "TOTAL_MANUAL_RELEASE" }
  | { type: "POWER_RESET" }
  | { type: "ALL_NORMAL" }
  | { type: "ALL_REVERSE" }
  | { type: "CLEAR_MSG" }
  | { type: "RUN_TRAIN" }
  | { type: "TRAIN_TICK"; t: number }
  | { type: "SWITCH_SETTLE"; id: string; pos: "normal" | "reverse" }
  | { type: "COUNTDOWN_TICK" }
  | { type: "LOG"; text: string; level: LogMsg["level"] }

function initState(): State {
  const aspects: Record<string, Aspect> = {}
  SIGNALS.forEach((s) => (aspects[s.id] = s.defaultAspect))
  const switchPos: Record<string, "normal" | "reverse"> = {}
  const switchLocked: Record<string, boolean> = {}
  const switchBlocked: Record<string, boolean> = {}
  SWITCHES.forEach((s) => {
    switchPos[s.id] = "normal"
    switchLocked[s.id] = false
    switchBlocked[s.id] = false
  })
  const segs: Record<string, SegState> = {}
  SEGMENTS.forEach((s) => (segs[s.id] = "free"))
  return {
    aspects,
    switchPos,
    switchLocked,
    switchBlocked,
    segs,
    selectedSignal: null,
    selectedSwitch: null,
    activeRoutes: [],
    opMode: "route",
    messages: [
      {
        id: 0,
        time: "--:--:--",
        text: "系统已启动，请执行『上电解锁』初始化设备。",
        level: "info",
      },
    ],
    countdown: null,
    train: null,
    movingSwitch: null,
    msgSeq: 1,
  }
}

function now() {
  const d = new Date()
  return d.toLocaleTimeString("zh-CN", { hour12: false })
}

function log(state: State, text: string, level: LogMsg["level"]): State {
  const msg: LogMsg = { id: state.msgSeq, time: now(), text, level }
  return { ...state, messages: [msg, ...state.messages].slice(0, 60), msgSeq: state.msgSeq + 1 }
}

function tryBuildRoute(state: State, route: RouteDef): State {
  // 区段空闲检查
  const occupied = route.segments.find((id) => state.segs[id] !== "free")
  if (occupied) {
    return log(state, `建立失败：区段 ${occupied} 被占用/锁闭，存在进路冲突。`, "error")
  }
  // 道岔检查
  for (const sw of route.switches) {
    if (state.switchBlocked[sw.id]) {
      return log(state, `建立失败：道岔 ${labelOfSwitch(sw.id)} 已封锁，无法扳动。`, "error")
    }
    if (state.switchLocked[sw.id] && state.switchPos[sw.id] !== sw.pos) {
      return log(state, `建立失败：道岔 ${labelOfSwitch(sw.id)} 已单锁，位置不符。`, "error")
    }
  }
  // 锁闭区段、扳动道岔、开放信号
  const segs = { ...state.segs }
  route.segments.forEach((id) => (segs[id] = "locked"))
  const switchPos = { ...state.switchPos }
  route.switches.forEach((sw) => (switchPos[sw.id] = sw.pos))
  const aspects = { ...state.aspects }
  aspects[route.from] = route.aspect

  const ar: ActiveRoute = {
    id: route.id,
    from: route.from,
    name: route.name,
    kind: route.kind,
    segments: route.segments,
    approached: false,
  }
  let next: State = {
    ...state,
    segs,
    switchPos,
    aspects,
    activeRoutes: [...state.activeRoutes.filter((r) => r.id !== route.id), ar],
    selectedSignal: null,
  }
  const aspectName = aspectLabel(route.aspect)
  next = log(next, `${route.name} 已建立，进路锁闭，信号开放（${aspectName}）。`, "ok")
  return next
}

function labelOfSwitch(id: string) {
  return SWITCHES.find((s) => s.id === id)?.label ?? id
}

function aspectLabel(a: Aspect) {
  return (
    {
      red: "红灯",
      green: "绿灯",
      yellow: "黄灯",
      "double-yellow": "双黄灯",
      "red-white": "红白引导",
      white: "月白灯",
      blue: "蓝灯",
    } as Record<Aspect, string>
  )[a]
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_MODE":
      return log(
        { ...state, opMode: action.mode, selectedSignal: null, selectedSwitch: null },
        action.mode === "route"
          ? "已切换至『进路操作』模式。"
          : `已进入『${modeLabel(action.mode)}』模式，请点击目标道岔。`,
        "info",
      )

    case "CLICK_SIGNAL": {
      if (state.opMode !== "route") return state
      if (state.selectedSignal === action.id) {
        return log({ ...state, selectedSignal: null }, "已取消始端选择。", "info")
      }
      if (!state.selectedSignal) {
        const sig = SIGNALS.find((s) => s.id === action.id)
        return log({ ...state, selectedSignal: action.id }, `已选择始端 ${sig?.label}，请点击终端信号机或股道。`, "info")
      }
      const route = findRoute(state.selectedSignal, action.id)
      if (!route) {
        return log({ ...state, selectedSignal: null }, "该始端与终端之间无可用进路。", "warn")
      }
      return tryBuildRoute(state, route)
    }

    case "CLICK_TARGET": {
      if (state.opMode !== "route" || !state.selectedSignal) return state
      const route = findRoute(state.selectedSignal, action.id)
      if (!route) {
        return log({ ...state, selectedSignal: null }, "该始端与所选股道之间无可用进路。", "warn")
      }
      return tryBuildRoute(state, route)
    }

    case "CLICK_SWITCH": {
      const id = action.id
      switch (state.opMode) {
        case "single-op": {
          if (state.switchBlocked[id]) return log(state, `道岔 ${labelOfSwitch(id)} 已封锁，单操无效。`, "error")
          if (state.switchLocked[id]) return log(state, `道岔 ${labelOfSwitch(id)} 已单锁，请先单解。`, "error")
          const inRoute = state.activeRoutes.some((r) =>
            findRoute(r.from, r.id.split("-")[1] ?? "")?.switches.some((s) => s.id === id),
          )
          const segLocked = Object.values(state.segs).some((v) => v !== "free")
          if (inRoute && segLocked) return log(state, `道岔 ${labelOfSwitch(id)} 在锁闭进路内，禁止单操。`, "error")
          const target = state.switchPos[id] === "normal" ? "reverse" : "normal"
          return log(
            { ...state, movingSwitch: id },
            `道岔 ${labelOfSwitch(id)} 单操中…（动作延时 0.5s → ${target === "normal" ? "定位" : "反位"}）`,
            "info",
          )
        }
        case "single-lock":
          return log({ ...state, switchLocked: { ...state.switchLocked, [id]: true } }, `道岔 ${labelOfSwitch(id)} 已单锁。`, "ok")
        case "single-unlock":
          return log({ ...state, switchLocked: { ...state.switchLocked, [id]: false } }, `道岔 ${labelOfSwitch(id)} 已单解。`, "ok")
        case "block":
          return log({ ...state, switchBlocked: { ...state.switchBlocked, [id]: true } }, `道岔 ${labelOfSwitch(id)} 已封锁。`, "warn")
        case "unblock":
          return log({ ...state, switchBlocked: { ...state.switchBlocked, [id]: false } }, `道岔 ${labelOfSwitch(id)} 已解封。`, "ok")
        default:
          return state
      }
    }

    case "SWITCH_SETTLE":
      return log(
        { ...state, switchPos: { ...state.switchPos, [action.id]: action.pos }, movingSwitch: null },
        `道岔 ${labelOfSwitch(action.id)} 已转至${action.pos === "normal" ? "定位" : "反位"}。`,
        "ok",
      )

    case "TOTAL_CANCEL": {
      const cancelable = state.activeRoutes.find((r) => !r.approached)
      if (state.activeRoutes.length === 0) return log(state, "当前无已建立的进路。", "warn")
      if (!cancelable) return log(state, "进路已接近锁闭，无法直接取消，请使用『总人解』。", "error")
      const segs = { ...state.segs }
      cancelable.segments.forEach((id) => (segs[id] = "free"))
      const aspects = { ...state.aspects }
      aspects[cancelable.from] = SIGNALS.find((s) => s.id === cancelable.from)?.defaultAspect ?? "red"
      return log(
        {
          ...state,
          segs,
          aspects,
          activeRoutes: state.activeRoutes.filter((r) => r.id !== cancelable.id),
        },
        `${cancelable.name} 已总取消，信号关闭，进路立即解锁。`,
        "ok",
      )
    }

    case "TOTAL_MANUAL_RELEASE": {
      const approached = state.activeRoutes.find((r) => r.approached)
      if (!approached) return log(state, "无已接近的进路，如需取消请用『总取消』。", "warn")
      if (state.countdown) return log(state, "人工解锁倒计时进行中…", "info")
      return log(
        { ...state, countdown: { routeId: approached.id, remain: 30 } },
        `${approached.name} 启动人工解锁，延时 30 秒…`,
        "warn",
      )
    }

    case "COUNTDOWN_TICK": {
      if (!state.countdown) return state
      const remain = state.countdown.remain - 1
      if (remain > 0) return { ...state, countdown: { ...state.countdown, remain } }
      // 解锁
      const route = state.activeRoutes.find((r) => r.id === state.countdown!.routeId)
      const segs = { ...state.segs }
      route?.segments.forEach((id) => (segs[id] = "free"))
      const aspects = { ...state.aspects }
      if (route) aspects[route.from] = SIGNALS.find((s) => s.id === route.from)?.defaultAspect ?? "red"
      return log(
        {
          ...state,
          segs,
          aspects,
          countdown: null,
          train: state.train?.routeId === route?.id ? null : state.train,
          activeRoutes: state.activeRoutes.filter((r) => r.id !== route?.id),
        },
        `${route?.name} 人工解锁完成，进路已解锁。`,
        "ok",
      )
    }

    case "RUN_TRAIN": {
      if (state.train) return log(state, "已有列车正在运行，请等待其出清。", "warn")
      const route = state.activeRoutes.find((r) => !r.approached) ?? state.activeRoutes[0]
      if (!route) return log(state, "请先建立一条进路再模拟列车。", "warn")
      return log(
        {
          ...state,
          train: { routeId: route.id, t: 0, running: true },
          activeRoutes: state.activeRoutes.map((r) => (r.id === route.id ? { ...r, approached: true } : r)),
        },
        `模拟列车进入 ${route.name}，列车已接近。`,
        "info",
      )
    }

    case "TRAIN_TICK": {
      if (!state.train) return state
      const route = state.activeRoutes.find((r) => r.id === state.train!.routeId)
      if (!route) return { ...state, train: null }
      const t = action.t
      if (t >= 1) {
        // 出清解锁
        const segs = { ...state.segs }
        route.segments.forEach((id) => (segs[id] = "free"))
        const aspects = { ...state.aspects }
        aspects[route.from] = SIGNALS.find((s) => s.id === route.from)?.defaultAspect ?? "red"
        return log(
          {
            ...state,
            segs,
            aspects,
            train: null,
            activeRoutes: state.activeRoutes.filter((r) => r.id !== route.id),
          },
          `列车已通过 ${route.name}，区段逐段出清，进路已解锁。`,
          "ok",
        )
      }
      // 逐段占用 / 出清
      const n = route.segments.length
      const idx = Math.min(Math.floor(t * n), n - 1)
      const segs = { ...state.segs }
      route.segments.forEach((id, i) => {
        if (i < idx) segs[id] = "free"
        else if (i === idx) segs[id] = "occupied"
        else segs[id] = "locked"
      })
      return { ...state, train: { ...state.train, t }, segs }
    }

    case "ALL_NORMAL": {
      const switchPos = { ...state.switchPos }
      SWITCHES.forEach((s) => {
        if (!state.switchBlocked[s.id] && !state.switchLocked[s.id]) switchPos[s.id] = "normal"
      })
      return log({ ...state, switchPos }, "所有未锁闭/封锁道岔已转至定位。", "ok")
    }
    case "ALL_REVERSE": {
      const switchPos = { ...state.switchPos }
      SWITCHES.forEach((s) => {
        if (!state.switchBlocked[s.id] && !state.switchLocked[s.id]) switchPos[s.id] = "reverse"
      })
      return log({ ...state, switchPos }, "所有未锁闭/封锁道岔已转至反位。", "warn")
    }

    case "POWER_RESET": {
      const fresh = initState()
      return log({ ...fresh, messages: state.messages, msgSeq: state.msgSeq }, "上电解锁完成，所有设备已恢复初始状态。", "ok")
    }

    case "CLEAR_MSG":
      return { ...state, messages: [] }

    case "LOG":
      return log(state, action.text, action.level)

    default:
      return state
  }
}

function modeLabel(m: OpMode) {
  return (
    {
      route: "进路操作",
      "single-op": "单操",
      "single-lock": "单锁",
      "single-unlock": "单解",
      block: "封锁",
      unblock: "解封",
    } as Record<OpMode, string>
  )[m]
}

interface Ctx {
  state: State
  dispatch: React.Dispatch<Action>
}

const InterlockingContext = createContext<Ctx | null>(null)

export function InterlockingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initState)

  // 列车动画循环
  const rafRef = useRef<number | null>(null)
  const lastRef = useRef<number | null>(null)
  const tRef = useRef(0)
  const running = state.train?.running
  const routeId = state.train?.routeId

  useEffect(() => {
    if (!running) {
      lastRef.current = null
      return
    }
    tRef.current = 0
    const DURATION = 6500 // ms 走完全程
    const step = (ts: number) => {
      if (lastRef.current == null) lastRef.current = ts
      const dt = ts - lastRef.current
      lastRef.current = ts
      tRef.current = Math.min(1, tRef.current + dt / DURATION)
      dispatch({ type: "TRAIN_TICK", t: tRef.current })
      if (tRef.current < 1) {
        rafRef.current = requestAnimationFrame(step)
      }
    }
    rafRef.current = requestAnimationFrame(step)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      lastRef.current = null
    }
  }, [running, routeId])

  // 道岔动作延时
  const movingSwitch = state.movingSwitch
  useEffect(() => {
    if (!movingSwitch) return
    const target = state.switchPos[movingSwitch] === "normal" ? "reverse" : "normal"
    const t = setTimeout(() => dispatch({ type: "SWITCH_SETTLE", id: movingSwitch, pos: target }), 500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movingSwitch])

  // 人工解锁倒计时
  const countdownActive = !!state.countdown
  useEffect(() => {
    if (!countdownActive) return
    const t = setInterval(() => dispatch({ type: "COUNTDOWN_TICK" }), 1000)
    return () => clearInterval(t)
  }, [countdownActive])

  return <InterlockingContext.Provider value={{ state, dispatch }}>{children}</InterlockingContext.Provider>
}

export function useInterlocking() {
  const ctx = useContext(InterlockingContext)
  if (!ctx) throw new Error("useInterlocking must be used within InterlockingProvider")
  return ctx
}
