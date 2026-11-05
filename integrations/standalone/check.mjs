const version = process.argv[2];
if (!version) {
    console.error("usage: node check.mjs <version>");
    process.exit(1);
}

const base = "http://127.0.0.1:3489";

function check(ok, message) {
    if (!ok) {
        throw new Error(message);
    }
    console.log(`ok: ${message}`);
}

async function waitForServer() {
    for (let i = 0; i < 60; i++) {
        try {
            if ((await fetch(base + "/api/v1/version")).ok) {
                return;
            }
        } catch {
            // Not listening yet.
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    throw new Error("the server did not answer within 60 seconds");
}

await waitForServer();

const reported = (await (await fetch(base + "/api/v1/version")).json()).version;
check(reported === version, `the server reports ${version} (got ${reported})`);

const bootstrap = await fetch(base + "/api/v1/admin/bootstrap", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "admin@example.com", pass: "bundle-check-pass" }),
});
check(bootstrap.status === 200, `bootstrap creates the first admin (${bootstrap.status})`);
