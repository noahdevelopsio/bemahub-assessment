# Task 5 — Database

> Paste the **terminal output** of every query, not just the SQL. For this task
> the output is the answer.

## 5.1 Investigate — NULL vs 0

```sql
SELECT title, enrolment_count, average_rating FROM wp_bl_courses;
```

```
mysql: [Warning] Using a password on the command line interface can be insecure.
title	enrolment_count	average_rating
Introduction to Bread Baking	128	4.60
Sourdough Starters	64	4.20
Pastry Fundamentals	NULL	NULL
Cake Decorating Basics	9	0.00
Advanced Laminated Dough	0	NULL
```

**Which rows are genuinely 0, and which are NULL?**
"Cake Decorating Basics" has a genuine `0.00` rating. "Advanced Laminated Dough" has a genuine `0` enrolment count. "Pastry Fundamentals" is entirely `NULL` for both fields.

**Why does this matter to a user?** (two sentences)
A genuine rating of `0.00` means users actually took the course and rated it terribly (zero stars), whereas a `NULL` rating means nobody has rated it yet. Displaying `NULL` as `0.00` on the frontend would unfairly penalize a brand-new, untested course by making it look awful.

## 5.2 The constraint

**Proof — two inserts with the same instructor_id and payout_reference:**

```sql
INSERT INTO wp_bl_withdrawals (instructor_id, amount_minor, status, payout_reference, cancelled_at) VALUES (2, 50000, 'pending', 'ref_duplicate', NULL);
INSERT INTO wp_bl_withdrawals (instructor_id, amount_minor, status, payout_reference, cancelled_at) VALUES (2, 50000, 'pending', 'ref_duplicate', NULL);
SELECT id, instructor_id, amount_minor, status, payout_reference, cancelled_at FROM wp_bl_withdrawals WHERE payout_reference = 'ref_duplicate';
```

```
mysql: [Warning] Using a password on the command line interface can be insecure.
id	instructor_id	amount_minor	status	payout_reference	cancelled_at
2	2	50000	pending	ref_duplicate	NULL
3	2	50000	pending	ref_duplicate	NULL
```

**Did the unique key prevent the duplicate? If not, exactly why?**
No, both inserts succeeded. The unique key `uq_reference (instructor_id, payout_reference, cancelled_at)` failed to prevent the duplicate because MySQL treats `NULL` as an unknown value. Since `NULL != NULL`, MySQL evaluates the `(2, 'ref_duplicate', NULL)` combinations as strictly distinct rows and completely ignores the unique constraint.

### The fix — `database/migrations/002_fix_withdrawal_reference.sql`

**Why a new migration rather than editing `001_initial.sql`:** 
Editing an applied migration changes nothing on the running database and rewrites history for anyone who hasn't run it yet.

**Applying it:**

```
mysql: [Warning] Using a password on the command line interface can be insecure.
```

**`SHOW CREATE TABLE wp_bl_withdrawals;` afterwards:**

```
mysql: [Warning] Using a password on the command line interface can be insecure.
Table	Create Table
wp_bl_withdrawals	CREATE TABLE `wp_bl_withdrawals` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `instructor_id` bigint unsigned NOT NULL,
  `amount_minor` int unsigned NOT NULL,
  `status` varchar(32) COLLATE utf8mb4_unicode_520_ci NOT NULL DEFAULT 'pending',
  `payout_reference` varchar(64) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_reference` (`instructor_id`,`payout_reference`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci
```

**The duplicate insert, re-run and now rejected:**

```
mysql: [Warning] Using a password on the command line interface can be insecure.
ERROR 1062 (23000) at line 1: Duplicate entry '2-ref_duplicate' for key 'wp_bl_withdrawals.uq_reference'
```

## 5.3 The join

```sql
SELECT 
  c.title,
  COUNT(e.id) AS non_refunded_enrolments,
  COALESCE(SUM(e.amount_paid_minor), 0) AS non_refunded_revenue
FROM wp_bl_courses c
LEFT JOIN wp_bl_enrolments e 
  ON c.id = e.course_id 
  AND e.refunded_at IS NULL
GROUP BY c.id, c.title;
```

```
mysql: [Warning] Using a password on the command line interface can be insecure.
title	non_refunded_enrolments	non_refunded_revenue
Introduction to Bread Baking	2	9000
Sourdough Starters	0	0
Pastry Fundamentals	0	0
Cake Decorating Basics	0	0
Advanced Laminated Dough	0	0
```

**Which join type did you use, and what would break with the other one?**
I used a `LEFT JOIN` (filtering `e.refunded_at IS NULL` directly in the `ON` clause). If I had used an `INNER JOIN` (or placed the filter in the `WHERE` clause instead), any course with zero enrolments (or only refunded enrolments) would completely vanish from the results, violating the requirement that "Courses with zero enrolments must still appear".
