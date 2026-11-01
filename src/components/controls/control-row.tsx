// A label-and-control row for the filter panes: the label column gives way, the control keeps its width.
export function ControlRow(label: string, control: () => React.ReactElement, collaped?: boolean) {
    if(collaped === true) {
        return;
    }

    return (
        <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col flex-1 min-w-0">
                <span className="text-sm text-foreground">
                    {label}
                </span>
            </div>

            <div className="flex-shrink-0 flex justify-end">
                {control()}
            </div>
        </div>
    );
}