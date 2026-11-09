# Extend stays and two-way room transfers

Open Booking Details and select **Extend Stay**. Enter additional nights and
calculate the preview. It shows the revised checkout, added charges, full booking
total, previous payments and outstanding amount. Choose full or part payment and
enter money already received plus the payment method. Part payment is available
when the resulting stay is longer than one night; zero received leaves the full
outstanding amount in Part Payments.

Only added nights are charged for an extension. Each added night uses the room
category's current rate or special rate applicable to that date, less the existing
nightly discount. The previous booking total and receipts remain intact. Caution
fees are unchanged. New checkout preserves the old checkout time and increases by
the requested number of days. Checked-out bookings cannot be extended. An overdue
guest still checked in can extend far enough to bring checkout into the future.
Overlapping room reservations block the extension. A stale checkout timestamp
blocks repeat submissions from the same form.

The booking, part-payment ledger, payment receipts and extension record update in
one transaction. CEO, hotel manager and receptionist can use this feature.
Activity logs include these changes. Existing partial payments use the same ledger
instead of creating duplicates. Already-paid guest credit reduces the new amount
due before any additional money is collected.

Room transfers work in both directions at the destination room's rate for all
booked nights. An upgrade increases the total. A downgrade decreases it. If prior
payments exceed the new total, the outstanding balance is zero and the excess is
preserved as **Guest credit owed**, visible in Booking Details and transfer preview.
No automatic bank refund is initiated. Further money cannot be recorded while
credit covers the balance.

Deploy and restart Node; the StayExtension table is created by startup schema
setup automatically. No manual SQL is required. Run
`node --test tests/extension.test.js tests/transfer.test.js`. Verify against a
staging database before production use; no live data was changed during testing.
