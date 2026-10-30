// Names an item or a folder wherever organize mode keeps track of one, such as the
// one being renamed or those picked.
export type NodeKey = `video:${string}` | `folder:${string}`;

export const itemNodeKey = (id: string): NodeKey => `video:${id}`;
export const folderNodeKey = (path: string): NodeKey => `folder:${path}`;

// The video id or folder path a key was made from.
export function parseNodeKey(key: NodeKey): { videoId: string } | { folderPath: string } {
    return key.startsWith("folder:")
        ? { folderPath: key.slice("folder:".length) }
        : { videoId: key.slice("video:".length) };
}
