import vertexBytes from "./diff.vert";
import fragmentBytes from "./diff.frag";

const text = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

export const VERTEX_SHADER = text(vertexBytes);
export const FRAGMENT_SHADER = text(fragmentBytes);
