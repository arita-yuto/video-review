"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { NextIntlClientProvider } from "next-intl";
import type { Locale as DateFnsLocale } from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import { ja } from "date-fns/locale/ja";
import { ko } from "date-fns/locale/ko";

type LocaleContextType = {
    locale: string;
    setLocale: (locale: string) => void;
};

const LocaleContext = createContext<LocaleContextType>({
    locale: "en",
    setLocale: () => {},
});

// Names are each language's own name, so they read the same whatever the current UI language is.
export const Locales: Record<string, { name: string; dateFns: DateFnsLocale; load: () => Promise<{ default: any }> }> = {
    en: { name: "English", dateFns: enUS, load: () => import("../messages/en.json") },
    ja: { name: "日本語", dateFns: ja, load: () => import("../messages/ja.json") },
    ko: { name: "한국어", dateFns: ko, load: () => import("../messages/ko.json") },
};

export function LocaleProvider({ children }: { children: React.ReactNode }) {
    const [locale, setLocaleState] = useState("en");
    const [messages, setMessagess] = useState<any>(null);

    useEffect(() => {
        // A value this build has no messages for (e.g. saved by a newer version) falls back to English.
        const stored = localStorage.getItem("locale");
        const initial = stored && stored in Locales ? stored : "en";
        setLocaleState(initial);
        Locales[initial].load().then((m: any) => setMessagess(m.default));
    }, []);

    const setLocale = (loc: string) => {
        setLocaleState(loc);
        localStorage.setItem("locale", loc);
        Locales[loc].load().then((m: any) => setMessagess(m.default));
    };

    if (!messages) return null;

    return (
        <LocaleContext.Provider value={{ locale, setLocale }}>
            <NextIntlClientProvider messages={messages} locale={locale} timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone}>
                {children}
            </NextIntlClientProvider>
        </LocaleContext.Provider>
    );
}

export function useLocale() {
    return useContext(LocaleContext);
}
