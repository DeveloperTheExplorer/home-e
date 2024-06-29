export const ChartSkeleton = () => {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-100 p-4 text-foreground">
      <div className="float-right inline-block w-fit rounded-full bg-slate-400 px-2 py-1 text-xs text-transparent">
        xxxxxx
      </div>
      <div className="mb-1 w-fit rounded-md bg-slate-300 text-2lg text-transparent">
        xxxxxx xxx xx xxxx xx xxx xxx
      </div>
      <div className="w-fit rounded-md bg-slate-300 text-xl font-bold text-transparent">
        xxxxxx xxx xx xxx
      </div>
      <div className="text mt-1 w-fit rounded-md bg-slate-300 text-xs text-transparent">
        xxxxxx xxx
      </div>

      <div className="relative -mx-4 cursor-col-resize">
        <div style={{ height: 146 }}></div>
      </div>
    </div>
  )
}
