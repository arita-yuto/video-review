import { useCallback, useEffect, useRef, useState } from "react";

// True once `waitMs` passes without a `wake` call; `wake` restarts the wait.
// While disabled, `wake` does nothing, so callers need no guard.
export function useIdle(enabled: boolean, waitMs: number) {
    const [idle, setIdle] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    // A ref so `wake` keeps its identity when `enabled` flips.
    const enabledRef = useRef(false);

    const wake = useCallback(() => {
        if (!enabledRef.current) {
            return;
        }
        if (timer.current !== null) {
            clearTimeout(timer.current);
        }
        setIdle(false);
        timer.current = setTimeout(() => setIdle(true), waitMs);
    }, [waitMs]);

    useEffect(() => {
        enabledRef.current = enabled;
        if (enabled) {
            wake();
        } else {
            setIdle(false);
        }

        return () => {
            enabledRef.current = false;
            if (timer.current !== null) {
                clearTimeout(timer.current);
                timer.current = null;
            }
        };
    }, [enabled, wake]);

    return { idle, wake };
}
