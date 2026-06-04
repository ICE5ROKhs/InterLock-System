import { InterlockingProvider } from "@/components/interlocking-provider"
import { StationYard } from "@/components/station-yard"
import { ControlPanel } from "@/components/control-panel"
import { InfoPanel } from "@/components/info-panel"
import { TitleBar } from "@/components/title-bar"

export default function Page() {
  return (
    <InterlockingProvider>
      <main className="flex min-h-screen flex-col gap-3 bg-[#07111f] p-3 text-slate-100 lg:h-screen">
        <TitleBar />
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[1fr_340px]">
          {/* 左侧：站场图 + 信息区 */}
          <div className="grid min-h-0 grid-rows-[minmax(360px,440px)_minmax(220px,auto)] gap-3 lg:grid-rows-[1fr_220px]">
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
