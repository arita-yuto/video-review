"use client";

import { useTranslations } from "next-intl";
import { AccountAvatar } from "@/components/controls/account-avatar";

export function PeopleList(props: { people: { name: string; email: string | null }[] }) {
    const SHOWN_PEOPLE = 5;
    const t = useTranslations("people-list");
    const hidden = props.people.length - SHOWN_PEOPLE;

    return (
        <div className="flex flex-col gap-1">
            {props.people.slice(0, SHOWN_PEOPLE).map((person, index) => (
                <div key={index} className="flex items-center gap-2">
                    <AccountAvatar email={person.email} className="size-5" />
                    {person.name}
                </div>
            ))}
            {hidden > 0 && <span>{t("more", { count: hidden })}</span>}
        </div>
    );
}
