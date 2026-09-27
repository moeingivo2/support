export function Logo({ size = 44 }: { size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-[30%] border border-white/12 bg-[linear-gradient(140deg,rgba(255,255,255,.10),rgba(255,255,255,.02))] shadow-[0_14px_34px_-22px_rgba(0,0,0,.95),0_0_26px_-14px_rgba(0,98,255,.75)] backdrop-blur-md"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <img src="/logo.png" alt="" width={size} height={size} className="size-[84%] object-contain" />
    </span>
  )
}
