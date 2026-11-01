"use client";
import React from 'react';
import { Button } from '@/ui/button';
import { ButtonGroup } from '@/ui/button-group';
import { DateRange } from 'react-day-picker';
import { useTranslations } from 'next-intl';
import CalendarPopover from '@/components/controls/calendar-popover';
import { X } from 'lucide-react';

// Any date-filter store can back it: mode and range come in as props, and each control reports through a callback.
interface CalendarDateRadioProps extends React.ComponentProps<"div"> {
    mode: "none" | "today" | "recent" | "range";
    range: DateRange | undefined;
    onToday: () => void;
    onRecent: (days: number) => void;
    onSetRange: (from: Date, to: Date) => void;
    onClear: () => void;
    collapseCalendarBtn?: boolean;
}

export default function CalendarDateRadio({
    mode,
    range,
    onToday,
    onRecent,
    onSetRange,
    onClear,
    collapseCalendarBtn = false,
    className,
    ...props
}: CalendarDateRadioProps) {
    const t = useTranslations("calendar-date-radio");
    const recentDay: number = 3;

    return (
        <div className={className}>
            <ButtonGroup>
                <Button
                    variant={mode === "today" ? "accent" : "secondary"} size="sm"
                    onClick={onToday}>
                    {t("today")}
                </Button>
                <Button
                    variant={mode === "recent" ? "accent" : "secondary"} size="sm"
                    onClick={() => onRecent(recentDay)}>
                    {t("recent", { days: recentDay })}
                </Button>
                {!collapseCalendarBtn && <>
                    <CalendarPopover
                        className="mx-2"
                        mode={mode}
                        range={range}
                        onToday={onToday}
                        onRecent={onRecent}
                        onSetRange={onSetRange}
                        onClear={onClear} />
                </>}
                <Button variant="secondary" size="sm" onClick={onClear}>
                    <X />
                </Button>
            </ButtonGroup>
        </div>
    );
}
