export function resolveEnv(primary?: string, legacy?: string): string | undefined {
    return primary ?? legacy;
}

export function booleanEnv(key?: string): boolean {
    if(!key) return false;
    return key === "true"
}

export function typeEnv<T>(key: string | undefined, defaultType: string | undefined): T {
    if(!key || key === "") return defaultType as T;
    return key as T;
}
