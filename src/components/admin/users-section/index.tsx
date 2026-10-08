"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { api, readError } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { AdminSection } from "@/components/admin/admin-section";
import { UserRow } from "@/components/admin/users-section/user-row";
import type { AssignableRole } from "@/lib/role";
import { CsvActions } from "@/components/controls/csv-actions";
import { SidebarSearchInput } from "@/components/controls/sidebar-search-input";
import { CreateUserForm } from "@/components/admin/users-section/create-user-form";
import type { User } from "@/lib/db-types";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/ui/table";
import { Spinner } from "@/ui/spinner";

const HIGHLIGHT_MS = 2500;

export function UsersSection() {
    const t = useTranslations("admin-settings");
    const { userId: selfId } = useAuthStore();

    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [justAddedId, setJustAddedId] = useState<string | null>(null);
    const [filter, setFilter] = useState("");
    const listRef = useRef<HTMLDivElement>(null);

    async function loadUsers(): Promise<User[]> {
        const res = await api.admin.users.$get();
        if (res.status !== 200) {
            throw new Error(await readError(res));
        }
        return (await res.json()).users;
    }

    useEffect(() => {
        let cancelled = false;

        void (async () => {
            try {
                const rows = await loadUsers();
                if (!cancelled) setUsers(rows);
            } catch (e) {
                if (!cancelled) setError(`${t("users.loadFailed")}: ${e instanceof Error ? e.message : String(e)}`);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, []);

    async function onRoleChange(user: User, role: AssignableRole) {
        const previous = user.role;
        setError(null);

        // Optimistic so the select does not snap back while the request is in flight.
        setUsers(rows => rows.map(r => r.id === user.id ? { ...r, role } : r));

        try {
            const res = await api.admin["role-update"].$patch({ json: { userId: user.id, role } });
            if (res.status !== 200) {
                throw new Error(await readError(res));
            }
        } catch (e) {
            setUsers(rows => rows.map(r => r.id === user.id ? { ...r, role: previous } : r));
            setError(`${t("users.updateFailed")}: ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    async function onActiveChange(user: User, active: boolean) {
        setError(null);
        setUsers(rows => rows.map(r => r.id === user.id ? { ...r, active } : r));

        try {
            const res = await api.admin["user-active"].$patch({ json: { userId: user.id, active } });
            if (res.status !== 200) {
                throw new Error(await readError(res));
            }
        } catch (e) {
            setUsers(rows => rows.map(r => r.id === user.id ? { ...r, active: !active } : r));
            setError(`${t("users.activeFailed")}: ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    async function onImported() {
        setError(null);
        try {
            setUsers(await loadUsers());
        } catch (e) {
            setError(`${t("users.loadFailed")}: ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    async function onCreated(createdEmail: string) {
        // The create route returns no row, so refetch to pick up the server-assigned id and date.
        setError(null);
        let rows: User[];
        try {
            rows = await loadUsers();
        } catch (e) {
            setError(`${t("users.loadFailed")}: ${e instanceof Error ? e.message : String(e)}`);
            return;
        }
        setUsers(rows);

        // Reveal the new user: scroll the list down to it and highlight it briefly.
        const added = rows.find(r => r.email === createdEmail);
        if (!added) return;

        setJustAddedId(added.id);
        requestAnimationFrame(() => {
            const el = listRef.current;
            if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
        });
        window.setTimeout(() => setJustAddedId(id => (id === added.id ? null : id)), HIGHLIGHT_MS);
    }

    return (
        <AdminSection title={t("sections.users")}>
            <div className="flex shrink-0 items-center gap-2">
                <div className="flex-1">
                    <SidebarSearchInput value={filter} onChange={setFilter} placeholder={t("users.filterPlaceholder")} />
                </div>
                <CsvActions
                    kind="users"
                    exportCsv={() => api.admin.users.export.$get()}
                    importCsv={(csv) => api.admin.users.import.$post({ json: { csv } })}
                    onImported={() => void onImported()}
                />
            </div>

            {loading ? (
                <div className="flex flex-1 items-center justify-center">
                    <Spinner />
                </div>
            ) : (
                <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("users.columns.displayName")}</TableHead>
                                <TableHead>{t("users.columns.email")}</TableHead>
                                <TableHead>{t("users.columns.role")}</TableHead>
                                <TableHead>{t("users.columns.active")}</TableHead>
                                <TableHead>{t("users.columns.createdAt")}</TableHead>
                                <TableHead>
                                    <span className="sr-only">{t("users.columns.actions")}</span>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.filter(user => matches(user, filter)).map(user => (
                                <UserRow
                                    key={user.id}
                                    user={user}
                                    isSelf={user.id === selfId}
                                    justAdded={user.id === justAddedId}
                                    onRoleChange={(role) => onRoleChange(user, role)}
                                    onActiveChange={(active) => onActiveChange(user, active)}
                                />
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {error && <p className="shrink-0 text-sm text-destructive">{error}</p>}

            <CreateUserForm onCreated={onCreated} />
        </AdminSection>
    );
}

// Every user is already loaded, so the list is narrowed in the browser.
function matches(user: User, filter: string): boolean {
    const needle = filter.trim().toLowerCase();
    return needle === "" || [user.displayName, user.email ?? ""].some(v => v.toLowerCase().includes(needle));
}
