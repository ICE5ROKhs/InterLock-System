"use client"

const tutorialSections = [
  {
    title: "1) 计算机联锁上位机功能（40%）",
    items: [
      {
        name: "站场设备图形的完整性显示（10%）",
        steps: ["打开系统首页，先不操作任何按钮。", "对照站场图，指出 IIAG、IIBG、3G、IIG、IG、JXG、JSG、安全线、PZA、1/2/3/4/5 号道岔、X/S、S3/SII/S1、X3/XII/X1、D1/D2。"],
        observe: "老师能在站场图中直接看到全部设备名称和对应图形。",
      },
      {
        name: "办理列车按钮下发作业（5%）",
        steps: ["点击『进路操作』。", "点击进站信号 X，再点击 IIG 股道区域。"],
        observe: "提示窗显示 X 到 II 道接车进路已建立，相关区段锁闭，X 信号开放。",
      },
      {
        name: "办理调车按钮作业（5%）",
        steps: ["点击『上电解锁』恢复初始状态。", "点击 D1，再点击 IG、IIG 或 3G 任一股道区域。"],
        observe: "提示窗显示调车进路已建立，D1 调车信号显示月白。",
      },
      {
        name: "办理单独操作道岔按钮下发（5%）",
        steps: ["点击『单操』。", "点击任意未锁闭道岔，例如 5 号道岔。"],
        observe: "提示窗显示道岔单操中，0.5 秒后道岔转到定位或反位。",
      },
      {
        name: "站场设备动态显示（10%）",
        steps: ["先建立一条列车进路。", "点击『模拟列车运行』。"],
        observe: "列车沿进路移动，区段颜色按锁闭、占用、出清动态变化，信号和道岔状态同步显示。",
      },
      {
        name: "倒计时、操作提示等辅助功能（5%）",
        steps: ["建立进路并点击『模拟列车运行』让进路接近。", "点击『总人解』。"],
        observe: "操作提示区显示人工解锁启动，并出现 30 秒倒计时。",
      },
    ],
  },
  {
    title: "2) 后台运算逻辑联锁软件（50%）",
    items: [
      {
        name: "列车的接车、发车及通过作业办理完整过程（10%）",
        steps: ["接车：点击 X，再点击 IIG。", "发车：上电解锁后点击 SII，再点击 S。", "通过：上电解锁后点击 X，再点击 S。"],
        observe: "三类进路都能建立，系统完成区段检查、道岔转换、信号开放、列车运行和出清解锁。",
      },
      {
        name: "站内调车作业办理完整过程（10%）",
        steps: ["点击 D1 或 D2。", "点击 IG、IIG 或 3G 股道区域。", "点击『模拟列车运行』。"],
        observe: "调车进路锁闭，调车信号开放月白，列车/车列按调车路径运行并出清。",
      },
      {
        name: "取消进路功能（含人工解锁）（10%）",
        steps: ["建立一条进路但不要运行列车，点击『总取消』。", "再建立一条进路，点击『模拟列车运行』后点击『总人解』。"],
        observe: "未接近进路立即取消；已接近进路不能直接取消，需要人工解锁倒计时后释放。",
      },
      {
        name: "道岔的单操、单锁及封锁逻辑功能（10%）",
        steps: ["点击『单锁』后点击 1 号道岔。", "尝试办理需要该道岔不同位置的进路。", "点击『封锁』后点击 3 号道岔，再尝试办理经过 3 号的进路。"],
        observe: "单锁限制不符合位置的进路；封锁道岔后相关进路建立失败；提示区给出失败原因。",
      },
      {
        name: "进路解锁功能（10%）",
        steps: ["建立一条列车进路。", "点击『模拟列车运行』，等待列车走完全程。"],
        observe: "列车出清后，区段恢复空闲，信号关闭，活动进路列表清空。",
      },
    ],
  },
  {
    title: "3) 仿真功能（10%）",
    items: [
      {
        name: "室外信号设备的开放、关闭、断丝状态仿真（4%）",
        steps: ["开放：建立任意进路。", "关闭：点击『总取消』或等待列车出清。", "断丝：点击『断丝』，再点击 X 信号机，然后尝试以 X 为始端办理进路。"],
        observe: "信号能开放和关闭；断丝时灯位熄灭并显示故障标识，系统拒绝开放该信号。",
      },
      {
        name: "室外道岔设备的动作、位置状态仿真（4%）",
        steps: ["点击『单操』。", "点击任意未锁闭道岔。", "观察道岔尖轨颜色和方向变化。"],
        observe: "道岔显示动作中状态，0.5 秒后到达定位或反位；锁闭/封锁状态会显示标记。",
      },
      {
        name: "室外轨道电路的车列占压、出清状态仿真（2%）",
        steps: ["建立一条通过进路，例如 X 到 S。", "点击『模拟列车运行』。"],
        observe: "列车经过的区段依次变为红色占用，列车离开后恢复空闲，体现车列占压、出清。",
      },
    ],
  },
]

export function TutorialPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4">
      <section className="flex max-h-[86vh] w-full max-w-5xl flex-col overflow-hidden rounded-md border border-cyan-300/30 bg-[#07111f] shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        <header className="flex items-center justify-between border-b border-cyan-300/20 bg-[#0b1a2d] px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-slate-50">功能验收教程</h2>
            <p className="font-mono text-xs text-cyan-200/70">按评分项逐项演示，观察提示窗、站场图和活动进路状态</p>
          </div>
          <button
            onClick={onClose}
            className="rounded border border-slate-500/50 bg-slate-950/70 px-3 py-1.5 text-sm font-semibold text-slate-100 hover:border-cyan-300/50"
          >
            关闭
          </button>
        </header>
        <div className="overflow-y-auto p-4">
          <div className="grid gap-4">
            {tutorialSections.map((section) => (
              <section key={section.title} className="rounded border border-slate-600/45 bg-[#0c1f34] p-3">
                <h3 className="mb-3 border-l-2 border-cyan-300 pl-2 text-sm font-semibold text-cyan-100">{section.title}</h3>
                <div className="grid gap-3">
                  {section.items.map((item) => (
                    <article key={item.name} className="rounded border border-slate-700/55 bg-[#050b13] p-3">
                      <h4 className="text-sm font-semibold text-slate-50">{item.name}</h4>
                      <div className="mt-2 grid gap-2 text-xs leading-relaxed text-slate-300 md:grid-cols-[1fr_1fr]">
                        <div>
                          <p className="mb-1 font-semibold text-cyan-200">演示步骤</p>
                          <ol className="list-decimal space-y-1 pl-4">
                            {item.steps.map((step) => (
                              <li key={step}>{step}</li>
                            ))}
                          </ol>
                        </div>
                        <div>
                          <p className="mb-1 font-semibold text-emerald-200">观察要点</p>
                          <p>{item.observe}</p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
