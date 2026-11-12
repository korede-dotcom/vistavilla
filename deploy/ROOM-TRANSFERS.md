# Room transfer payments

Transfers in Booking Details and Calendar now preview the destination rate,
revised total, prior receipts, and outstanding balance. Staff enter **Amount paid
now (₦)** and select cash, transfer, or card. Leaving zero records no new receipt.

Pricing policy: the destination's current category rate (or active special rate)
replaces the rate for **all booked nights**. Existing discounts are cleared.
This does not prorate already-used nights. The UI states this before confirmation.
Existing receipts remain credited. The new unpaid balance is stored against the
same part-payment record, or a new one if the booking was fully paid. A fully
settled transfer is recorded as completed and does not appear in the outstanding
list. Transfer audit history retains old/new totals and the amount collected.

Part Payments and its payment screen show the latest old → new room flag. The
CSV export includes the flag and previous room. Earlier transfers remain in the
transfer history. The **Payment Yet to Receive** dashboard card sums all positive
balances on partial payment records and links to that list.

The server reads actual destination room/category data, validates availability
against overlapping bookings, locks the booking and destination room, and commits
assignment, payment ledger, receipts and transfer history in one transaction.
Further part-payment collections use the same transaction and lock order.
Overpayments are rejected. Downgrades preserve all prior payments; any amount
above the new total is shown as guest credit owed in booking details and the
transfer preview. The credit applies to future extensions or room changes. It is
not silently discarded and is not automatically refunded. No charge or automatic refund is sent to a payment provider.
The amount-paid field records money staff have already received.

Deploy: restart Node after deploying the updated source. Startup automatically
creates the payment/transfer tables if missing and adds the new fields before
accepting requests. Existing columns and records are retained. The application
database user needs CREATE/ALTER privileges in its configured schema. PostgreSQL
workers serialize this step so concurrent starts cannot race the migration.
If schema setup fails, startup stops with an error instead of serving incomplete
payment functionality. The existing database must already exist and be reachable;
this does not create a separate database server or database account.

`deploy/sql/room-transfer-payments.sql` remains an optional manual alternative.

Verification: `npm run test:transfer`. Tests use mocked storage, so also verify a
real upgrade and subsequent balance collection in a staging database. No live
database was accessed or migrated during implementation.

Same-category transfers (such as one-bedroom to another one-bedroom in the same category) retain the agreed booking total and discount. No new payment is required: leave Amount paid now at 0 or blank. Existing outstanding balances remain payable and tracked in Part Payments. Transfers into a different category still recalculate using the destination category rate. Both the calendar and booking-details transfer dialogs support this behavior.
