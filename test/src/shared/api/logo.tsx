export function Logo({ size = 44 }: { size?: number }) {
    return (
        <span
            className="grid shrink-0 place-items-center rounded-[30%] border border-hairline bg-[linear-gradient(140deg,var(--c-card-gradient))] shadow-[0_14px_34px_-22px_var(--c-shadow-soft),0_0_26px_-14px_var(--c-glow-accent)] backdrop-blur-md"
            style={{ width: size, height: size }}
            aria-hidden="true"
        >
            <img
                src="/logo.png"
                alt=""
                width={size}
                height={size}
                className="size-[84%] object-contain"
            />
        </span>
    );
}
