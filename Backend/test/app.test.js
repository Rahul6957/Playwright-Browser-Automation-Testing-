const test = require("node:test");
const assert = require("node:assert/strict");
const app = require("../src/app");

let server;
let baseUrl;

test.before(async () => {
    server = app.listen(0, "127.0.0.1");
    await new Promise((resolve, reject) => {
        server.once("listening", resolve);
        server.once("error", reject);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
    if (server) {
        await new Promise((resolve, reject) =>
            server.close(error => error ? reject(error) : resolve())
        );
    }
});

test("health route returns the existing success payload", async () => {
    const response = await fetch(`${baseUrl}/`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
        success: true,
        message: "Online Book Store API is running"
    });
});

test("protected routes reject requests without a bearer token", async () => {
    const response = await fetch(`${baseUrl}/api/cart`);
    assert.equal(response.status, 401);
    assert.equal((await response.json()).success, false);
});

test("malformed JSON returns a safe 400 response", async () => {
    const response = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{invalid"
    });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).message, "Malformed JSON request body");
});

test("unknown routes return the JSON 404 response", async () => {
    const response = await fetch(`${baseUrl}/not-a-route`);
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), {
        success: false,
        message: "Route not found"
    });
});
