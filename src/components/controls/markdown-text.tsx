import type { ReactNode } from "react";
import Markdown from "react-markdown";

type LinkRenderer = (href: string | undefined, children: ReactNode) => ReactNode;

export const externalLink: LinkRenderer = (href, children) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="underline text-primary hover:text-primary-strong">
        {children}
    </a>
);

export function MarkdownText({ children, link = externalLink }: { children: string; link?: LinkRenderer }) {
    return (
        <div className="flex flex-col gap-2">
            <Markdown
                components={{
                    p: ({ children }) => <p className="leading-relaxed">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc pl-5 flex flex-col gap-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-5 flex flex-col gap-1">{children}</ol>,
                    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                    // Headings render as emphasised lines, not document headings.
                    h1: ({ children }) => <p className="font-semibold text-primary mt-1">{children}</p>,
                    h2: ({ children }) => <p className="font-semibold text-primary mt-1">{children}</p>,
                    h3: ({ children }) => <p className="font-semibold text-primary mt-1">{children}</p>,
                    strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                    code: ({ children }) => <code className="rounded bg-background px-1 text-primary">{children}</code>,
                    a: ({ href, children }) => link(href, children),
                }}
            >
                {children}
            </Markdown>
        </div>
    );
}
