# EduSchedule autotest

Playwright-based automation for the use cases in `../MANUAL_TEST_CHECKLIST.md`.
One file per test case, grouped by usecase folder (`uc01-dang-nhap/`,
`uc15-dang-ky-tai-khoan/`, ...). Each file is standalone and runnable on its
own with `node`.

## Setup

```bash
cd autotest
npm install
npx playwright install chromium   # only needed once per machine
```

## Run

Backend (`eduschedule-backend`) and frontend (`eduschedule-frontend`) dev
servers must already be running on `localhost:8080` / `localhost:3000`.

```bash
# one test
node uc01-dang-nhap/UC01-01.js

# everything
node run-all.js
# or: npm test
```

Override the target URLs with `AUTOTEST_BASE_URL` / `AUTOTEST_API_URL` env
vars if the app runs on different ports.

## Conventions

- Tests that need an account register a throwaway, timestamp-suffixed user
  directly via the backend (`_shared/helpers.js#registerTestUser`) instead of
  depending on fixture data — safe to re-run repeatedly, but note that those
  throwaway accounts (and their seeded default subjects) accumulate in the
  dev database over time. Clean up periodically if that matters to you, e.g.:
  `DELETE FROM users WHERE username LIKE 'uc%\_%' AND username ~ '_[0-9]{10,}$';`
  (delete dependent `refresh_tokens`/`subjects` rows first).
- Each file calls `run(testFn)` from `_shared/helpers.js`, which prints
  `PASS`/`FAIL: <reason>` and exits `0`/`1` — that's what `run-all.js` reads
  to build the summary.
- Adding a new use case: create `ucNN-ten-usecase/`, add one file per test
  ID from the checklist (e.g. `UCNN-01.js`), reuse `_shared/helpers.js`.
