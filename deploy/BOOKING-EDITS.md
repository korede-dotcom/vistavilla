# Booking editing

Receptionist, CEO and hotel manager can open **Booking Details → Edit Booking**.
The server verifies their current database role. Only active, not-checked-out
bookings are editable. The editor accepts guest details/count, dates, nightly
rate, flat/percentage discount on the whole room subtotal, a reason, and any
additional payment received. Select **Calculate changes**, review the totals,
then **Save booking changes**. Changing the form invalidates the preview.

Guest-only changes retain historical totals, including mixed-rate stays and
legacy discount calculations. Changing dates, nightly rate or discount reprices
the complete stay at the entered nightly rate, using whole-booking discount
semantics. Checkout/check-in times are preserved when dates change. Caution fees,
room assignment, branch and payment history cannot be overwritten in this form.
Use Transfer Room for assignment changes and Caution Fees for deposit actions.

Previous receipts are preserved. Increased charges become an outstanding balance
in Part Payments; new money received creates a receipt. A lower total preserves
any excess as guest credit instead of silently deleting payments or sending an
automatic refund. The ledger's guest details, dates, amount paid and balance update
with the booking. Dates cannot overlap another active reservation for the room.
Stale forms are rejected if another action has updated the booking.

Each save requires a reason and writes a BookingRevision record with staff ID,
name, timestamp, before/after dates and financial fields, newly received payment,
and changed guest-field names. The latest 20 edits appear under the editor.
CEO/manager Activity Logs also record the operation. Saving the booking, ledger,
receipt and revision is atomic; preview requests perform no writes.

Deploy and restart Node. Startup creates the booking revision table before serving
requests. No manual SQL is required. Tests use mocked storage; verify edits and
payment collection with a staging database before production use.

```sh
node --test tests/booking-edit.test.js tests/portal-access.test.js
```
