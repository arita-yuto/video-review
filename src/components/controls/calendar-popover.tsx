"use client";
import React from 'react';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { Popover } from '@radix-ui/react-popover';
import { PopoverContent, PopoverTrigger } from '@/ui/popover';
import { Button } from '@/ui/button';
import { DateRange } from 'react-day-picker';
import { Calendar } from '@/ui/calendar';
import CalendarDateRadio from '@/components/controls/calendar-date-radio';
import { Locales, useLocale } from '@/app/locale-provider';

interface CalendarPopoverProps extends React.ComponentProps<"div"> {
    mode: "none" | "today" | "recent" | "range";
    range: DateRange | undefined;
    onToday: () => void;
    onRecent: (days: number) => void;
    onSetRange: (from: Date, to: Date) => void;
    onClear: () => void;
}

export default function CalendarPopover({
    mode,
    range,
    onToday,
    onRecent,
    onSetRange,
    onClear,
    className,
    ...props
}: CalendarPopoverProps) {
    const { locale } = useLocale();
    const [open, setOpen] = React.useState(false);
    // Local working range so an in-progress selection (only "from" picked) stays
    // visible until both ends are chosen, then it is committed via onSetRange.
    const [draft, setDraft] = React.useState<DateRange | undefined>(range);

    const handleOpenChange = (next: boolean) => {
        // Re-seed the draft from the resolved range each time the popover opens.
        if (next) setDraft(range);
        setOpen(next);
    };

    const handleSelect = (selected: DateRange | undefined) => {
        setDraft(selected);
        if (selected?.from && selected?.to) onSetRange(selected.from, selected.to);
    };

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <Button size="sm" variant="secondary">
                    <CalendarIcon />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="flex items-center">
                <div>
                    <div className="flex justify-between">
                        <CalendarDateRadio
                            mode={mode}
                            range={range}
                            onToday={onToday}
                            onRecent={onRecent}
                            onSetRange={onSetRange}
                            onClear={onClear}
                            collapseCalendarBtn />
                        <Button onClick={() => setOpen(false)} variant="secondary">
                            <X />
                        </Button>
                    </div>
                    <Calendar
                        mode="range"
                        defaultMonth={draft?.to ?? range?.to}
                        selected={draft}
                        onSelect={handleSelect}
                        numberOfMonths={1}
                        locale={Locales[locale].dateFns}
                    />
                </div>
            </PopoverContent>
        </Popover>
    );
}
