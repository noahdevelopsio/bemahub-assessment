# SOLUTION.md

**Name:** Noah Enemali
**Date:** September 12, 2026
**Actual time spent:** 3hrs 30mins

---

## 1. What I completed

| Task | Status | Evidence file |
|---|---|---|
| 1 - Course list | done | evidence/task-1-ui.png, evidence/task-1-network.png |
| 2 - Authentication | done | evidence/task-2-signedout.png, evidence/task-2-signedin.png, evidence/task-2-network.png |
| 3 - Withdrawal form | done | evidence/task-3-validation.png, evidence/task-3-error.png, evidence/task-3-success.png, evidence/task-3-network.png |
| 4 - PHP defects | done | evidence/task-4-curl.txt |
| 5 - Database | done | answers/task-5.md |
| 6 - Infrastructure | done | answers/task-6.md |
| 7 - Python | done | python/reconcile_earnings.py |

## 2. What I did NOT finish, and how I would approach it

Nothing outstanding — all 7 tasks completed and verified.

## 3. Task 4: the defects

For each: what it was, why it is wrong, what you changed, how you proved it.

**Defect 1 (permission):** 
`GET /me/earnings` used `check_authenticated` instead of `check_instructor`. It allowed learners to view the endpoint. I changed the permission callback to `check_instructor` to enforce the role constraint. Proved by curling as a learner and receiving a 403 Forbidden.

**Defect 2 (schema):** 
`GET /courses/{id}` mapped `$row->lessons_total` which doesn't exist in the database schema (it's `lesson_count`). The value was silently falling back to 0. I changed it to `lesson_count` and proved it by curling course ID 1 and verifying it returns `"lessonCount":12`.

**Defect 3 (contract):** 
`GET /courses` failed to filter out unpublished courses. I added `WHERE c.is_published = 1` to the SQL query. Proved by curling the endpoint and verifying that only published courses are returned (course ID 5 is excluded).

**Defect 4 (validation):** 
`POST /me/withdrawals` failed to enforce the business rule that a withdrawal must meet `MINIMUM_WITHDRAWAL_MINOR`. I added a check `if ($amount < self::MINIMUM_WITHDRAWAL_MINOR)` that returns a 422 error. Proved by curling with an amount of 1000 and receiving the 422 `below_minimum` error.

## 4. Specific questions

**Task 1:** How did you handle `previewExpiresInSeconds`, and why?

Out of the three options I thought about for handling `previewExpiresInSeconds`: a "Lazy Update" (staleTime), "Constant Pinging" (refetchInterval), or a "Manual Refresh Button" (UI Affordance), I chose the **"Lazy Update" (staleTime)**.

**Why I chose this:**
1. **It matches the data type:** A list of courses is not a high-speed live feed (like a stock ticker or a sports scoreboard). It doesn't need to refresh before the user's eyes while they sit idle.
2. **It saves resources:** Constant background pinging wastes the user's battery and data, and heavily taxes our servers for no reason if the user leaves the tab open in the background.
3. **It's a seamless UI:** Manual refreshing creates friction. Users expect modern apps to handle freshness automatically without needing a "Refresh" button.
4. **How it feels to the user:** By using staleTime, the app feels blazingly fast because it uses saved data while it's fresh. But the moment the data expires, the next time the user focuses on the window or navigates to the page, it magically updates itself.

**Task 3:** Why must `payoutReference` be generated once per attempt rather than regenerated on retry? What would break?

If a network timeout occurs after the server has successfully processed the withdrawal but before the client receives the 201 Created response, the money has already been deducted on the backend. If the client retries the request and generates a new payoutReference, the server will see it as a completely new transaction, resulting in a duplicate withdrawal and moving the money twice (a double spend). By storing and sending the same payoutReference on the retry, the server recognizes it as a duplicate of the already completed transaction, thanks to the unique database index, and safely returns the original success response without withdrawing the money a second time.

**Task 5.2:** Why did the unique key fail to prevent duplicates, and why add a new migration rather than editing the old one?

The unique key `uq_reference (instructor_id, payout_reference, cancelled_at)` failed to prevent duplicates because MySQL treats `NULL` as an unknown value. Since `NULL != NULL`, MySQL evaluates the `(2, 'ref_duplicate', NULL)` combinations as distinct rows and ignores the unique constraint. 
I added a new migration `002_fix_withdrawal_reference.sql` instead of editing `001_initial.sql` because editing an already applied migration does not change the running database schema and breaks the migration history for environments that have already applied it.

**Task 7:** `"fee_minor": null`: zero fee, or error? Why?

I treated `"fee_minor": null` as an error requiring guarded processing (skipping with a warning) rather than a zero fee. In a financial system, `null` indicates missing or unknown data, which is fundamentally different from a deliberate `0` fee. Treating `null` as zero could silently overpay the instructor if the fee was actually dropped due to a data transmission glitch. It's safer to skip the malformed record and flag it for manual review than to guess and execute an incorrect financial transaction.

## 5. Anything wrong in our brief

In `TASK-1-COURSES.md`, it states `average_rating` is "Nullable, out of 5.00." and we should display it using `formatNullableNumber`. But the database migration shows `average_rating` as `DECIMAL(3,2)`. The brief does not clarify whether the frontend or the API should handle rounding/formatting if the rating goes beyond 2 decimal places, though `formatNullableNumber` uses `Intl.NumberFormat` which manages it gracefully.

## 6. AI Tool Usage: required

**AI tools are allowed and expected.** We use them daily. Using them is not cheating. Not disclosing them is.

**Which tools did you use?**

### 6a. Where AI was used

| Task | What AI produced | Accepted / rejected / modified |
|---|---|---|
| 1 - Course list | Initial /courses page implementation with query and status message | Accepted with user choice of staleTime |
| 2 - Authentication | Axios interceptor with ApiClientError, /login, and /earnings page | Accepted |
| 3 - Withdrawal form | WithdrawalForm component with react-hook-form and zod validation | Accepted as-is |
| 4 - PHP defects | Provided minimal patch code based on Noah's findings | Modified (I reviewed the code before accepting it to ensure it was minimal) |
| 5 - Database | Explanation of NULL uniqueness in MySQL and migration 002 | Accepted as-is |
| 7 - Python | Refactored `reconcile_earnings.py` logic to catch `KeyError` and check status | Accepted |

### 6b. What you accepted or rejected, and why

I rejected the AI's attempt to apply a complex custom visual design (a "ledger-style" UI overhaul) for the frontend because it violated the assessment rule to avoid "architectural rewrites" and would have wasted the timebox on unrequested scope creep. I accepted the functional code for tasks 1, 2, and 3 because it strictly followed the API contract and provided the exact error handling required.

### 6c. What you verified yourself, and how

- **Task 1:** Validated that the code in page.tsx matched the lazy update staleTime configuration.
- **Task 2:** Browser DevTools manual check injecting invalid token to verify 401 signOut and signed-out UI state, DevTools Offline network throttling to verify transport-failure message without signOut, and `cmd.exe /c "npx tsc --noEmit"` typecheck.
- **Task 3:** Verified via `cmd.exe /c "npx tsc --noEmit"` typecheck, plus manual browser verification: Tested validation boundary checks (below minimum, above balance) in UI. Inspected Network tab to confirm `Idempotency-Key` and payload `payoutReference` match exactly. Replayed XHR on a successful withdrawal to simulate a timeout/retry; confirmed the server returned 200 OK (original transaction) rather than 201 Created or a duplicate.

### 6d. Assumptions you made
I assumed that the frontend does not need comprehensive unit tests for this exercise due to the timebox, and that `payoutReference` generation via `crypto.randomUUID()` in the browser is sufficient for idempotency.

## 7. Assumptions and trade-offs

**Task 7 (Python):** Regarding the `"fee_minor": null` record, we implemented a hybrid strategy (Guarded Processing). Instead of choosing between a fragile script-wide crash (which would block valid payments) or silent financial exposure (which might overpay instructors by treating `null` as zero), the script catches the anomaly, logs a stderr warning to isolate the affected record for operations to investigate, and continues processing the rest of the batch safely.

## 8. If this went to production tomorrow

- **Untested code:** There are no automated tests (unit or e2e) for the frontend components. A regression could easily break the withdrawal form idempotency or auth interceptor.
- **Idempotency storage:** Currently, the `payoutReference` is only held in React component state. If the user accidentally refreshes the page while a withdrawal is in flight, the component remounts, state is lost, and they might submit a duplicate withdrawal if they retry. We should store it in sessionStorage or persist it more durably until the transaction is confirmed.
- **Race conditions in PHP:** The withdrawal PHP controller does not use pessimistic locking (e.g., `SELECT ... FOR UPDATE`) or a transaction isolation level that guarantees prevention of race conditions if a user double-clicks rapidly and bypasses the frontend constraints.
