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
  /** 界面显示名称，默认为 label。多个相邻区段可共用同一 displayName 以合并标注。 */
  displayName?: string
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

export interface OutdoorEquipmentDef {
  id: string
  label: string
  kind: "boundary" | "safety-line" | "derailer" | "marker" | "wire-broken"
  pos: Point
  path?: Point[]
}

// ----------------------- 轨道区段 -----------------------
export const SEGMENTS: SegmentDef[] = [
  {
    // 接近区段 1：JXG 至信号机 X（X 进路的站外接近轨道）
    id: "IIAG_1",
    label: "IIAG₁",
    displayName: "IIAG",
    path: [
      { x: 28, y: 210 },
      { x: 100, y: 210 },
    ],
    labelPos: { x: 64, y: 236 },
  },
  {
    // 接近区段 2：信号机 X 至信号机 D1（D1 调车进路的接近轨道）
    id: "IIAG_2",
    label: "IIAG₂",
    displayName: "IIAG",
    path: [
      { x: 100, y: 210 },
      { x: 180, y: 210 },
    ],
    labelPos: { x: 140, y: 236 },
  },
  {
    // 进路首区段：信号机 D1 至 1 号道岔
    id: "1AG",
    label: "1AG",
    displayName: "IIAG",
    path: [
      { x: 180, y: 210 },
      { x: 240, y: 210 },
    ],
    labelPos: { x: 210, y: 236 },
  },
  {
    // 进路首区段：2 号道岔至信号机 S
    id: "2AG",
    label: "2AG",
    displayName: "IIBG",
    path: [
      { x: 920, y: 210 },
      { x: 1080, y: 210 },
    ],
    labelPos: { x: 1000, y: 184 },
  },
  {
    // 接近区段：信号机 S 至 JSG（站外接近轨道）
    id: "IIBG",
    label: "IIBG",
    displayName: "IIBG",
    path: [
      { x: 1080, y: 210 },
      { x: 1174, y: 210 },
    ],
    labelPos: { x: 1127, y: 184 },
  },
  {
    id: "IIIG",
    label: "3G",
    path: [
      { x: 300, y: 130 },
      { x: 760, y: 130 },
    ],
    labelPos: { x: 475, y: 116 },
  },
  {
    // 股道 II 左侧咽喉区段：1 号道岔 → 信号机 SII
    id: "IIG_left",
    label: "IIG",
    displayName: "IIG",
    path: [
      { x: 240, y: 210 },
      { x: 360, y: 210 },
    ],
    labelPos: { x: 300, y: 196 },
  },
  {
    // 股道 II 站内区段：信号机 SII → 信号机 XII（列车停靠段）
    id: "IIG",
    label: "IIG",
    displayName: "IIG",
    path: [
      { x: 360, y: 210 },
      { x: 770, y: 210 },
    ],
    labelPos: { x: 565, y: 196 },
  },
  {
    // 股道 II 右侧咽喉区段：信号机 XII → 2 号道岔
    id: "IIG_right",
    label: "IIG",
    displayName: "IIG",
    path: [
      { x: 770, y: 210 },
      { x: 920, y: 210 },
    ],
    labelPos: { x: 845, y: 196 },
  },
  {
    id: "IG",
    label: "IG",
    path: [
      { x: 360, y: 290 },
      { x: 760, y: 290 },
    ],
    labelPos: { x: 462, y: 316 },
  },
]

// 道岔连接线（用于把咽喉区画通顺，非占用区段）
export const THROAT_LINKS: Point[][] = [
  // 中间正线：1 在 3 左边，二者都落在 IIG 横线上
  [
    { x: 240, y: 210 },
    { x: 300, y: 210 },
  ], // W1 -> W3
  [
    { x: 300, y: 210 },
    { x: 840, y: 210 },
  ], // W3 -> W4 中线
  // 1 号道岔引出的上行支线，最终落到 4
  [
    { x: 240, y: 210 },
    { x: 300, y: 130 },
  ],
  [
    { x: 300, y: 130 },
    { x: 760, y: 130 },
  ],
  [
    { x: 760, y: 130 },
    { x: 840, y: 210 },
  ],
  // 3 号道岔引出的下行支线，最终落到 2
  [
    { x: 300, y: 210 },
    { x: 330, y: 290 },
  ],
  [
    { x: 330, y: 290 },
    { x: 760, y: 290 },
  ],
  [
    { x: 330, y: 290 },
    { x: 175, y: 290 },
  ], // W5 左侧引出安全线
  [
    { x: 760, y: 290 },
    { x: 920, y: 210 },
  ],
  // 右侧出站区间（W2 → 信号机 S）
  [
    { x: 920, y: 210 },
    { x: 1080, y: 210 },
  ],
]

// ----------------------- 室外辅助设备/边界标识 -----------------------
export const OUTDOOR_EQUIPMENT: OutdoorEquipmentDef[] = [
  { id: "JXG", label: "JXG", kind: "boundary", pos: { x: 28, y: 210 } },
  { id: "JSG", label: "JSG", kind: "boundary", pos: { x: 1174, y: 210 } },
  {
    id: "SAFETY-LINE-L",
    label: "安全线",
    kind: "safety-line",
    pos: { x: 145, y: 276 },
    path: [
      { x: 118, y: 290 },
      { x: 175, y: 290 },
    ],
  },
  { id: "PZA", label: "PZA", kind: "derailer", pos: { x: 250, y: 342 } },
  { id: "WIRE-BROKEN-DEMO", label: "断丝", kind: "wire-broken", pos: { x: 1100, y: 72 } },
]

// ----------------------- 道岔 -----------------------
export const SWITCHES: SwitchDef[] = [
  {
    id: "W1",
    label: "1",
    pivot: { x: 240, y: 210 },
    normalEnd: { x: 288, y: 210 },
    reverseEnd: { x: 276, y: 186 },
  },
  {
    id: "W3",
    label: "3",
    pivot: { x: 300, y: 210 },
    normalEnd: { x: 348, y: 210 },
    reverseEnd: { x: 318, y: 234 },
  },
  {
    id: "W5",
    label: "5",
    pivot: { x: 330, y: 290 },
    normalEnd: { x: 378, y: 290 },
    reverseEnd: { x: 348, y: 266 },
  },
  {
    id: "W2",
    label: "2",
    pivot: { x: 920, y: 210 },
    normalEnd: { x: 872, y: 210 },
    reverseEnd: { x: 884, y: 234 },
  },
  {
    id: "W4",
    label: "4",
    pivot: { x: 840, y: 210 },
    normalEnd: { x: 792, y: 210 },
    reverseEnd: { x: 804, y: 186 },
  },
]

// ----------------------- 信号机 -----------------------
export const SIGNALS: SignalDef[] = [
  // 进站信号机
  { id: "X", label: "X", kind: "entry", pos: { x: 100, y: 190 }, facing: "right", defaultAspect: "red" },
  { id: "S", label: "S", kind: "entry", pos: { x: 1080, y: 210 }, facing: "left", defaultAspect: "red" },
  // 左侧出站信号机（S 系）
  { id: "S3", label: "S3", kind: "exit", pos: { x: 360, y: 145 }, facing: "left", defaultAspect: "red" },
  { id: "SII", label: "SII", kind: "exit", pos: { x: 360, y: 225 }, facing: "left", defaultAspect: "red" },
  { id: "S1", label: "S1", kind: "exit", pos: { x: 365, y: 305 }, facing: "left", defaultAspect: "red" },
  // 右侧出站信号机（X 系）
  { id: "X3", label: "X3", kind: "exit", pos: { x: 770, y: 110 }, facing: "right", defaultAspect: "red" },
  { id: "XII", label: "XII", kind: "exit", pos: { x: 770, y: 190 }, facing: "right", defaultAspect: "red" },
  { id: "X1", label: "X1", kind: "exit", pos: { x: 770, y: 270 }, facing: "right", defaultAspect: "red" },
  // 调车信号机
  { id: "D1", label: "D1", kind: "shunt", pos: { x: 180, y: 190 }, facing: "right", defaultAspect: "blue" },
  { id: "D2", label: "D2", kind: "shunt", pos: { x: 990, y: 225 }, facing: "left", defaultAspect: "blue" },
]

// 股道点选目标（点信号机后，可点这些区域作为终端）
export const TRACK_TARGETS: { id: string; label: string; rect: { x: number; y: number; w: number; h: number } }[] = [
  { id: "IIIG", label: "3 道", rect: { x: 300, y: 118, w: 460, h: 24 } },
  // II 道可点选区域限制在 SII–XII 之间（股道站内有效区段）
  { id: "IIG", label: "II 道", rect: { x: 360, y: 198, w: 410, h: 24 } },
  { id: "IG", label: "I 道", rect: { x: 360, y: 278, w: 400, h: 24 } },
]

// ----------------------- 进路表 -----------------------
const P = {
  leftEntry: { x: 28, y: 210 },
  rightEntry: { x: 1174, y: 210 },
  // 接近区段关键坐标（确保列车路径经过 IIAG_1 / IIAG_2）
  iiag1End: { x: 100, y: 210 },   // IIAG_1 终点 / 信号机 X 轨道位置
  iiag2End: { x: 180, y: 210 },   // IIAG_2 终点 / 信号机 D1 轨道位置
  w1: { x: 240, y: 210 },
  w3: { x: 300, y: 210 },
  w5: { x: 330, y: 290 },
  w2: { x: 920, y: 210 },
  w4: { x: 840, y: 210 },
  SII: { x: 360, y: 210 },   // 左侧出站信号机 SII（股道 II 左端防护）
  XII: { x: 770, y: 210 },   // 右侧出站信号机 XII（股道 II 右端防护）
  IIIGmid: { x: 560, y: 130 },
  IImid: { x: 565, y: 210 }, // 更新为 SII–XII 中点
  IGmid: { x: 560, y: 290 },
  IIIGleft: { x: 300, y: 130 },
  IIIGright: { x: 760, y: 130 },
  IGleft: { x: 330, y: 290 },
  IGright: { x: 760, y: 290 },
}

export const ROUTES: RouteDef[] = [
  // ---------- 下行接车 (X 进站 -> 股道) ----------
  {
    id: "X-IIG",
    from: "X",
    to: "IIG",
    kind: "train",
    name: "X → II 道 接车进路（正线）",
    segments: ["IIAG_2", "1AG", "IIG_left", "IIG"],
    switches: [
      { id: "W1", pos: "normal" },
      { id: "W3", pos: "normal" },
    ],
    aspect: "green",
    // 黄色锁闭光带在 XII 处终止，不进入 IIG_right
    trainPath: [P.leftEntry, P.iiag1End, P.iiag2End, P.w1, P.w3, P.SII, P.XII],
  },
  {
    id: "X-IG",
    from: "X",
    to: "IG",
    kind: "train",
    name: "X → I 道 接车进路（侧线）",
    segments: ["IIAG_2", "1AG", "IG"],
    switches: [
      { id: "W1", pos: "normal" },
      { id: "W3", pos: "reverse" },
    ],
    aspect: "yellow",
    trainPath: [P.leftEntry, P.iiag1End, P.iiag2End, P.w1, P.w3, P.IGleft, P.IGmid],
  },
  {
    id: "X-IIIG",
    from: "X",
    to: "IIIG",
    kind: "train",
    name: "X → 3 道 接车进路（侧线）",
    segments: ["IIAG_2", "1AG", "IIIG"],
    switches: [
      { id: "W1", pos: "reverse" },
    ],
    aspect: "yellow",
    trainPath: [P.leftEntry, P.iiag1End, P.iiag2End, P.w1, P.IIIGleft, P.IIIGmid],
  },
  {
    id: "X-through",
    from: "X",
    to: "S",
    kind: "train",
    name: "X → S 下行通过进路",
    segments: ["IIAG_2", "1AG", "IIG_left", "IIG", "IIG_right", "2AG"],
    switches: [
      { id: "W1", pos: "normal" },
      { id: "W3", pos: "normal" },
      { id: "W4", pos: "normal" },
      { id: "W2", pos: "normal" },
    ],
    aspect: "green",
    trainPath: [P.leftEntry, P.iiag1End, P.iiag2End, P.w1, P.w3, P.SII, P.XII, P.w4, P.w2, P.rightEntry],
  },
  // ---------- 上行接车 (S 进站 -> 股道) ----------
  {
    id: "S-IIG",
    from: "S",
    to: "IIG",
    kind: "train",
    name: "S → II 道 接车进路（正线）",
    segments: ["2AG", "IIG_right", "IIG"],
    switches: [
      { id: "W2", pos: "normal" },
      { id: "W4", pos: "normal" },
      { id: "W3", pos: "normal" },
    ],
    aspect: "green",
    // 黄色锁闭光带在 SII 处终止，不进入 IIG_left
    trainPath: [P.rightEntry, P.w2, P.w4, P.XII, P.SII],
  },
  {
    id: "S-IG",
    from: "S",
    to: "IG",
    kind: "train",
    name: "S → I 道 接车进路（侧线）",
    segments: ["2AG", "IG"],
    switches: [
      { id: "W2", pos: "reverse" },
    ],
    aspect: "yellow",
    trainPath: [P.rightEntry, P.w2, P.IGright, P.IGmid],
  },
  {
    id: "S-IIIG",
    from: "S",
    to: "IIIG",
    kind: "train",
    name: "S → 3 道 接车进路（侧线）",
    segments: ["2AG", "IIIG"],
    switches: [
      { id: "W2", pos: "normal" },
      { id: "W4", pos: "reverse" },
    ],
    aspect: "yellow",
    trainPath: [P.rightEntry, P.w2, P.w4, P.IIIGright, P.IIIGmid],
  },
  {
    id: "S-through",
    from: "S",
    to: "X",
    kind: "train",
    name: "S → X 上行通过进路",
    segments: ["2AG", "IIG_right", "IIG", "IIG_left", "1AG", "IIAG_2"],
    switches: [
      { id: "W2", pos: "normal" },
      { id: "W4", pos: "normal" },
      { id: "W3", pos: "normal" },
      { id: "W1", pos: "normal" },
    ],
    aspect: "green",
    trainPath: [P.rightEntry, P.w2, P.w4, P.XII, P.SII, P.w3, P.w1, P.leftEntry],
  },
  // ---------- 右行发车 (左侧 S 系出站 -> IIBG) ----------
  {
    id: "SII-out",
    from: "SII",
    to: "S",
    kind: "train",
    name: "SⅡ → 上行区间 发车进路",
    segments: ["IIG", "IIG_right", "2AG"],
    switches: [
      { id: "W4", pos: "normal" },
      { id: "W2", pos: "normal" },
    ],
    aspect: "green",
    trainPath: [P.SII, P.XII, P.w4, P.w2, P.rightEntry],
  },
  {
    id: "S1-out",
    from: "S1",
    to: "S",
    kind: "train",
    name: "S1 → IIBG 发车进路",
    segments: ["IG", "2AG"],
    switches: [
      { id: "W2", pos: "reverse" },
    ],
    aspect: "green",
    trainPath: [P.IGmid, P.IGright, P.w2, P.rightEntry],
  },
  {
    id: "S3-out",
    from: "S3",
    to: "S",
    kind: "train",
    name: "S3 → IIBG 发车进路",
    segments: ["IIIG", "2AG"],
    switches: [
      { id: "W4", pos: "reverse" },
      { id: "W2", pos: "normal" },
    ],
    aspect: "green",
    trainPath: [P.IIIGmid, P.IIIGright, P.w4, P.w2, P.rightEntry],
  },
  // ---------- 左行发车 (右侧 X 系出站 -> IIAG) ----------
  {
    id: "XII-out",
    from: "XII",
    to: "X",
    kind: "train",
    name: "XⅡ → 下行区间 发车进路",
    segments: ["IIG", "IIG_left", "1AG", "IIAG_2"],
    switches: [
      { id: "W1", pos: "normal" },
      { id: "W3", pos: "normal" },
    ],
    aspect: "green",
    trainPath: [P.XII, P.SII, P.w3, P.w1, P.leftEntry],
  },
  {
    id: "X1-out",
    from: "X1",
    to: "X",
    kind: "train",
    name: "X1 → IIAG 发车进路",
    segments: ["IG", "1AG", "IIAG_2"],
    switches: [
      { id: "W3", pos: "reverse" },
      { id: "W1", pos: "normal" },
    ],
    aspect: "green",
    trainPath: [P.IGmid, P.IGleft, P.w3, P.w1, P.leftEntry],
  },
  {
    id: "X3-out",
    from: "X3",
    to: "X",
    kind: "train",
    name: "X3 → IIAG 发车进路",
    segments: ["IIIG", "1AG", "IIAG_2"],
    switches: [
      { id: "W1", pos: "reverse" },
    ],
    aspect: "green",
    trainPath: [P.IIIGmid, P.IIIGleft, P.w1, P.leftEntry],
  },
  // ---------- 调车进路 ----------
  {
    id: "D1-IIG",
    from: "D1",
    to: "IIG",
    kind: "shunt",
    name: "D1 → II 道 调车进路",
    segments: ["1AG", "IIG_left", "IIG"],
    switches: [
      { id: "W1", pos: "normal" },
      { id: "W3", pos: "normal" },
    ],
    aspect: "white",
    trainPath: [{ x: 180, y: 210 }, P.w1, P.w3, P.SII, P.XII],
  },
  {
    id: "D1-IG",
    from: "D1",
    to: "IG",
    kind: "shunt",
    name: "D1 → I 道 调车进路",
    segments: ["1AG", "IG"],
    switches: [
      { id: "W1", pos: "normal" },
      { id: "W3", pos: "reverse" },
    ],
    aspect: "white",
    trainPath: [{ x: 150, y: 210 }, P.w1, P.w3, P.IGleft, P.IGmid],
  },
  {
    id: "D1-IIIG",
    from: "D1",
    to: "IIIG",
    kind: "shunt",
    name: "D1 → 3 道 调车进路",
    segments: ["1AG", "IIIG"],
    switches: [
      { id: "W1", pos: "reverse" },
    ],
    aspect: "white",
    trainPath: [{ x: 150, y: 210 }, P.w1, P.IIIGleft, P.IIIGmid],
  },
  {
    id: "D2-IIG",
    from: "D2",
    to: "IIG",
    kind: "shunt",
    name: "D2 → II 道 调车进路",
    segments: ["2AG", "IIG_right", "IIG"],
    switches: [
      { id: "W2", pos: "normal" },
      { id: "W4", pos: "normal" },
      { id: "W3", pos: "normal" },
    ],
    aspect: "white",
    trainPath: [{ x: 990, y: 210 }, P.w2, P.w4, P.XII, P.SII],
  },
  {
    id: "D2-IG",
    from: "D2",
    to: "IG",
    kind: "shunt",
    name: "D2 → I 道 调车进路",
    segments: ["2AG", "IG"],
    switches: [
      { id: "W2", pos: "reverse" },
    ],
    aspect: "white",
    trainPath: [{ x: 990, y: 210 }, P.w2, P.IGright, P.IGmid],
  },
  {
    id: "D2-IIIG",
    from: "D2",
    to: "IIIG",
    kind: "shunt",
    name: "D2 → 3 道 调车进路",
    segments: ["2AG", "IIIG"],
    switches: [
      { id: "W2", pos: "normal" },
      { id: "W4", pos: "reverse" },
    ],
    aspect: "white",
    trainPath: [{ x: 990, y: 210 }, P.w2, P.w4, P.IIIGright, P.IIIGmid],
  },
]

export function findRoute(from: string, to: string): RouteDef | undefined {
  return ROUTES.find((r) => r.from === from && r.to === to)
}

// ----------------------- 接近区段映射 -----------------------
// 信号机 → 站外接近区段（列车压入此区段时触发对应进路的接近锁闭）
export const APPROACH_SECTIONS: Record<string, string> = {
  X: "IIAG_1",  // 下行进站信号机 X 的接近区段（JXG → X）
  D1: "IIAG_2", // 调车信号机 D1 的接近区段（X → D1）
  S: "IIBG",    // 上行进站信号机 S 的接近区段（S → JSG）
}

/**
 * 判定进路是否处于「接近锁闭」状态
 * 条件：进路已建立 + 始端信号机对应的接近区段被占用
 * 此函数为纯计算（从 segs 状态推导），不依赖任何缓存标记
 */
export function isApproachLocked(
  fromSignalId: string,
  segStates: Record<string, "free" | "locked" | "occupied">,
): boolean {
  const approachSeg = APPROACH_SECTIONS[fromSignalId]
  if (!approachSeg) return false
  return segStates[approachSeg] === "occupied"
}

/** displayName 分组：将相邻且 displayName 相同的区段聚为一组 */
export interface DisplayNameGroup {
  displayName: string
  segments: SegmentDef[]
  /** 整组的几何中心 */
  center: Point
}

const _displayNameMap: Record<string, string> = {}
for (const seg of SEGMENTS) {
  _displayNameMap[seg.id] = seg.displayName ?? seg.label
}

/** 获取区段在界面上显示的友好名称（日志脱敏用） */
export function getDisplayName(segId: string): string {
  return _displayNameMap[segId] ?? segId
}

/** 将日志文本中所有已知区段 id 替换为 displayName */
export function toDisplayText(text: string): string {
  // 按 id 长度降序排列，避免短 id 误替子串（如 IG 被误替到 IIG 内部）
  const ids = Object.keys(_displayNameMap).sort((a, b) => b.length - a.length)
  for (const id of ids) {
    const display = _displayNameMap[id]
    if (display !== id) {
      // 全局替换，但只替换完整 id（前后非字母数字下划线）
      text = text.replace(new RegExp(id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), display)
    }
  }
  return text
}

export function groupSegmentsByDisplayName(segs: SegmentDef[]): DisplayNameGroup[] {
  const groups: DisplayNameGroup[] = []
  let current: SegmentDef[] = []
  let currentName: string | undefined

  for (const seg of segs) {
    const name = seg.displayName ?? seg.label
    if (name !== currentName && current.length > 0) {
      groups.push(calcGroup(current, currentName!))
      current = []
    }
    currentName = name
    current.push(seg)
  }
  if (current.length > 0) groups.push(calcGroup(current, currentName!))

  return groups
}

function calcGroup(segs: SegmentDef[], name: string): DisplayNameGroup {
  let minX = Infinity, maxX = -Infinity
  const refY = segs[0].labelPos.y  // 用首段的 labelPos.y 作为垂直基准
  for (const s of segs) {
    for (const p of s.path) {
      if (p.x < minX) minX = p.x
      if (p.x > maxX) maxX = p.x
    }
  }
  return { displayName: name, segments: segs, center: { x: (minX + maxX) / 2, y: refY } }
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
