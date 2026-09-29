export function formatElapsed(elapsedMs: number): string {
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');

    return `${mm}:${ss}`;
}

// Order, punctuation and 12/24h come from the locale (ja "2026/9/21 20:11", en "9/21/2026, 8:11 PM").
export function formatDateTime(date: Date | string, locale: string): string {
    return new Date(date).toLocaleString(locale, {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}
