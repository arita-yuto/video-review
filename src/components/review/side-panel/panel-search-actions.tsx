"use client";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch } from "@fortawesome/free-solid-svg-icons";
import { X } from "lucide-react";
import { Button } from "@/ui/button";

export function PanelSearchActions({ filtering, onOpen, onClear }: {
    filtering: boolean;
    onOpen: () => void;
    onClear: () => void;
}) {
    return (
        <div className="flex items-center">
            <Button variant="toolbar" size="icon-sm" data-active={filtering} onClick={onOpen}>
                <FontAwesomeIcon icon={faSearch} />
            </Button>
            {filtering && (
                <Button variant="toolbar" size="icon-sm" onClick={onClear}>
                    <X className="size-5" />
                </Button>
            )}
        </div>
    );
}
