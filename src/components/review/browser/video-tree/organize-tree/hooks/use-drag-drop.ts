import { useRef, useState, type ComponentProps, type DragEvent } from "react";

type DragProps = Pick<
    ComponentProps<"button">,
    "draggable" | "onDragStart" | "onDragEnd" | "onDragEnter" | "onDragOver" | "onDragLeave" | "onDrop"
>;

// Long enough that dragging across a target on the way elsewhere doesn't count as lingering.
const LINGER_MS = 700;
// A drag that leaves for the button's own icon or text, or another button with the same target,
// comes back within this time (dragover repeats about every 350 ms), so the highlight holds.
const LEAVE_DELAY_MS = 400;

type Options<Source> = {
    // Whether the source may be dropped on the target; a refused target isn't highlighted.
    accepts: (source: Source, target: string) => boolean;
    onDrop: (source: Source, target: string) => void;
    // Called once the drag has rested on an accepting target for a while, such as to open it.
    onLinger: (target: string) => void;
};

// Native drag and drop between buttons. Several buttons may share one target, which stays
// highlighted while the drag moves among them. The source is kept here rather than in
// dataTransfer, which can't be read during dragover to decide whether a target accepts it.
export function useDragDrop<Source>({ accepts, onDrop, onLinger }: Options<Source>) {
    const [source, setSource] = useState<Source | null>(null);
    const [target, setTarget] = useState<string | null>(null);
    // Not state: neighbouring buttons fire dragenter and dragleave before a re-render.
    const targetRef = useRef<string | null>(null);
    const lingerTimer = useRef<number | undefined>(undefined);
    const leaveTimer = useRef<number | undefined>(undefined);

    const aim = (to: string | null) => {
        window.clearTimeout(lingerTimer.current);
        window.clearTimeout(leaveTimer.current);
        targetRef.current = to;
        setTarget(to);
        if (to !== null) {
            lingerTimer.current = window.setTimeout(() => onLinger(to), LINGER_MS);
        }
    };

    const end = () => {
        aim(null);
        setSource(null);
    };

    const dragFrom = (from: Source): DragProps => ({
        draggable: true,
        onDragStart: (e) => {
            e.dataTransfer.effectAllowed = "move";
            // Firefox doesn't start a drag without data.
            e.dataTransfer.setData("text/plain", "");
            setSource(from);
        },
        onDragEnd: end,
    });

    // `target` is this one while something it accepts is held over it.
    const dropOn = (to: string): DragProps => {
        const accept = (e: DragEvent<HTMLButtonElement>) => {
            if (source === null || !accepts(source, to)) {
                return;
            }

            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            window.clearTimeout(leaveTimer.current);
            if (targetRef.current !== to) {
                aim(to);
            }
        };

        return {
            onDragEnter: accept,
            onDragOver: accept,
            onDragLeave: () => {
                window.clearTimeout(leaveTimer.current);
                leaveTimer.current = window.setTimeout(() => {
                    if (targetRef.current === to) {
                        aim(null);
                    }
                }, LEAVE_DELAY_MS);
            },
            onDrop: (e) => {
                const from = source;
                end();
                if (from === null || !accepts(from, to)) {
                    return;
                }

                e.preventDefault();
                onDrop(from, to);
            },
        };
    };

    return { dragFrom, dropOn, target };
}
