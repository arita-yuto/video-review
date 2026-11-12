import { useEffect, useRef, useState } from "react";

export const useElementWidth = <T extends HTMLElement>() => {
    const element = useRef<T>(null);
    const [width, setWidth] = useState(0);

    useEffect(() => {
        const target = element.current;
        if (!target) {
            return;
        }

        const observer = new ResizeObserver(() => setWidth(target.clientWidth));
        observer.observe(target);
        return () => observer.disconnect();
    }, []);

    return [element, width] as const;
};
