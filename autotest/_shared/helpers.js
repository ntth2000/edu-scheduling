const { chromium } = require("playwright");

const BASE_URL = process.env.AUTOTEST_BASE_URL || "http://localhost:3000";
const API_URL = process.env.AUTOTEST_API_URL || "http://localhost:8080";
const DEFAULT_PASSWORD = "Passw0rd!23";

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

// Registers a throwaway account directly against the backend so each test
// is self-contained and doesn't depend on fixture data. Username is
// timestamp-suffixed to avoid collisions across repeated runs.
async function registerTestUser(usernamePrefix, password = DEFAULT_PASSWORD) {
  const username = `${usernamePrefix}_${Date.now()}`;
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    throw new Error(`Setup failed: could not register test user ${username} (HTTP ${res.status})`);
  }
  return { username, password };
}

// Logs a user in through the real UI form (used when a test needs an
// authenticated browser session, e.g. to load a dashboard page).
async function loginUI(page, username, password) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await page.fill("#username", username);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/timetable**", { timeout: 8000 }).catch(() => {});
}

// Convenience wrapper for setup/fixture calls straight to the backend
// (bypassing the UI) — e.g. seeding a room, class, teacher before a test
// exercises the actual screen under test.
async function apiPost(path, body, cookieHeader) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Setup failed: POST ${path} -> HTTP ${res.status} ${text}`);
  }
  return res.status === 204 ? null : res.json();
}

async function apiGet(path, cookieHeader) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: cookieHeader ? { Cookie: cookieHeader } : {},
  });
  if (!res.ok) {
    throw new Error(`Setup failed: GET ${path} -> HTTP ${res.status}`);
  }
  return res.json();
}

// Builds a `Cookie:` header string from a Playwright BrowserContext's
// current cookies, so `apiPost` fixture calls hit the same authenticated
// account as the page (needed once the account isn't fresh/anonymous).
async function cookieHeaderFrom(context) {
  const cookies = await context.cookies();
  return cookies.map((c) => `${c.name}=${c.value}`).join("; ");
}

// Runs `testFn(page, context)` in a fresh browser context, prints PASS/FAIL,
// and exits with the matching status code. Meant to be the sole top-level
// call in each test file, so every file is independently runnable via
// `node <file>`.
async function run(testFn) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await testFn(page, context);
    console.log("PASS");
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error(`FAIL: ${err.message}`);
    await browser.close();
    process.exit(1);
  }
}

module.exports = {
  BASE_URL,
  API_URL,
  DEFAULT_PASSWORD,
  assert,
  registerTestUser,
  loginUI,
  apiGet,
  apiPost,
  cookieHeaderFrom,
  run,
};
