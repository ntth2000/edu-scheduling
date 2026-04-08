export function TypographyH2({ title, subtitle }: { title: string; subtitle?: string }) {
    return (
        <div>
            <h2 className="text-3xl font-extrabold text-md-on-surface tracking-tight font-heading">
                {title}
            </h2>
            {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
        </div>
    )
}

export function TypographyP({ text }: { text: string }) {
    return (
        <p className="leading-7 [&:not(:first-child)]:mt-6">
            {text}
        </p>
    )
}


export function TypographyH3({ title }: { title: string }) {
    return (
        <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
            {title}
        </h3>
    )
}

export function TypographyH4({ title }: { title: string }) {
    return (
        <h4 className="scroll-m-20 text-xl font-semibold tracking-tight">
            {title}
        </h4>
    )
}

