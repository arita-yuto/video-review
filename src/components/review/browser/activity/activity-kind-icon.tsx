import type { InferRequestType } from "hono/client";
import { MessageSquare, ThumbsUp, Upload, type LucideIcon } from "lucide-react";
import type { api } from "@/api";
import { cn } from "@/lib/utils";

export type ActivityKind = NonNullable<InferRequestType<typeof api.activity.index.$get>["query"]["kind"]>;

export function ActivityKindIcon({ kind }: { kind: ActivityKind }) {
    const KIND_ICONS: Record<ActivityKind, { Icon: LucideIcon; tone: string }> = {
        comment: { Icon: MessageSquare, tone: "text-info" },
        upload: { Icon: Upload, tone: "text-success" },
        reaction: { Icon: ThumbsUp, tone: "text-primary" },
    };

    const { Icon, tone } = KIND_ICONS[kind];

    return <Icon className={cn("size-4 shrink-0", tone)} />;
}
