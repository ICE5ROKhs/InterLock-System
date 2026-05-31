// ============================================================
// 计算机联锁模拟仿真系统 — 站场静态数据与进路表（纯前端模拟）
// 坐标系 viewBox: 0 0 1200 440
// ============================================================

export type Point = { x: number; y: number }

// 信号显示颜色（铁路信号标准配色，属于业务领域色）
export const SIGNAL_COLORS = {
  red: "#ff3b30", // 红灯：禁止
  green: "#34d96b", // 绿灯：通过 / 允许
  yellow: "#ffd60a", // 黄灯：侧线进站 / 注意
  doubleYellow: "#ffd60a", // 双黄
  redWhite: "#ff3b30", // 红白引导
  white: "#f5f7fa", // 月白：允许调车
  blue: "#2f86ff", // 蓝灯：禁止调车
  off: "#3a4252", // 熄灭
} as const

export type Aspect =
  | "red"
  | "green"
  | "yellow"
  | "double-yellow"
  | "red-white"
  | "white" // 月白
  | "blue"

export type SignalKind = "entry" | "exit" | "shunt" // 进站 / 出站 / 调车

export interface SignalDef {
  id: string
  label: string
  kind: SignalKind
  pos: Point
  // 信号机面朝方向：'right' 灯朝右(防护右行) | 'left'
  facing: "left" | "right"
  defaultAspect: Aspect
}

export interface SwitchDef {
  id: string
  label: string
  pivot: Point // 道岔中心
  // 定位（直向）末端 与 反位（侧向）末端，用于绘制尖轨方向
  normalEnd: Point
  reverseEnd: Point
}

export interface SegmentDef {
  id: string
  label: string
  // 折线，用于绘制轨道
  path: Point[]
  labelPos: Point
}

export interface RouteDef {
  id: string
  from: string // 始端信号机 id
  to: string // 终端 (信号机 id 或 股道 id)
  kind: "train" | "shunt"
  name: string
  segments: string[] // 锁闭/占用的区段（按列车经过顺序）
  switches: { id: string; pos: "normal" | "reverse" }[]
  aspect: Aspect // 始端信号开放后的显示
  // 列车动画折线（按经过顺序）
  trainPath: Point[]
}

// ----------------------- 轨道区段 -----------------------
export const SEGMENTS: SegmentDef[] = [
  {
    id: "1AG",
    label: "1AG",
    path: [
      { x: 60, y: 210 },
      { x: 300, y: 210 },
    ],
    labelPos: { x: 150, y: 196 },
  },
  {
    id: "2AG",
    label: "2AG",
    path: [
      { x: 900, y: 210 },
      { x: 1140, y: 210 },
    ],
    labelPos: { x: 1010, y: 196 },
  },
  {
    id: "IG",
    label: "IG ( I 道 )",
    path: [
      { x: 380, y: 130 },
      { x: 820, y: 130 },
    ],
    labelPos: { x: 600, y: 116 },
  },
  {
    id: "IIG",
    label: "IIG ( II 道 )",
    path: [
      { x: 380, y: 210 },
      { x: 820, y: 210 },
    ],
    labelPos: { x: 600, y: 196 },
  },
  {
    id: "IIIG",
    label: "IIIG ( III 道 )",
    path: [
      { x: 460, y: 290 },
      { x: 740, y: 290 },
    ],
    labelPos: { x: 600, y: 314 },
  },
]

// 道岔连接线（用于把咽喉区画通顺，非占用区段）
export const THROAT_LINKS: Point[][] = [
  // 左咽喉
  [
    { x: 300, y: 210 },
    { x: 380, y: 210 },
  ], // W1->W3 直向
  [
    { x: 300, y: 210 },
    { x: 380, y: 130 },
  ], // W1 反位 -> I道
  [
    { x: 380, y: 210 },
    { x: 460, y: 290 },
  ], // W3 反位 -> III道
  // 右咽喉
  [
    { x: 820, y: 210 },
    { x: 900, y: 210 },
  ], // W4->W2 直向
  [
    { x: 900, y: 210 },
    { x: 820, y: 130 },
  ], // W2 反位 -> I道
  [
    { x: 820, y: 210 },
    { x: 740, y: 290 },
  ], // W4 反位 -> III道
]

// ----------------------- 道岔 -----------------------
export const SWITCHES: SwitchDef[] = [
  {
    id: "W1",
    label: "1",
    pivot: { x: 300, y: 210 },
    normalEnd: { x: 348, y: 210 },
    reverseEnd: { x: 340, y: 186 },
  },
  {
    id: "W3",
    label: "3",
    pivot: { x: 380, y: 210 },
    normalEnd: { x: 428, y: 210 },
    reverseEnd: { x: 420, y: 234 },
  },
  {
    id: "W2",
    label: "2",
    pivot: { x: 900, y: 210 },
    normalEnd: { x: 852, y: 210 },
    reverseEnd: { x: 860, y: 186 },
  },
  {
    id: "W4",
    label: "4",
    pivot: { x: 820, y: 210 },
    normalEnd: { x: 772, y: 210 },
    reverseEnd: { x: 780, y: 234 },
  },
]

// ----------------------- 信号机 -----------------------
export const SIGNALS: SignalDef[] = [
  // 进站信号机
  { id: "X", label: "X", kind: "entry", pos: { x: 40, y: 234 }, facing: "right", defaultAspect: "red" },
  { id: "S", label: "S", kind: "entry", pos: { x: 1160, y: 186 }, facing: "left", defaultAspect: "red" },
  // 出站信号机（左端，下行发车 X 系）
  { id: "XI", label: "XⅠ", kind: "exit", pos: { x: 360, y: 106 }, facing: "left", defaultAspect: "red" },
  { id: "XII", label: "XⅡ", kind: "exit", pos: { x: 360, y: 234 }, facing: "left", defaultAspect: "red" },
  { id: "XIII", label: "XⅢ", kind: "exit", pos: { x: 440, y: 314 }, facing: "left", defaultAspect: "red" },
  // 出站信号机（右端，上行发车 S 系）
  { id: "SI", label: "SⅠ", kind: "exit", pos: { x: 840, y: 106 }, facing: "right", defaultAspect: "red" },
  { id: "SII", label: "SⅡ", kind: "exit", pos: { x: 840, y: 234 }, facing: "right", defaultAspect: "red" },
  { id: "SIII", label: "SⅢ", kind: "exit", pos: { x: 760, y: 314 }, facing: "right", defaultAspect: "red" },
  // 调车信号机
  { id: "D1", label: "D1", kind: "shunt", pos: { x: 250, y: 234 }, facing: "right", defaultAspect: "blue" },
  { id: "D2", label: "D2", kind: "shunt", pos: { x: 950, y: 186 }, facing: "left", defaultAspect: "blue" },
]

// 股道点选目标（点信号机后，可点这些区域作为终端）
export const TRACK_TARGETS: { id: string; label: string; rect: { x: number; y: number; w: number; h: number } }[] = [
  { id: "IG", label: "I 道", rect: { x: 380, y: 118, w: 440, h: 24 } },
  { id: "IIG", label: "II 道", rect: { x: 380, y: 198, w: 440, h: 24 } },
  { id: "IIIG", label: "III 道", rect: { x: 460, y: 278, w: 280, h: 24 } },
]

// ----------------------- 进路表 -----------------------
const P = {
  leftEntry: { x: 60, y: 210 },
  rightEntry: { x: 1140, y: 210 },
  w1: { x: 300, y: 210 },
  w3: { x: 380, y: 210 },
  w2: { x: 900, y: 210 },
  w4: { x: 820, y: 210 },
  IGmid: { x: 600, y: 130 },
  IImid: { x: 600, y: 210 },
  IIImid: { x: 600, y: 290 },
  IGleft: { x: 380, y: 130 },
  IGright: { x: 820, y: 130 },
  IIIleft: { x: 460, y: 290 },
  IIIright: { x: 740, y: 290 },
}

export const ROUTES: RouteDef[] = [
  // ---------- 下行接车 (X 进站 -> 股道) ----------
  {
    id: "X-IIG",
    from: "X",
    to: "IIG",
    kind: "train",
    name: "X → II 道 接车进路（正线）",
    segments: ["1AG", "IIG"],
    switches: [
      { id: "W1", pos: "normal" },
      { id: "W3", pos: "normal" },
    ],
    aspect: "green",
    trainPath: [P.leftEntry, P.w1, P.w3, P.IImid],
  },
  {
    id: "X-IG",
    from: "X",
    to: "IG",
    kind: "train",
    name: "X → I 道 接车进路（侧线）",
    segments: ["1AG", "IG"],
    switches: [{ id: "W1", pos: "reverse" }],
    aspect: "yellow",
    trainPath: [P.leftEntry, P.w1, P.IGleft, P.IGmid],
  },
  {
    id: "X-IIIG",
    from: "X",
    to: "IIIG",
    kind: "train",
    name: "X → III 道 接车进路（侧线）",
    segments: ["1AG", "IIIG"],
    switches: [
      { id: "W1", pos: "normal" },
      { id: "W3", pos: "reverse" },
    ],
    aspect: "yellow",
    trainPath: [P.leftEntry, P.w1, P.w3, P.IIIleft, P.IIImid],
  },
  // ---------- 上行接车 (S 进站 -> 股道) ----------
  {
    id: "S-IIG",
    from: "S",
    to: "IIG",
    kind: "train",
    name: "S → II 道 接车进路（正线）",
    segments: ["2AG", "IIG"],
    switches: [
      { id: "W2", pos: "normal" },
      { id: "W4", pos: "normal" },
    ],
    aspect: "green",
    trainPath: [P.rightEntry, P.w2, P.w4, P.IImid],
  },
  {
    id: "S-IG",
    from: "S",
    to: "IG",
    kind: "train",
    name: "S → I 道 接车进路（侧线）",
    segments: ["2AG", "IG"],
    switches: [{ id: "W2", pos: "reverse" }],
    aspect: "yellow",
    trainPath: [P.rightEntry, P.w2, P.IGright, P.IGmid],
  },
  {
    id: "S-IIIG",
    from: "S",
    to: "IIIG",
    kind: "train",
    name: "S → III 道 接车进路（侧线）",
    segments: ["2AG", "IIIG"],
    switches: [
      { id: "W2", pos: "normal" },
      { id: "W4", pos: "reverse" },
    ],
    aspect: "yellow",
    trainPath: [P.rightEntry, P.w2, P.w4, P.IIIright, P.IIImid],
  },
  // ---------- 上行发车 (出站 S 系 -> 右区间) ----------
  {
    id: "SII-out",
    from: "SII",
    to: "S",
    kind: "train",
    name: "SⅡ → 上行区间 发车进路",
    segments: ["IIG", "2AG"],
    switches: [
      { id: "W4", pos: "normal" },
      { id: "W2", pos: "normal" },
    ],
    aspect: "green",
    trainPath: [P.IImid, P.w4, P.w2, P.rightEntry],
  },
  {
    id: "SI-out",
    from: "SI",
    to: "S",
    kind: "train",
    name: "SⅠ → 上行区间 发车进路",
    segments: ["IG", "2AG"],
    switches: [{ id: "W2", pos: "reverse" }],
    aspect: "green",
    trainPath: [P.IGmid, P.IGright, P.w2, P.rightEntry],
  },
  {
    id: "SIII-out",
    from: "SIII",
    to: "S",
    kind: "train",
    name: "SⅢ → 上行区间 发车进路",
    segments: ["IIIG", "2AG"],
    switches: [
      { id: "W4", pos: "reverse" },
      { id: "W2", pos: "normal" },
    ],
    aspect: "green",
    trainPath: [P.IIImid, P.IIIright, P.w4, P.w2, P.rightEntry],
  },
  // ---------- 下行发车 (出站 X 系 -> 左区间) ----------
  {
    id: "XII-out",
    from: "XII",
    to: "X",
    kind: "train",
    name: "XⅡ → 下行区间 发车进路",
    segments: ["IIG", "1AG"],
    switches: [
      { id: "W3", pos: "normal" },
      { id: "W1", pos: "normal" },
    ],
    aspect: "green",
    trainPath: [P.IImid, P.w3, P.w1, P.leftEntry],
  },
  {
    id: "XI-out",
    from: "XI",
    to: "X",
    kind: "train",
    name: "XⅠ → 下行区间 发车进路",
    segments: ["IG", "1AG"],
    switches: [{ id: "W1", pos: "reverse" }],
    aspect: "green",
    trainPath: [P.IGmid, P.IGleft, P.w1, P.leftEntry],
  },
  {
    id: "XIII-out",
    from: "XIII",
    to: "X",
    kind: "train",
    name: "XⅢ → 下行区间 发车进路",
    segments: ["IIIG", "1AG"],
    switches: [
      { id: "W3", pos: "reverse" },
      { id: "W1", pos: "normal" },
    ],
    aspect: "green",
    trainPath: [P.IIImid, P.IIIleft, P.w3, P.w1, P.leftEntry],
  },
  // ---------- 调车进路 ----------
  {
    id: "D1-IIG",
    from: "D1",
    to: "IIG",
    kind: "shunt",
    name: "D1 → II 道 调车进路",
    segments: ["1AG", "IIG"],
    switches: [
      { id: "W1", pos: "normal" },
      { id: "W3", pos: "normal" },
    ],
    aspect: "white",
    trainPath: [{ x: 250, y: 210 }, P.w1, P.w3, P.IImid],
  },
  {
    id: "D2-IIG",
    from: "D2",
    to: "IIG",
    kind: "shunt",
    name: "D2 → II 道 调车进路",
    segments: ["2AG", "IIG"],
    switches: [
      { id: "W2", pos: "normal" },
      { id: "W4", pos: "normal" },
    ],
    aspect: "white",
    trainPath: [{ x: 950, y: 210 }, P.w2, P.w4, P.IImid],
  },
]

export function findRoute(from: string, to: string): RouteDef | undefined {
  return ROUTES.find((r) => r.from === from && r.to === to)
}

export function routesFrom(from: string): RouteDef[] {
  return ROUTES.filter((r) => r.from === from)
}

// 几何工具：计算折线总长
export function pathLength(pts: Point[]): number {
  let len = 0
  for (let i = 1; i < pts.length; i++) {
    len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
  }
  return len
}

// 按 0..1 进度取折线上的点与朝向角
export function pointAt(pts: Point[], t: number): { p: Point; angle: number } {
  const total = pathLength(pts)
  const target = total * Math.max(0, Math.min(1, t))
  let acc = 0
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
    if (acc + seg >= target || i === pts.length - 1) {
      const local = seg === 0 ? 0 : (target - acc) / seg
      const x = pts[i - 1].x + (pts[i].x - pts[i - 1].x) * local
      const y = pts[i - 1].y + (pts[i].y - pts[i - 1].y) * local
      const angle = (Math.atan2(pts[i].y - pts[i - 1].y, pts[i].x - pts[i - 1].x) * 180) / Math.PI
      return { p: { x, y }, angle }
    }
    acc += seg
  }
  return { p: pts[pts.length - 1], angle: 0 }
}
