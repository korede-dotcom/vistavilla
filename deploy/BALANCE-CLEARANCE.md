# Clear an unpaid balance

After deployment and restart, open **Part Payments → Clear Balance**. CEO, hotel manager and hotel receptionist can waive the remaining balance with a required reason of 5–1000 characters. Use **Complete Payment** instead when money was actually received.

Clearance is a booking discount/write-off, not a payment. It reduces the booking and ledger totals to the amount already received, zeros the outstanding balance, and retains actual payment history. The original amount, amount waived, reason, actor and date are saved separately. Booking/ledger discrepancies must be reviewed before clearing; repeated clearing of a settled balance is rejected.

CEO and manager see the latest 100 clearances below the Part Payments table. The full activity history can also be searched/filtered by `balance_clearance` in Activity Logs. Startup automatically creates the `balance_clearances` table. No manual SQL is required.
