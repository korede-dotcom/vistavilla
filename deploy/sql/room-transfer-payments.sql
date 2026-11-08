-- PostgreSQL: apply to the application's schema before restarting the new version.
BEGIN;
ALTER TABLE partpayments ADD COLUMN IF NOT EXISTS is_room_transfer BOOLEAN DEFAULT FALSE;
ALTER TABLE partpayments ADD COLUMN IF NOT EXISTS previous_room_number VARCHAR(255);
ALTER TABLE roomtransfers ADD COLUMN IF NOT EXISTS old_total DOUBLE PRECISION;
ALTER TABLE roomtransfers ADD COLUMN IF NOT EXISTS new_total DOUBLE PRECISION;
ALTER TABLE roomtransfers ADD COLUMN IF NOT EXISTS price_adjustment DOUBLE PRECISION;
ALTER TABLE roomtransfers ADD COLUMN IF NOT EXISTS amount_paid_now DOUBLE PRECISION DEFAULT 0;
ALTER TABLE roomtransfers ADD COLUMN IF NOT EXISTS balance_after DOUBLE PRECISION;
COMMIT;
