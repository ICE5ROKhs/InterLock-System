import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

const root = process.cwd()

function read(path) {
  return readFileSync(join(root, path), "utf8")
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

const data = read("lib/interlocking-data.ts")
const provider = read("components/interlocking-provider.tsx")
const yard = read("components/station-yard.tsx")
const panel = read("components/control-panel.tsx")

const requiredStationLabels = ["JXG", "JSG", "安全线", "PZA", "IIAG", "IIBG", "IG", "IIG", "3G"]
for (const label of requiredStationLabels) {
  assert(data.includes(label) || yard.includes(label), `站场图缺少设备/标识：${label}`)
}

const requiredSwitchLabels = ['label: "1"', 'label: "2"', 'label: "3"', 'label: "4"', 'label: "5"']
for (const label of requiredSwitchLabels) {
  assert(data.includes(label), `站场图缺少道岔：${label}`)
}
assert(data.includes('pivot: { x: 240, y: 210 }'), "1 号道岔应位于中间横线")
assert(data.includes('pivot: { x: 300, y: 210 }'), "3 号道岔应位于中间横线且在 1 号右侧")
assert(data.includes('pivot: { x: 330, y: 290 }'), "5 号道岔应位于 3 号道岔右下方的交汇处")
assert(data.includes('{ x: 240, y: 210 },\n    { x: 300, y: 130 }'), "1 号道岔应连接往上的线")
assert(data.includes('{ x: 760, y: 130 },\n    { x: 840, y: 210 }'), "往上的线最后应落到 4 号道岔")
assert(data.includes('{ x: 300, y: 210 },\n    { x: 330, y: 290 }'), "3 号道岔应连接往下的线并落到右下方 5 号道岔")
assert(data.includes('{ x: 330, y: 290 },\n    { x: 175, y: 290 }'), "5 号道岔左侧应延伸出去连接安全线")
assert(data.includes('{ x: 118, y: 290 },\n      { x: 175, y: 290 }'), "安全线应画在 5 号道岔左侧延伸线上")
assert(data.includes('{ x: 760, y: 290 },\n    { x: 920, y: 210 }'), "往下的线最后应落到 2 号道岔")

const requiredSignalLabels = ['label: "X"', 'label: "D1"', 'label: "S3"', 'label: "SII"', 'label: "S1"', 'label: "X3"', 'label: "XII"', 'label: "X1"', 'label: "D2"', 'label: "S"']
for (const label of requiredSignalLabels) {
  assert(data.includes(label), `站场图缺少信号机：${label}`)
}

const trainRouteIds = ["X-IIG", "S-IIG", "X-through", "S-through", "SII-out", "XII-out", "S3-out", "S1-out", "X3-out", "X1-out"]
for (const id of trainRouteIds) {
  assert(data.includes(`id: "${id}"`), `列车接发/通过进路表缺少：${id}`)
}

const shuntRouteIds = ["D1-IIG", "D1-IG", "D1-IIIG", "D2-IIG", "D2-IG", "D2-IIIG"]
for (const id of shuntRouteIds) {
  assert(data.includes(`id: "${id}"`), `站内调车进路表缺少：${id}`)
}

assert(data.includes("wire-broken") || provider.includes("signalWireBroken"), "缺少室外信号机断丝状态建模")
assert(panel.includes("断丝") && panel.includes("恢复信号"), "缺少断丝/恢复信号操作按钮")
assert(yard.includes("wireBroken") || yard.includes("signalWireBroken"), "站场图未显示信号断丝状态")

assert(provider.includes("approached") && provider.includes("COUNTDOWN_TICK"), "人工解锁倒计时逻辑证据不足")
assert(provider.includes("TRAIN_TICK") && provider.includes("occupied") && provider.includes("free"), "轨道占压/出清仿真证据不足")
assert(provider.includes("SWITCH_SETTLE") && provider.includes("movingSwitch"), "道岔动作/位置仿真证据不足")

const designPath = "docs/design-scheme.md"
assert(existsSync(join(root, designPath)), "缺少完整设计方案文档 docs/design-scheme.md")
const design = existsSync(join(root, designPath)) ? read(designPath) : ""
for (const phrase of ["总体设计", "站场图", "联锁逻辑", "仿真功能", "测试与验收"]) {
  assert(design.includes(phrase), `设计方案文档缺少章节：${phrase}`)
}

console.log("requirements checks passed")
