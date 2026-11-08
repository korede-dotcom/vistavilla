'use strict';
// Booking/ledger amounts are kobo; category rates and payment inputs are naira.
function calculate({ rate, nights, oldTotal, amountPaid, existingPartPayment, bookingStatus, bookingBalance, paidNow = 0 }) {
  if (!['string','number'].includes(typeof paidNow) || (typeof paidNow === 'string' && !/^\d+(?:\.\d{1,2})?$/.test(paidNow))) throw new Error('Invalid amount paid.');
  const rateValue = Number(rate), count = Number(nights), payment = Number(paidNow);
  if (!Number.isFinite(rateValue) || rateValue <= 0 || !Number.isInteger(count) || count < 1) throw new Error('Invalid destination rate or booking nights.');
  if (!Number.isFinite(payment) || payment < 0 || Math.abs(payment * 100 - Math.round(payment * 100)) > 0.00001) throw new Error('Amount paid must be a valid non-negative amount with at most two decimal places.');
  const total = Math.round(rateValue * 100) * count;
  let previousPaid;
  if (existingPartPayment) previousPaid = Number(existingPartPayment.amount_paid);
  else if (['success','completed'].includes(bookingStatus) && !Number(bookingBalance)) previousPaid = Number(oldTotal);
  else previousPaid = Number(amountPaid || 0);
  if (![total, previousPaid, Number(oldTotal)].every(Number.isSafeInteger) || previousPaid < 0) throw new Error('Invalid booking amounts.');
  const paid = Math.round(payment * 100);
  // A downgrade needing a refund must not silently discard the guest's credit.
  if (total < previousPaid) throw new Error('The new total is below the amount already paid. Resolve the refund before transferring.');
  if (paid > total - previousPaid) throw new Error('Amount paid exceeds the balance due for the new room.');
  return { total, previousPaid, paidNow: paid, amountPaid: previousPaid + paid, balance: total - previousPaid - paid, adjustment: total - Number(oldTotal) };
}
module.exports = calculate;
