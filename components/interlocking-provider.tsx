"use client"

import { createContext, useContext, useEffect, useReducer, useRef, type ReactNode } from "react"
import {
  SIGNALS,
  SWITCHES,
  SEGMENTS,
  ROUTES,
  findRoute,
  isApproachLocked,
  APPROACH_SECTIONS,
  pointAt,
  toDisplayText,
  type Aspect,
  type RouteDef,
} from "@/lib/interlocking-data"
import { VALIDATION_GUIDE_STEPS } from "@/lib/validation-guide"

export type OpMode =
  | "route"
  | "single-op"
  | "single-lock"
  | "single-unlock"
  | "block"
  | "unblock"
  | "signal-break"
  | "signal-repair"
  | "total-cancel"
  | "manual-unlock"

export type SegState = "free" | "locked" | "occupied"

export interface ActiveRoute {
  id: string
  from: string
  name: string
  kind: "train" | "shunt"
  segments: string[]
  switches: string[]
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
  signalWireBroken: Record<string, boolean>
  segs: Record<string, SegState>
  selectedSignal: string | null
  selectedSwitch: string | null
  activeRoutes: ActiveRoute[]
  opMode: OpMode
  messages: LogMsg[]
  countdown: { routeId: string; remain: number } | null
  train: { routeId: string; t: number; running: boolean } | null
  paused: boolean
  trainOccupiedSegmentIdx: number | null
  /** 总人解/总取消 触发紧急停车后锁定，直到新进路建立信号开放才解除 */
  manualStopped: boolean
  validationGuide: { active: boolean; step: number; passed: Record<number, boolean> }
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
  | { type: "GUIDE_START" }
  | { type: "ADVANCE_TRAIN_OCCUPATION" }
  | { type: "GUIDE_PREPARE" }
  | { type: "GUIDE_NEXT" }
  | { type: "GUIDE_PREV" }
  | { type: "GUIDE_STOP" }
  | { type: "GUIDE_CHECK" }
  | { type: "LOG"; text: string; level: LogMsg["level"] }
  | { type: "TOGGLE_SEGMENT_OCCUPATION"; id: string }
  | { type: "RECALC_APPROACH" }
  | { type: "TOGGLE_PAUSE" }

function initState(): State {
  const aspects: Record<string, Aspect> = {}
  const signalWireBroken: Record<string, boolean> = {}
  SIGNALS.forEach((s) => (aspects[s.id] = s.defaultAspect))
  SIGNALS.forEach((s) => (signalWireBroken[s.id] = false))
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
    signalWireBroken,
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
    paused: false,
    trainOccupiedSegmentIdx: null,
    manualStopped: false,
    validationGuide: { active: false, step: 0, passed: {} },
    movingSwitch: null,
    msgSeq: 1,
  }
}

function now() {
  const d = new Date()
  return d.toLocaleTimeString("zh-CN", { hour12: false })
}

function log(state: State, text: string, level: LogMsg["level"]): State {
  const msg: LogMsg = { id: state.msgSeq, time: now(), text: toDisplayText(text), level }
  return { ...state, messages: [msg, ...state.messages].slice(0, 60), msgSeq: state.msgSeq + 1 }
}

function tryBuildRoute(state: State, route: RouteDef): State {
  if (state.signalWireBroken[route.from]) {
    return log(state, `建立失败：始端信号机 ${route.from} 发生断丝，禁止开放信号。`, "error")
  }
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
    switches: route.switches.map((sw) => sw.id),
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
  // 动态路径重绑定：检测是否有因紧急制动 / 总人解而停止的列车位于新进路范围内
  if (state.train && (!state.train.running || state.manualStopped)) {
    const existingRouteDef = ROUTES.find((r) => r.id === state.train!.routeId)
    const trainX = existingRouteDef ? pointAt(existingRouteDef.trainPath, state.train.t).p.x : -1
    // 检查列车是否在新进路的接近区段或首区段范围内
    const approachSeg = APPROACH_SECTIONS[route.from]
    const footprintIds = approachSeg ? [approachSeg, ...route.segments] : route.segments
    const inFootprint = footprintIds.some((id) => {
      const range = getSegmentXRange(id)
      return range && trainX >= range.min && trainX <= range.max
    })
    if (inFootprint) {
      // 将列车重新绑定到新进路，重置进度，清除总人解锁定
      next = {
        ...next,
        train: { routeId: route.id, t: 0, running: false },
        paused: true,
        manualStopped: false,
        trainOccupiedSegmentIdx: -1,
      }
      next = log(next, `列车识别到新路径（${route.name}），已重新绑定，信号开放，等待发车。`, "ok")
    }
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

function sameSegState(a: Record<string, SegState>, b: Record<string, SegState>) {
  return Object.keys(b).every((id) => a[id] === b[id])
}

function isApproachLockReady(state: State, route: ActiveRoute) {
  // 接近锁闭触发点：列车已占压第一个接近段，但尚未进入更内侧区段
  return state.train?.routeId === route.id && state.trainOccupiedSegmentIdx === 0
}

function hasRecentMessage(state: State, text: string) {
  return state.messages.some((m) => m.text.includes(text))
}

function evaluateGuideStep(state: State) {
  if (!state.validationGuide.active) return false
  const guide = VALIDATION_GUIDE_STEPS[state.validationGuide.step]
  if (!guide) return false

  switch (guide.successKind) {
    case "station-visible":
      return true
    case "train-route-built":
      return state.activeRoutes.some((r) => r.kind === "train" && r.from === "X")
    case "shunt-route-built":
      return state.activeRoutes.some((r) => r.kind === "shunt")
    case "switch-moved":
      return state.movingSwitch === "W5" || state.switchPos.W5 !== "normal"
    case "dynamic-display":
      return !!state.train || Object.values(state.segs).some((s) => s === "occupied")
    case "manual-release-countdown":
      return !!state.countdown
    case "train-process":
      return state.activeRoutes.some((r) => r.kind === "train") || hasRecentMessage(state, "列车已通过")
    case "shunt-process":
      return state.activeRoutes.some((r) => r.kind === "shunt") || (!!state.train && state.activeRoutes.some((r) => r.kind === "shunt"))
    case "cancel-or-manual-release":
      return hasRecentMessage(state, "已总取消") || !!state.countdown
    case "switch-protection":
      return Object.values(state.switchLocked).some(Boolean) || Object.values(state.switchBlocked).some(Boolean) || hasRecentMessage(state, "建立失败")
    case "route-unlocked":
      return hasRecentMessage(state, "进路已解锁") || hasRecentMessage(state, "列车已通过")
    case "signal-wire":
      return Object.values(state.signalWireBroken).some(Boolean) || hasRecentMessage(state, "断丝故障")
    case "switch-simulation":
      return !!state.movingSwitch || Object.values(state.switchPos).some((p) => p !== "normal")
    case "track-occupancy":
      return Object.values(state.segs).some((s) => s === "occupied") || hasRecentMessage(state, "区段逐段出清")
  }
}

/** 获取完整的列车物理占压序列：接近区段 + 中间过渡区段 + 进路区段 */
function getFullOccupationSequence(route: ActiveRoute): string[] {
  const approachSeg = APPROACH_SECTIONS[route.from]
  if (!approachSeg) return route.segments

  const result = [approachSeg]

  // 检测接近区段与首个进路区段之间是否存在物理间隙（如 IIAG_1 与 1AG 之间的 IIAG_2）
  if (route.segments.length > 0) {
    const approachRange = getSegmentXRange(approachSeg)
    const firstSegRange = getSegmentXRange(route.segments[0])
    if (approachRange && firstSegRange) {
      const isRightFacing = approachRange.max <= firstSegRange.min
      const gapStart = isRightFacing ? approachRange.max : firstSegRange.max
      const gapEnd = isRightFacing ? firstSegRange.min : approachRange.min

      if (gapStart < gapEnd) {
        // 存在间隙 → 查找位于间隙中的物理区段
        for (const seg of SEGMENTS) {
          if (seg.id === approachSeg || route.segments.includes(seg.id)) continue
          const r = getSegmentXRange(seg.id)
          if (r && r.min >= gapStart && r.max <= gapEnd) {
            result.push(seg.id)
          }
        }
      }
    }
  }

  result.push(...route.segments)
  return result
}

/** 根据区段 ID 获取其 x 坐标范围（用于列车位置→区段映射） */
const _segXRanges = new Map<string, { min: number; max: number }>()
for (const seg of SEGMENTS) {
  const xs = seg.path.map((p) => p.x)
  _segXRanges.set(seg.id, { min: Math.min(...xs), max: Math.max(...xs) })
}
function getSegmentXRange(segId: string): { min: number; max: number } | undefined {
  return _segXRanges.get(segId)
}

/** 信号突变红灯 → 紧急制动：暂停该进路上的运行列车 */
function emergencyBrake(state: State, routeId: string): State {
  if (state.train?.routeId === routeId && state.train.running) {
    return {
      ...state,
      paused: true,
      train: { ...state.train, running: false },
    }
  }
  return state
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
      // 总取消模式：点击信号机选择要取消的进路
      if (state.opMode === "total-cancel") {
        const cancelRoute = state.activeRoutes.find(
          (r) => r.from === action.id && !isApproachLocked(r.from, state.segs),
        )
        if (!cancelRoute) {
          return log(
            { ...state, opMode: "route" },
            `信号机 ${action.id} 没有可总取消的进路（进路不存在或已接近锁闭，请使用『总人解』）。已退出总取消模式。`,
            "warn",
          )
        }
        const segs = { ...state.segs }
        cancelRoute.segments.forEach((id) => (segs[id] = "free"))
        // 同时释放该进路的接近区段
        const approachSeg = APPROACH_SECTIONS[cancelRoute.from]
        if (approachSeg) segs[approachSeg] = "free"
        const aspects = { ...state.aspects }
        aspects[cancelRoute.from] = SIGNALS.find((s) => s.id === cancelRoute.from)?.defaultAspect ?? "red"
        const countdown = state.countdown && state.countdown.routeId === cancelRoute.id ? null : state.countdown
        // 紧急制动：若该进路上有列车正在运行，立即停车
        let next = emergencyBrake({ ...state, opMode: "route", segs, aspects, countdown }, cancelRoute.id)
        const trainWasOnRoute = state.train?.routeId === cancelRoute.id
        next = {
          ...next,
          activeRoutes: state.activeRoutes.filter((r) => r.id !== cancelRoute.id),
          manualStopped: trainWasOnRoute ? true : next.manualStopped,
          trainOccupiedSegmentIdx: trainWasOnRoute ? null : state.trainOccupiedSegmentIdx,
        }
        const brakeMsg = trainWasOnRoute && state.train?.running ? " 信号突变红灯，列车执行紧急停车。" : ""
        return log(next, `${cancelRoute.name} 已总取消，信号关闭，进路立即解锁。${brakeMsg}`, "ok")
      }
      // 总人解模式：点击信号机选择要人工解锁的进路
      if (state.opMode === "manual-unlock") {
        const unlockRoute = state.activeRoutes.find((r) => r.from === action.id)
        if (!unlockRoute) {
          return log(
            { ...state, opMode: "route" },
            `信号机 ${action.id} 没有已建立的进路。已退出总人解模式。`,
            "warn",
          )
        }
        // 使用纯函数 isApproachLocked 从 segs 实时计算接近锁闭状态
        if (!isApproachLocked(unlockRoute.from, state.segs)) {
          return log(
            { ...state, opMode: "route" },
            `${unlockRoute.name} 未接近锁闭（接近区段未被占用），请先 Ctrl+点击信号机左侧的接近区段将其点红，或使用『总取消』。已退出总人解模式。`,
            "warn",
          )
        }
        const occupiedSeg = unlockRoute.segments.find((id) => state.segs[id] === "occupied")
        if (occupiedSeg) {
          return log(
            { ...state, opMode: "route" },
            `${unlockRoute.name} 已有区段被占用（${occupiedSeg}），无法执行人工解锁。请等待列车通过或使用正常出清。已退出总人解模式。`,
            "error",
          )
        }
        const remain = unlockRoute.kind === "train" ? 180 : 30
        // 立即关闭信号（信号机变红/蓝），但光带维持锁闭（黄色），道岔保持锁闭
        const aspects = { ...state.aspects }
        const defaultAspect = SIGNALS.find((s) => s.id === unlockRoute.from)?.defaultAspect ?? "red"
        aspects[unlockRoute.from] = defaultAspect
        // 紧急制动：若该进路上有列车正在运行，立即停车
        const braked = emergencyBrake(
          { ...state, opMode: "route", aspects, countdown: { routeId: unlockRoute.id, remain } },
          unlockRoute.id,
        )
        const brakeMsg =
          state.train?.routeId === unlockRoute.id && state.train.running
            ? " 信号突变红灯，列车执行紧急停车。"
            : ""
        return log(
          braked,
          `${unlockRoute.name} 启动人工解锁，信号立即关闭（${defaultAspect === "red" ? "红灯" : defaultAspect === "blue" ? "蓝灯" : "红灯"}），延时 ${remain} 秒。倒计时期间光带维持锁闭（黄色），道岔不可操纵。${brakeMsg}`,
          "warn",
        )
      }
      if (state.opMode === "signal-break") {
        const aspects = { ...state.aspects }
        aspects[action.id] = SIGNALS.find((s) => s.id === action.id)?.defaultAspect ?? "red"
        return log(
          {
            ...state,
            aspects,
            signalWireBroken: { ...state.signalWireBroken, [action.id]: true },
            selectedSignal: null,
          },
          `信号机 ${action.id} 已设置断丝故障，灯位熄灭并禁止开放。`,
          "warn",
        )
      }
      if (state.opMode === "signal-repair") {
        return log(
          {
            ...state,
            signalWireBroken: { ...state.signalWireBroken, [action.id]: false },
            selectedSignal: null,
          },
          `信号机 ${action.id} 断丝故障已恢复。`,
          "ok",
        )
      }
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
          const inRoute = state.activeRoutes.some((r) => r.switches.includes(id))
          if (inRoute) return log(state, `道岔 ${labelOfSwitch(id)} 在锁闭进路内，禁止单操。`, "error")
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
      // 点击『总取消』后进入总取消模式，等待用户点击信号机选择要取消的进路
      if (state.activeRoutes.length === 0) return log(state, "当前无已建立的进路，无需总取消。", "warn")
      return log(
        { ...state, opMode: "total-cancel", selectedSignal: null, selectedSwitch: null },
        "已进入『总取消』模式，请点击信号机选择要取消的进路。",
        "info",
      )
    }

    case "TOTAL_MANUAL_RELEASE": {
      // 点击『总人解』后进入人工解锁模式，等待用户点击信号机选择要解锁的进路
      if (state.countdown) return log(state, "人工解锁倒计时进行中，请等待倒计时结束。", "info")
      return log(
        { ...state, opMode: "manual-unlock", selectedSignal: null, selectedSwitch: null },
        "已进入『总人解』模式，请点击信号机选择要人工解锁的进路。",
        "info",
      )
    }

    case "COUNTDOWN_TICK": {
      if (!state.countdown) return state
      // 故障-安全：检测进路内部区段是否被占用（列车可能意外进入）
      const monitoredRoute = state.activeRoutes.find((r) => r.id === state.countdown!.routeId)
      if (monitoredRoute) {
        const intruded = monitoredRoute.segments.some((id) => state.segs[id] === "occupied")
        if (intruded) {
          // 列车已压入进路，强制终止人工解锁，转为正常走车解锁模式
          return log(
            { ...state, countdown: null },
            `检测到列车压入进路 ${monitoredRoute.name}，人工解锁流程强制终止，转为正常走车解锁模式。`,
            "warn",
          )
        }
      }
      const remain = state.countdown.remain - 1
      if (remain > 0) return { ...state, countdown: { ...state.countdown, remain } }
      // 倒计时结束，执行人工解锁
      const route = monitoredRoute
      if (!route) {
        // 目标进路已不存在，直接清除倒计时
        return log({ ...state, countdown: null }, `人工解锁已取消：目标进路不存在。`, "info")
      }
      const segs = { ...state.segs }
      // 释放进路区段 + 接近区段
      route.segments.forEach((id) => (segs[id] = "free"))
      const approachSeg = APPROACH_SECTIONS[route.from]
      if (approachSeg) segs[approachSeg] = "free"
      const aspects = { ...state.aspects }
      aspects[route.from] = SIGNALS.find((s) => s.id === route.from)?.defaultAspect ?? "red"
      // 若该进路上有列车，保持暂停状态（不清除），提示用户重新办理进路
      const trainOnRoute = state.train?.routeId === route.id
      const trainMsg = trainOnRoute ? " 列车紧急停车，请重新办理进路以继续行车。" : ""
      return log(
        {
          ...state,
          segs,
          aspects,
          countdown: null,
          train: trainOnRoute ? { ...state.train!, running: false } : state.train,
          paused: trainOnRoute ? true : state.paused,
          manualStopped: trainOnRoute ? true : state.manualStopped,
          trainOccupiedSegmentIdx: trainOnRoute ? null : state.trainOccupiedSegmentIdx,
          activeRoutes: state.activeRoutes.filter((r) => r.id !== route?.id),
        },
        `${route.name} 人工解锁完成，进路已解锁。${trainMsg}`,
        "ok",
      )
    }

    case "GUIDE_START":
      return log({ ...state, validationGuide: { active: true, step: 0, passed: {} } }, "已进入『验收引导模式』，请按提示逐项演示。", "info")

    case "GUIDE_PREPARE": {
      const currentStep = Math.min(state.validationGuide.step, VALIDATION_GUIDE_STEPS.length - 1)
      const guide = VALIDATION_GUIDE_STEPS[currentStep]
      const fresh = initState()
      const passed = { ...state.validationGuide.passed }
      delete passed[currentStep]
      return log(
        {
          ...fresh,
          messages: state.messages,
          msgSeq: state.msgSeq,
          validationGuide: { active: true, step: currentStep, passed },
          opMode: guide.prepareMode ?? "route",
        },
        `已为第 ${currentStep + 1} 项准备：${guide.title}。上一项状态已清理，避免验收项互相影响。`,
        "ok",
      )
    }

    case "GUIDE_NEXT": {
      const nextStep = Math.min(state.validationGuide.step + 1, VALIDATION_GUIDE_STEPS.length - 1)
      return log({ ...state, validationGuide: { ...state.validationGuide, active: true, step: nextStep } }, `验收引导：第 ${nextStep + 1} 项。`, "info")
    }

    case "GUIDE_PREV": {
      const prevStep = Math.max(state.validationGuide.step - 1, 0)
      return log({ ...state, validationGuide: { ...state.validationGuide, active: true, step: prevStep } }, `验收引导：返回第 ${prevStep + 1} 项。`, "info")
    }

    case "GUIDE_STOP":
      return log({ ...state, validationGuide: { active: false, step: 0, passed: {} } }, "已退出验收引导模式。", "info")

    case "GUIDE_CHECK": {
      if (!state.validationGuide.active || state.validationGuide.passed[state.validationGuide.step]) return state
      if (!evaluateGuideStep(state)) return state
      const step = state.validationGuide.step
      const guide = VALIDATION_GUIDE_STEPS[step]
      return log(
        { ...state, validationGuide: { ...state.validationGuide, passed: { ...state.validationGuide.passed, [step]: true } } },
        `演示成功：第 ${step + 1} 项『${guide.title}』已满足验收条件。`,
        "ok",
      )
    }

    case "RUN_TRAIN": {
      // 若已有运行中的列车则拒绝；若列车因进路释放而停止，允许替换
      if (state.train?.running) return log(state, "已有列车正在运行，请等待其出清。", "warn")
      const route = state.activeRoutes.find((r) => !r.approached) ?? state.activeRoutes[0]
      if (!route) return log(state, "请先建立一条进路再模拟列车。", "warn")
      // 列车从 JXG（x=28）出生，trainOccupiedSegmentIdx = -1 表示尚未进入任何区段
      const fullSeq = getFullOccupationSequence(route)
      let next: State = {
        ...state,
        train: { routeId: route.id, t: 0, running: true },
        activeRoutes: state.activeRoutes.map((r) => (r.id === route.id ? { ...r, approached: true } : r)),
        paused: false,
        trainOccupiedSegmentIdx: -1,
      }
      // 如果该进路正在进行人工解锁倒计时，应当立刻取消人工解锁（失效），由正常出清逻辑接管
      if (state.countdown && state.countdown.routeId === route.id) {
        next = { ...next, countdown: null }
        return log(next, `模拟列车从 JXG 出发，驶入 ${route.name}。人工解锁倒计时已失效，转为正常出清。`, "info")
      }
      return log(
        next,
        fullSeq[0]
          ? `模拟列车从 JXG 出发，即将进入接近区段 ${fullSeq[0]}，驶向 ${route.name}。`
          : `模拟列车进入 ${route.name}，列车已接近。`,
        "info",
      )
    }

    case "TRAIN_TICK": {
      if (!state.train) return state
      const route = state.activeRoutes.find((r) => r.id === state.train!.routeId)
      if (!route) return { ...state, train: null }
      const t = action.t
      const routeDef = ROUTES.find((r) => r.id === route.id)
      const fullSeq = getFullOccupationSequence(route)
      const approachSegIds = new Set(Object.values(APPROACH_SECTIONS))

      if (t >= 1) {
        // 列车出清：释放所有区段（接近区段 + 进路区段）
        const segs = { ...state.segs }
        fullSeq.forEach((id) => (segs[id] = "free"))
        const aspects = { ...state.aspects }
        aspects[route.from] = SIGNALS.find((s) => s.id === route.from)?.defaultAspect ?? "red"
        const countdown = state.countdown && state.countdown.routeId === route.id ? null : state.countdown
        return log(
          {
            ...state,
            segs,
            aspects,
            train: null,
            countdown,
            paused: false,
            trainOccupiedSegmentIdx: null,
            activeRoutes: state.activeRoutes.filter((r) => r.id !== route.id),
          },
          `列车已通过 ${route.name}，区段逐段出清，进路已解锁。`,
          "ok",
        )
      }

      // === 基于列车实际坐标的自动红光带 ===
      // 从 trainPath 和进度 t 计算列车当前 x 坐标
      const trainX = routeDef ? pointAt(routeDef.trainPath, t).p.x : 0
      // 入口阈值法：只要列车 x 越过了某区段的 entryX，就认为进入了该区段
      // 相比区间包含检查 (x ∈ [min,max])，此方法能正确处理区段之间的间隙
      let dynamicIdx = -1
      for (let i = 0; i < fullSeq.length; i++) {
        const range = getSegmentXRange(fullSeq[i])
        if (range && trainX >= range.min) {
          dynamicIdx = i // 列车已越过该区段的入口
        }
      }
      // 安全兜底：若列车 x 为 0（routeDef 未找到等异常），不进行占压
      if (trainX <= 0) dynamicIdx = -1
      // 只前进不后退
      const prevIdx = state.trainOccupiedSegmentIdx ?? -1
      const occupiedIdx = Math.max(prevIdx, dynamicIdx)

      // 根据 occupiedIdx 更新所有区段状态
      const segs = { ...state.segs }
      fullSeq.forEach((id, i) => {
        if (i < occupiedIdx) {
          segs[id] = "free" // 已通过
        } else if (i === occupiedIdx) {
          segs[id] = "occupied" // 当前占压（红色）
        } else {
          // 尚未到达：进路内的区段保持锁闭（黄色），进路外的区段（接近/过渡）保持空闲
          // 不能用 approachSegIds 判断，因为某区段可能同时是进路区段（如 IIAG_2 既是 D1 接近段又是 X 进路段）
          segs[id] = route.segments.includes(id) ? "locked" : "free"
        }
      })

      // 当列车进入新区段时记录日志
      const segsChanged = !sameSegState(state.segs, segs)
      const idxAdvanced = occupiedIdx > (state.trainOccupiedSegmentIdx ?? -1)
      const nextState: State = {
        ...state,
        train: { ...state.train, t },
        segs: segsChanged ? segs : state.segs,
        trainOccupiedSegmentIdx: occupiedIdx,
      }
      if (idxAdvanced && occupiedIdx >= 0 && occupiedIdx < fullSeq.length) {
        const enteredSeg = fullSeq[occupiedIdx]
        const isApproach = approachSegIds.has(enteredSeg)
        return log(
          nextState,
          isApproach
            ? `列车进入接近区段 ${enteredSeg}，区段变红。进路即将标记为接近锁闭。`
            : `列车进入进路区段 ${enteredSeg}，区段变红。`,
          "info",
        )
      }
      return nextState
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
      return { ...state, messages: [], opMode: "route", selectedSignal: null, selectedSwitch: null }

    case "LOG":
      return log(state, action.text, action.level)

    // 基于当前 segs 重新计算所有活动进路的接近锁闭标记
    case "RECALC_APPROACH": {
      const activeRoutes = state.activeRoutes.map((r) => ({
        ...r,
        approached: r.approached || isApproachLocked(r.from, state.segs),
      }))
      if (activeRoutes.every((r, i) => r.approached === state.activeRoutes[i].approached)) {
        return state // 无变化，避免不必要的重渲染
      }
      return { ...state, activeRoutes }
    }

    case "TOGGLE_SEGMENT_OCCUPATION": {
      const segId = action.id
      const current = state.segs[segId]
      // 切换占用状态
      const segs = {
        ...state.segs,
        [segId]: (current === "occupied" ? "free" : "occupied") as SegState,
      }
      // 基于最新 segs 重新计算所有活动进路的 approached 标记
      // 不再使用硬编码映射，而是调用 isApproachLocked 纯函数推导
      const activeRoutes = state.activeRoutes.map((r) => ({
        ...r,
        approached: r.approached || isApproachLocked(r.from, segs),
      }))
      // 判断当前区段是否为某个信号机的接近区段（从 APPROACH_SECTIONS 映射推导）
      const approachSegIds = new Set(Object.values(APPROACH_SECTIONS))
      const isApproachSeg = approachSegIds.has(segId)
      const isOccupying = current !== "occupied"
      return log(
        { ...state, segs, activeRoutes },
        isOccupying
          ? isApproachSeg
            ? `接近锁闭：接近区段 ${segId} 已占用（红色）。进站信号机对应进路已自动标记为『接近锁闭』，可使用总人解测试倒计时。`
            : `区段占用：区段 ${segId} 已设为占用（红色）。`
          : isApproachSeg
            ? `手动占用解除：接近区段 ${segId} 已恢复为空闲，对应进路接近锁闭已清除。`
            : `手动占用解除：区段 ${segId} 已恢复为空闲。`,
        isOccupying ? "warn" : "info",
      )
    }

    case "TOGGLE_PAUSE": {
      if (!state.train) return state
      // 人工解锁倒计时期间不允许恢复列车运行（故障-安全原则）
      if (state.countdown && state.paused) {
        return log(state, "人工解锁倒计时进行中，列车已紧急制动，禁止恢复运行。请等待倒计时结束或进路自动释放。", "warn")
      }
      const pausing = !state.paused

      // ──── 恢复运行 ────
      if (!pausing) {
        // ① 总人解 / 总取消 锁定：必须办理新进路才能解锁
        if (state.manualStopped) {
          return log(
            state,
            "警告：前方无授权进路，严禁动车！请先办理进路。",
            "error",
          )
        }

        // ② 列车绑定的进路是否仍然有效（信号仍在开放 / 光带仍锁闭）
        const boundRoute = state.activeRoutes.find((r) => r.id === state.train!.routeId)
        if (boundRoute) {
          return log(
            { ...state, paused: false, train: { ...state.train, running: true } },
            "模拟列车继续运行",
            "info",
          )
        }

        // ③ 绑定进路已释放 — 搜索是否有新进路覆盖列车当前位置
        const trainRouteDef = ROUTES.find((r) => r.id === state.train!.routeId)
        const trainX = trainRouteDef
          ? pointAt(trainRouteDef.trainPath, state.train!.t).p.x
          : -1

        if (trainX > 0) {
          const coveringRoute = state.activeRoutes.find((r) =>
            r.segments.some((segId) => {
              const range = getSegmentXRange(segId)
              return range && trainX >= range.min && trainX <= range.max
            }),
          )
          if (coveringRoute) {
            // 列车绑定到新进路并从起始位置重新出发
            return log(
              {
                ...state,
                paused: false,
                manualStopped: false,
                train: { routeId: coveringRoute.id, t: 0, running: true },
                trainOccupiedSegmentIdx: -1,
              },
              `列车识别到前方进路（${coveringRoute.name}），已重新绑定并继续运行。`,
              "ok",
            )
          }
        }

        // ④ 前方无任何进路 — 禁止动车
        return log(
          state,
          "警告：前方无授权进路，严禁动车！请先办理进路。",
          "error",
        )
      }

      // ──── 暂停 ────
      return log(
        { ...state, paused: true, train: { ...state.train, running: false } },
        `模拟列车已暂停（进度 ${Math.round((state.train?.t ?? 0) * 100)}%）`,
        "info",
      )
    }

    case "ADVANCE_TRAIN_OCCUPATION": {
      // 粗粒度安全网：确保 trainOccupiedSegmentIdx 不会永远卡在 -1
      // 实际红光带由 TRAIN_TICK 根据列车实时坐标驱动
      if (!state.train || state.paused) return state
      const route = state.activeRoutes.find((r) => r.id === state.train!.routeId)
      if (!route) return state
      const fullSeq = getFullOccupationSequence(route)
      const currentIdx = state.trainOccupiedSegmentIdx ?? -1
      // TRAIN_TICK 已根据坐标推进了 idx，无需额外操作
      // 仅作为兜底：若 idx 未变化且列车即将出清，强制推进
      if (currentIdx >= fullSeq.length) return state
      return state
    }

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
      "signal-break": "信号断丝",
      "signal-repair": "恢复信号",
      "total-cancel": "总取消",
      "manual-unlock": "总人解",
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
  const paused = state.paused

  useEffect(() => {
    // If not running or paused, ensure animation is stopped and preserve tRef
    if (!running || paused) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      lastRef.current = null
      return
    }
    // Resume or start animation from current progress
    tRef.current = state.train?.t ?? 0
    const DURATION = 6500 // ms to traverse full route
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
  }, [running, routeId, paused])

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

  // 接近锁闭实时重算：每当 segs 变化时重新评估所有活动进路的接近状态
  const segsRef = useRef(state.segs)
  useEffect(() => {
    const prev = segsRef.current
    const changed = Object.keys(state.segs).some((id) => prev[id] !== state.segs[id])
    segsRef.current = state.segs
    if (changed && state.activeRoutes.length > 0) {
      dispatch({ type: "RECALC_APPROACH" })
    }
  }, [state.segs, state.activeRoutes.length])

  // 逐段占压定时器（每 2 秒推进到下一个区段）
  useEffect(() => {
    if (!running || paused) return
    const timer = setInterval(() => dispatch({ type: "ADVANCE_TRAIN_OCCUPATION" }), 2000)
    return () => clearInterval(timer)
  }, [running, paused])

  useEffect(() => {
    if (!state.validationGuide.active || state.validationGuide.passed[state.validationGuide.step]) return
    dispatch({ type: "GUIDE_CHECK" })
  }, [state])

  return <InterlockingContext.Provider value={{ state, dispatch }}>{children}</InterlockingContext.Provider>
}

export function useInterlocking() {
  const ctx = useContext(InterlockingContext)
  if (!ctx) throw new Error("useInterlocking must be used within InterlockingProvider")
  return ctx
}
