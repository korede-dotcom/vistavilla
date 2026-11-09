# Live booking pricing and discount recording

The portal booking form updates its summary when dates, nights, discount type,
discount value, caution fee or payment amount change. The summary separates the
room subtotal, discount, room total, caution deposit and remaining room balance.
The room rate comes from the server's category pricing endpoint, including the
special rate applicable on check-in. This preserves the existing policy of using
the check-in rate for the initial stay; it does not vary the original stay's rate
night by night. An extension still uses its applicable rate for each added night.

Flat discount means one fixed naira deduction from the complete room booking
subtotal. Percentage means a percentage of that same subtotal, rounded once to
integer kobo. Neither discount applies to the caution fee. For example, a
₦150,000 room subtotal with ₦5,000 flat discount becomes ₦145,000; a 10% discount
becomes ₦135,000. Discounts cannot exceed the room subtotal or 100%.

The server revalidates dates and calculates all room totals from the database
rate. It records discount_type, discount_value, discount_per_night (effective
kobo), price_subtotal and discount_total alongside the final booking amount.
Payment-provider metadata carries these normalized values too. Booking details
show the recorded discount. Existing bookings retain their prior discount data.

New bookings record discount_scope=booking. On extension, a percentage is
recalculated against the revised whole room subtotal; a flat amount remains one
fixed discount and is not applied again for each extra night. Historical bookings
keep discount_scope=night so their original discounts remain intact. Transfers
clear discounts when repricing the booking. Caution fees remain separate.

Restart after deployment: the new columns are added by the existing awaited
startup schema step. No manual SQL is necessary. Tests:
`node --test tests/booking-pricing.test.js tests/extension.test.js`.
