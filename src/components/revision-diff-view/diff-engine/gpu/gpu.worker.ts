import { DiffRequest, HIGHLIGHT_MIX, LUMA, THRESHOLD_SLACK } from "../types";
import { serveDiffs } from "../worker-host";
import { FRAGMENT_SHADER, VERTEX_SHADER } from "./shaders";

// Thrown once the GPU has dropped the context (a driver reset, for one); it can't draw again.
class GpuContextLostError extends Error {
    constructor() {
        super("The GPU context was lost.");
        this.name = "GpuContextLostError";
    }
}

const compile = (gl: WebGL2RenderingContext, type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) throw new Error("no shader");

    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? "shader compile failed");
    return shader;
};

const createProgram = (gl: WebGL2RenderingContext) => {
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "program link failed");
    return program;
};

const createTexture = (gl: WebGL2RenderingContext, unit: number) => {
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return texture;
};

// Draws the diff with a fragment shader, one pixel per GPU thread. Built on the first request.
const createRenderer = () => {
    const canvas = new OffscreenCanvas(1, 1);
    const gl = canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: true, premultipliedAlpha: false });
    if (!gl) throw new Error("WebGL2 is not available in the worker.");

    let lost = false;
    canvas.addEventListener("webglcontextlost", () => { lost = true; });

    const program = createProgram(gl);
    gl.useProgram(program);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const primaryTexture = createTexture(gl, 0);
    const compareTexture = createTexture(gl, 1);
    gl.uniform1i(gl.getUniformLocation(program, "u_primary"), 0);
    gl.uniform1i(gl.getUniformLocation(program, "u_compare"), 1);
    gl.uniform3f(gl.getUniformLocation(program, "u_luma"), LUMA.r, LUMA.g, LUMA.b);
    gl.uniform1f(gl.getUniformLocation(program, "u_highlightMix"), HIGHLIGHT_MIX);
    const threshold = gl.getUniformLocation(program, "u_threshold");
    const baseOpacity = gl.getUniformLocation(program, "u_baseOpacity");
    const highlight = gl.getUniformLocation(program, "u_highlight");

    const upload = (unit: number, texture: WebGLTexture, frame: TexImageSource) => {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, frame);
    };

    return ({ width, height, primary, compare, options }: DiffRequest) => {
        if (lost || gl.isContextLost()) throw new GpuContextLostError();

        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);

        // A frame from another origin is refused here with a SecurityError, as on the CPU engine.
        upload(0, primaryTexture, primary);
        upload(1, compareTexture, compare);

        gl.uniform1f(threshold, options.threshold - THRESHOLD_SLACK);
        gl.uniform1f(baseOpacity, options.baseOpacity);
        gl.uniform3f(highlight, options.highlight.r / 255, options.highlight.g / 255, options.highlight.b / 255);
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        // Lost while drawing, the calls above did nothing and the bitmap would come out blank.
        if (gl.isContextLost()) throw new GpuContextLostError();
        return canvas.transferToImageBitmap();
    };
};

let render: ReturnType<typeof createRenderer> | null = null;
serveDiffs((request) => (render ??= createRenderer())(request));
