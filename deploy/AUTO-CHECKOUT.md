# Automatic room checkout

The application checks every minute with the scheduler timezone set to `Africa/Lagos`. A booking becomes due at **11:59 AM Lagos time on its checkout date**. It also checks on application startup, catching overdue stays from previous days. The Node service must be running; after downtime, catch-up runs on restart.

Confirmed, successful, completed and part-payment stays are covered. Each due booking is locked and rechecked before `checked_out` is set. Dates extended before the lock are respected. Room occupancy is only cleared when no other checked-in active booking currently occupies that room. Retention flags are not removed; retained rooms stay excluded from availability searches. Release does not collect or waive money, clear part-payment balances, or automatically create/check in a new booking. System activity logs record automatic checkout.

Public availability and reception cash bookings use strict overlap checks (`existing.start < requested.end` and `existing.end > requested.start`) with Lagos noon stay boundaries. A checkout on November 16 therefore does not block an arrival from noon on November 16; overlapping nights still block the room. Cancelled/pending/initiated requests do not reserve inventory. Reception cash booking creation locks the selected room, rechecks availability, and saves the booking, payment ledger/history and occupancy update in one transaction. Late/extended stays must have their checkout dates extended in the portal before the deadline.

Deploy the full change and restart the app. Startup will automatically check out existing overdue records, leaving their money fields unchanged. No OS crontab is required. `config/cron.js` now exports the release service without running a second uncoordinated updater.
