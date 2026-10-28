"use client";

import React from "react";
import { TimelineCard, type TimelineCardState } from "@/components/video-side-panel/timeline-card";
import type { FlowAnchor } from "@/lib/list-flow";

// Both offsets are from the same offset parent, so the difference is the card's position in the list.
export function cardEdges(list: HTMLElement, el: HTMLElement): { top: number; bottom: number } {
    const top = el.offsetTop - list.offsetTop;
    return { top, bottom: top + el.offsetHeight };
}

// Where the list should sit for a card: the card low in the view, with room under it so the next one already shows.
export function cardAnchorTop(list: HTMLElement, el: HTMLElement): number {
    const peek = list.clientHeight * 0.3;
    const limit = list.scrollHeight - list.clientHeight;
    return Math.min(limit, Math.max(0, cardEdges(list, el).bottom + peek - list.clientHeight));
}

export function cardAnchors(list: HTMLElement, cards: { el: HTMLElement; time: number }[]): FlowAnchor[] {
    return cards.map(({ el, time }) => ({ time, top: cardAnchorTop(list, el) }));
}

export default function TimelineCardList<T>(props: {
    items: T[];
    containerRef: React.RefObject<HTMLDivElement | null>;
    itemCardRef: React.RefObject<Record<string, HTMLDivElement | null>>;
    // The key must be stable because panel content uses refs for timeline sync scrolling.
    getKey: (item: T) => string;
    getCardState?: (item: T) => TimelineCardState;
    onClick?: (item: T) => void;
    renderHeader?: (item: T) => React.ReactNode;
    renderContent: (item: T) => React.ReactNode;
    renderFooter?: (item: T) => React.ReactNode;
}) {
    return (
        <div ref={props.containerRef} className="flex-1 overflow-y-auto p-3 space-y-3">
            {props.items.map((item) => {
                const key = props.getKey(item);

                return (
                    <TimelineCard
                        ref={el => {
                            // Panels read back these refs to scroll the active/selected card into view.
                            props.itemCardRef.current[key] = el;
                        }}
                        key={key}
                        state={props.getCardState?.(item)}
                        onClick={() => { props.onClick?.(item) }}
                    >
                        {props.renderHeader?.(item)}
                        {props.renderContent(item)}
                        {props.renderFooter?.(item)}
                    </TimelineCard>
                );
            })}
        </div>
    );
}
