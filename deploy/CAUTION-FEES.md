# Caution fees

Caution fees are recorded manually from **Caution Fees → Record caution fee
manually**, using the customer's booking reference and actual amount received.
Booking Details also has a **Record Caution Fee** shortcut for bookings without a
fee. Booking creation does not show, prefill or record deposits, and the server
strips any legacy or forged caution-fee fields from booking requests.

The editable suggested amount only prefills the separate manual collection form;
it never collects money or attaches fees to bookings automatically. Existing fees
are retained. Duplicate collection for the same booking is rejected, including
fees previously refunded, so historical deposit/refund records are not overwritten.

**Caution Fees** in the portal lists paid customers, booking reference, current
room, fee, status, collection staff and timestamps. Paid and On Hold amounts count
in **Caution money currently held**. Mark Refunded records a full refund already
returned to the customer and subtracts the fee from that total. A held fee may
later be refunded. Repeated refunds and changing a refunded fee back to held are
rejected. No bank transfer or provider refund is triggered by this bookkeeping
action. Gross collected and total refunded are displayed separately for clarity.

The dashboard has a **Caution Fees Held** card linking to the list. Staff access
is limited to CEO, hotel manager and hotel receptionist roles; status forms are
protected against forged submissions. Changes are locked and transactional.

Deploy and restart Node. The existing startup schema setup creates the eight
new booking columns automatically before serving requests. Existing bookings
receive a zero fee / none status. Database CREATE/ALTER permissions are required.
No manual SQL or re-entry of old bookings is required. Prior cash deposits not
recorded in this app are not automatically imported.

Run `node --test tests/caution-fees.test.js tests/startup-schema.test.js`.
Live database and browser verification remain deployment checks.
