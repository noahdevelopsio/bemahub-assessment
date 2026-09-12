-- 1. Deduplicate existing rows to allow the new unique constraint to be created.
-- We keep the earliest row (lowest id) and delete any subsequent duplicates.
DELETE w1 FROM wp_bl_withdrawals w1
INNER JOIN wp_bl_withdrawals w2 
  ON w1.instructor_id = w2.instructor_id 
  AND w1.payout_reference = w2.payout_reference
  AND w1.id > w2.id;

-- 2. Drop the flawed unique index and replace it with a strict two-column index.
-- This removes the `cancelled_at` loophole entirely.
ALTER TABLE wp_bl_withdrawals
  DROP INDEX uq_reference,
  ADD UNIQUE INDEX uq_reference (instructor_id, payout_reference);
