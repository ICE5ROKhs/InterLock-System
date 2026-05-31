import { InterlockingProvider } from "@/components/interlocking-provider"
import { StationYard } from "@/components/station-yard"
import { ControlPanel } from "@/components/control-panel"
import { InfoPanel } from "@/components/info-panel"
import { TitleBar } from "@/components/title-bar"

export default function Page() {
  return (
    <InterlockingProvider>
      <main className="flex h-screen flex-col gap-3 bg-[#070d18] p-3 text-foreground">
        <TitleBar />
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[1fr_320px]">
          {/* 左侧：站场图 + 信息区 */}
          <div className="grid min-h-0 grid-rows-[1fr_230px] gap-3">
            <StationYard />
            <InfoPanel />
          </div>
          {/* 右侧：功能按钮区 */}
          <aside className="min-h-0">
            <ControlPanel />
          </aside>
        </div>
      </main>
    </InterlockingProvider>
  )
}
