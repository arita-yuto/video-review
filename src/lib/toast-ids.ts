// sonner replaces a toast that shares an id instead of stacking a second one.
export const toastIds = {
    // Upload status is polled, and overlapping polls can both see the upload complete.
    videoUploaded: (sessionId: string) => `video-uploaded-${sessionId}`,
};
