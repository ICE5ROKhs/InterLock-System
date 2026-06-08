export interface ValidationGuideStep {
  title: string
  score: string
  prepare: string
  prepareMode?: "route" | "single-op" | "single-lock" | "block" | "signal-break"
  successKind:
    | "station-visible"
    | "train-route-built"
    | "shunt-route-built"
    | "switch-moved"
    | "dynamic-display"
    | "manual-release-countdown"
    | "train-process"
    | "shunt-process"
    | "cancel-or-manual-release"
    | "switch-protection"
    | "route-unlocked"
    | "signal-wire"
    | "switch-simulation"
    | "track-occupancy"
  click: string
  observe: string
  buttonLabels?: string[]
  signalIds?: string[]
  switchIds?: string[]
  segmentIds?: string[]
  targetIds?: string[]
}

export const VALIDATION_GUIDE_STEPS: ValidationGuideStep[] = [
  {
    title: "站场设备图形的完整性显示",
    score: "上位机功能 10%",
    prepare: "点击『准备本项』，系统会恢复初始状态，只保留引导高亮，避免验收项互相影响。",
    successKind: "station-visible",
    click: "先不点击任何按钮，直接对照站场图查看设备。",
    observe: "应能看到 IIAG、IIBG、3G、IIG、IG、JXG、JSG、安全线、PZA、1/2/3/4/5 道岔和全部信号机。",
    segmentIds: ["1AG", "2AG", "IIIG", "IIG", "IG"],
    switchIds: ["W1", "W2", "W3", "W4", "W5"],
  },
  {
    title: "办理列车按钮下发作业",
    score: "上位机功能 5%",
    prepare: "点击『准备本项』清空上一项进路、占用和故障，并切回进路操作。",
    successKind: "train-route-built",
    click: "点击 X 信号机，再点击 IIG 股道区域。",
    observe: "提示窗应显示 X 到 II 道接车进路建立，X 信号开放，相关区段锁闭。",
    signalIds: ["X"],
    targetIds: ["IIG"],
  },
  {
    title: "办理调车按钮作业",
    score: "上位机功能 5%",
    prepare: "点击『准备本项』清空列车进路状态，保证 D1 调车进路可重新办理。",
    successKind: "shunt-route-built",
    click: "点击 D1 信号机，再点击 IG、IIG 或 3G 股道区域。",
    observe: "D1 调车进路建立，调车信号显示月白，活动进路列表出现调车进路。",
    signalIds: ["D1"],
    targetIds: ["IG", "IIG", "IIIG"],
  },
  {
    title: "办理单独操作道岔按钮下发",
    score: "上位机功能 5%",
    prepare: "点击『准备本项』清除锁闭和封锁，并自动进入单操模式。",
    prepareMode: "single-op",
    successKind: "switch-moved",
    click: "点击『单操』，再点击 5 号道岔。",
    observe: "提示窗显示道岔动作中，0.5 秒后 5 号道岔位置改变。",
    buttonLabels: ["单操"],
    switchIds: ["W5"],
  },
  {
    title: "站场设备动态显示",
    score: "上位机功能 10%",
    prepare: "点击『准备本项』后先建立一条进路，再运行列车，避免上一项道岔单操影响进路检查。",
    successKind: "dynamic-display",
    click: "建立任意进路后点击『模拟列车运行』。",
    observe: "列车沿进路移动，区段依次显示锁闭、占用和出清，信号与道岔状态同步变化。",
    buttonLabels: ["▶ 模拟列车运行"],
    segmentIds: ["1AG", "IIG", "2AG"],
  },
  {
    title: "倒计时、操作提示等辅助功能",
    score: "上位机功能 5%",
    prepare: "点击『准备本项』后建立进路并运行列车，让进路进入接近锁闭，再演示总人解倒计时。",
    successKind: "manual-release-countdown",
    click: "列车接近后点击『总人解』。",
    observe: "提示区出现人工解锁信息，并显示 30 秒倒计时。",
    buttonLabels: ["总人解"],
  },
  {
    title: "列车接车、发车及通过作业办理完整过程",
    score: "联锁逻辑 10%",
    prepare: "点击『准备本项』，每演示接车、发车或通过前都先恢复一次，避免前一条进路占用后影响下一条。",
    successKind: "train-process",
    click: "接车点 X→IIG；发车点 SII→S；通过点 X→S。",
    observe: "三类进路均能完成检查、锁闭、开放信号、运行和出清解锁。",
    signalIds: ["X", "SII", "S"],
    targetIds: ["IIG"],
  },
  {
    title: "站内调车作业办理完整过程",
    score: "联锁逻辑 10%",
    prepare: "点击『准备本项』清空列车进路，再办理 D2 调车进路并运行。",
    successKind: "shunt-process",
    click: "点击 D2，再点击 IIG 或 IG 股道区域，然后点击『模拟列车运行』。",
    observe: "调车进路锁闭，D2 显示月白，车列运行后区段出清。",
    signalIds: ["D2"],
    targetIds: ["IIG", "IG"],
    buttonLabels: ["▶ 模拟列车运行"],
  },
  {
    title: "取消进路功能（含人工解锁）",
    score: "联锁逻辑 10%",
    prepare: "点击『准备本项』后先建立一条未运行进路演示总取消；再准备一次，建立并运行后演示总人解。",
    successKind: "cancel-or-manual-release",
    click: "未运行列车时点『总取消』；列车接近后点『总人解』。",
    observe: "未接近进路立即解锁；已接近进路进入人工解锁倒计时。",
    buttonLabels: ["总取消", "总人解"],
  },
  {
    title: "道岔单操、单锁及封锁逻辑",
    score: "联锁逻辑 10%",
    prepare: "点击『准备本项』清掉已建立进路和占用，再按单锁或封锁演示限制条件。",
    prepareMode: "single-lock",
    successKind: "switch-protection",
    click: "依次点击『单锁』『封锁』，再点击对应道岔测试限制。",
    observe: "单锁或封锁后，相关进路无法建立，提示区给出拒绝原因。",
    buttonLabels: ["单锁", "封锁"],
    switchIds: ["W1", "W3"],
  },
  {
    title: "进路解锁功能",
    score: "联锁逻辑 10%",
    prepare: "点击『准备本项』后重新建立进路并运行列车，专门观察走完全程后的自动解锁。",
    successKind: "route-unlocked",
    click: "建立一条进路后点击『模拟列车运行』，等待列车走完全程。",
    observe: "列车出清后区段恢复空闲，信号关闭，活动进路清空。",
    buttonLabels: ["▶ 模拟列车运行"],
    segmentIds: ["1AG", "IIG", "2AG"],
  },
  {
    title: "室外信号设备开放、关闭、断丝状态仿真",
    score: "仿真功能 4%",
    prepare: "点击『准备本项』恢复所有信号断丝，再自动进入断丝模式，先做故障，再恢复验证。",
    prepareMode: "signal-break",
    successKind: "signal-wire",
    click: "点击『断丝』后点击 X，再尝试 X→IIG；恢复时点击『恢复信号』后再点 X。",
    observe: "断丝时信号熄灭并拒绝开放；恢复后可重新办理进路。",
    buttonLabels: ["断丝", "恢复信号"],
    signalIds: ["X"],
  },
  {
    title: "室外道岔设备动作、位置状态仿真",
    score: "仿真功能 4%",
    prepare: "点击『准备本项』清除进路锁闭并进入单操模式，便于观察道岔动作和位置变化。",
    prepareMode: "single-op",
    successKind: "switch-simulation",
    click: "点击『单操』后点击任意未锁闭道岔。",
    observe: "道岔显示动作延时，随后定位/反位状态改变。",
    buttonLabels: ["单操"],
    switchIds: ["W2", "W4", "W5"],
  },
  {
    title: "室外轨道电路车列占压、出清状态仿真",
    score: "仿真功能 2%",
    prepare: "点击『准备本项』恢复空闲轨道，再建立 X→S 通过进路，专门观察占压和出清。",
    successKind: "track-occupancy",
    click: "建立 X→S 通过进路后点击『模拟列车运行』。",
    observe: "列车经过区段变红表示占压，离开后恢复空闲表示出清。",
    signalIds: ["X", "S"],
    buttonLabels: ["▶ 模拟列车运行"],
    segmentIds: ["1AG", "IIG", "2AG"],
  },
]
