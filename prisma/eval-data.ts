// Deterministic dataset for checking that natural-language search (MCP tools, chat search)
// returns the intended videos. Every video lives under the `eval/` folder prefix so the seed
// script can wipe and recreate exactly this subtree next to real or seeded data.
// Dates are relative to "now" so time-based questions ("uploaded this week") keep working.
// tests/smoke/mcp-eval.ts holds the questions and expected answers built on this data.

export const EVAL_FOLDER_PREFIX = "eval/";
export const EVAL_REPO_NAME = "eval/sample-game";

export const EVAL_USERS = [
    { displayName: "Bocchi", email: "Bocchi@example.com", pass: "pass123", avatarPath: "/avatars/Bocchi.png", role: "admin" },
    { displayName: "Kita", email: "Kita@example.com", pass: "pass123", avatarPath: "/avatars/Kita.png", role: "admin" },
    { displayName: "Ryo", email: "Ryo@example.com", pass: "pass123", avatarPath: "/avatars/Ryo.png", role: "admin" },
    { displayName: "Nijika", email: "Nijika@example.com", pass: "pass123", avatarPath: "/avatars/Nijika.png", role: "admin" },
];

export type EvalComment = {
    user: string;
    text: string;
    time: number;
    issueId?: string;
    drawing?: boolean;
};

export type EvalEvent = {
    kind: string;
    startMs: number;
    endMs: number;
    data: string;
};

export type EvalPullRequest = {
    number: number;
    title: string;
    description?: string;
    author: string;
    labels?: string[];
    files: string[];
    mergedDaysAgo: number;
};

export type EvalCommit = {
    hash: string;
    message: string;
    author: string;
    files: string[];
    committedDaysAgo: number;
};

export type EvalRevision = {
    daysAgo: number;
    tags: string[];
    summary?: string;
    comments?: EvalComment[];
    events?: EvalEvent[];
    /** Code changes linked to this revision (what changed since the previous one). */
    vcs?: { pullRequests?: EvalPullRequest[]; commits?: EvalCommit[]; summary?: string };
};

export type EvalVideo = {
    key: string;
    title: string;
    folder: string;
    vcsWatchPaths?: string[];
    deleted?: boolean;
    revisions: EvalRevision[];
};

export const EVAL_VIDEOS: EvalVideo[] = [
    {
        key: "boss-dragon",
        title: "Boss Fight - Dragon Phase 2",
        folder: "battle",
        vcsWatchPaths: ["Assets/Boss/", "Assets/Camera/"],
        revisions: [
            { daysAgo: 20, tags: ["boss", "battle", "wip"] },
            {
                daysAgo: 3,
                tags: ["boss", "battle", "bug"],
                summary: "Second phase of the dragon boss fight with the new tail sweep attack.",
                comments: [
                    { user: "Kita", text: "The dragon's tail clips through the floor at 0:12", time: 12, issueId: "BUG-201", drawing: true },
                    { user: "Ryo", text: "Camera shake feels too strong during the roar", time: 25 },
                ],
                events: [
                    { kind: "shot_type", startMs: 0, endMs: 8000, data: "wide-shot" },
                    { kind: "detected_text", startMs: 30000, endMs: 32000, data: "PHASE 2" },
                ],
                vcs: {
                    pullRequests: [
                        { number: 101, title: "Fix dragon tail collision", description: "Tail sweep now uses a capsule collider.", author: "kita", labels: ["bug"], files: ["Assets/Boss/Dragon/DragonTail.cs"], mergedDaysAgo: 5 },
                    ],
                    commits: [
                        { hash: "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678", message: "Tweak boss camera shake amplitude", author: "ryo", files: ["Assets/Camera/BossCamera.cs"], committedDaysAgo: 4 },
                    ],
                    summary: "Tail collision fix and a camera shake tweak for the dragon boss.",
                },
            },
        ],
    },
    {
        key: "tutorial-movement",
        title: "Tutorial - Movement Basics",
        folder: "tutorial",
        revisions: [
            {
                daysAgo: 45,
                tags: ["tutorial", "ui"],
                comments: [
                    { user: "Nijika", text: "Jump prompt text is too small on 1080p", time: 8 },
                ],
                events: [
                    { kind: "detected_text", startMs: 7000, endMs: 9000, data: "PRESS A TO JUMP" },
                ],
            },
        ],
    },
    {
        key: "cutscene-opening",
        title: "Cutscene - Opening",
        folder: "cutscene",
        vcsWatchPaths: ["Assets/Cutscenes/"],
        revisions: [
            { daysAgo: 60, tags: ["cutscene", "wip"] },
            {
                daysAgo: 10,
                tags: ["cutscene", "camera"],
                summary: "Opening cutscene with the reworked camera path over the kingdom.",
                comments: [
                    { user: "Bocchi", text: "Um... the cut at 0:05 might be a bit fast", time: 5 },
                ],
                events: [
                    { kind: "transcription", startMs: 1000, endMs: 4500, data: "Welcome to the kingdom of Aster" },
                    { kind: "shot_type", startMs: 0, endMs: 12000, data: "establishing-shot" },
                ],
                vcs: {
                    pullRequests: [
                        { number: 98, title: "Rework opening camera path", author: "bocchi", labels: ["cutscene"], files: ["Assets/Cutscenes/Opening/CameraPath.asset"], mergedDaysAgo: 12 },
                    ],
                    summary: "The opening camera path was reworked.",
                },
            },
        ],
    },
    {
        key: "ui-inventory",
        title: "UI - Inventory Screen",
        folder: "ui",
        vcsWatchPaths: ["Assets/UI/"],
        revisions: [
            {
                daysAgo: 5,
                tags: ["ui", "bug"],
                comments: [
                    { user: "Kita", text: "Item icons overlap when there are more than 20 items", time: 14, issueId: "BUG-215" },
                ],
                vcs: {
                    pullRequests: [
                        { number: 104, title: "Inventory grid layout fix", author: "nijika", labels: ["ui", "bug"], files: ["Assets/UI/Inventory/InventoryGrid.cs"], mergedDaysAgo: 6 },
                    ],
                },
            },
        ],
    },
    {
        key: "shader-water",
        title: "Shader - Water Reflection Test",
        folder: "graphics",
        vcsWatchPaths: ["Assets/Shaders/"],
        revisions: [
            {
                daysAgo: 2,
                tags: ["shader", "graphics", "wip"],
                vcs: {
                    pullRequests: [
                        { number: 106, title: "Add screen-space water reflections", author: "ryo", labels: ["graphics"], files: ["Assets/Shaders/Water.shader", "Assets/Shaders/Reflection.hlsl"], mergedDaysAgo: 3 },
                    ],
                },
            },
        ],
    },
    {
        key: "ai-patrol",
        title: "Enemy AI - Patrol Behaviour",
        folder: "ai",
        vcsWatchPaths: ["Assets/AI/"],
        revisions: [
            {
                daysAgo: 15,
                tags: ["ai", "enemy"],
                comments: [
                    { user: "Ryo", text: "Guards ignore the player when crouching behind crates", time: 40, issueId: "AI-77" },
                ],
                vcs: {
                    pullRequests: [
                        { number: 99, title: "Patrol state machine", author: "ryo", labels: ["ai"], files: ["Assets/AI/Patrol/PatrolState.cs"], mergedDaysAgo: 16 },
                    ],
                    commits: [
                        { hash: "b2c3d4e5f60718293a4b5c6d7e8f90123456789a", message: "Fix crouch detection distance", author: "kita", files: ["Assets/AI/Perception.cs"], committedDaysAgo: 15 },
                    ],
                },
            },
        ],
    },
    {
        key: "audio-footsteps",
        title: "Audio - Footstep Mix",
        folder: "audio",
        revisions: [
            { daysAgo: 90, tags: ["audio"] },
        ],
    },
    {
        key: "boss-golem",
        title: "Boss Fight - Golem Phase 1",
        folder: "battle",
        revisions: [
            {
                daysAgo: 30,
                tags: ["boss", "battle"],
                comments: [
                    { user: "Bocchi", text: "The golem's hitbox seems off when it slams the ground", time: 18, drawing: true },
                ],
            },
        ],
    },
    {
        key: "level-forest",
        title: "Level - Forest Path Blockout",
        folder: "level",
        vcsWatchPaths: ["Assets/Levels/Forest/"],
        revisions: [
            {
                daysAgo: 120,
                tags: ["level", "blockout"],
                comments: [
                    { user: "Nijika", text: "Path is too narrow near the bridge", time: 33 },
                ],
            },
            {
                daysAgo: 40,
                tags: ["level", "lighting"],
                vcs: {
                    pullRequests: [
                        { number: 90, title: "Forest lighting pass", author: "nijika", labels: ["level"], files: ["Assets/Levels/Forest/Lighting.asset"], mergedDaysAgo: 42 },
                    ],
                    commits: [
                        { hash: "c3d4e5f60718293a4b5c6d7e8f90123456789ab1", message: "Widen forest path near the bridge", author: "nijika", files: ["Assets/Levels/Forest/Path.prefab"], committedDaysAgo: 41 },
                    ],
                },
            },
        ],
    },
    {
        key: "loc-japanese-menu",
        title: "Localization - Japanese Menu Check",
        folder: "ui",
        revisions: [
            {
                daysAgo: 8,
                tags: ["ui", "localization", "japanese"],
                comments: [
                    { user: "Kita", text: "メニューの文字が枠からはみ出しています", time: 3, issueId: "LOC-12" },
                ],
                events: [
                    { kind: "detected_text", startMs: 2000, endMs: 4000, data: "はじめから" },
                ],
            },
        ],
    },
    {
        key: "perf-crowd",
        title: "Performance - Crowd Scene Stress",
        folder: "perf",
        vcsWatchPaths: ["Assets/Crowd/"],
        revisions: [
            {
                daysAgo: 1,
                tags: ["performance", "wip"],
                comments: [
                    { user: "Ryo", text: "Frame rate drops to 20fps with 200 NPCs on screen", time: 50 },
                ],
                vcs: {
                    pullRequests: [
                        { number: 107, title: "Update README badges", author: "bocchi", files: ["README.md"], mergedDaysAgo: 2 },
                    ],
                    commits: [
                        { hash: "d4e5f60718293a4b5c6d7e8f90123456789ab1c2", message: "Batch crowd renderers", author: "ryo", files: ["Assets/Crowd/CrowdRenderer.cs"], committedDaysAgo: 2 },
                    ],
                },
            },
        ],
    },
    {
        key: "discarded-title",
        title: "Discarded - Old Title Screen",
        folder: "ui",
        deleted: true,
        revisions: [
            { daysAgo: 200, tags: ["ui"] },
        ],
    },
];
