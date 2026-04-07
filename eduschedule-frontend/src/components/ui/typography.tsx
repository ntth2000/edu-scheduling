export function TypographyH2({ title }: { title: string }) {
    return (
        <h2 className="scroll-m-20 pb-2 text-3xl font-semibold tracking-tight first:mt-0">
            {title}
        </h2>
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

