'use strict';
function amountInKobo(value = '0') {
  if (!['string','number'].includes(typeof value) || !/^\d+(?:\.\d{1,2})?$/.test(String(value))) throw new Error('Caution fee must be a non-negative amount with at most two decimal places.');
  const amount = Math.round(Number(value) * 100);
  if (!Number.isSafeInteger(amount)) throw new Error('Caution fee is too large.');
  return amount;
}
function nextStatus(current, action) {
  if (!['hold','refund'].includes(action)) throw new Error('Choose Hold or Refund.');
  if (!['paid','hold'].includes(current)) throw new Error('This caution fee has already been refunded or was not collected.');
  if (current === 'hold' && action === 'hold') throw new Error('This caution fee is already on hold.');
  return action === 'refund' ? 'refunded' : 'hold';
}
function withoutBookingFee(input) {
 const result={...input};
 for(const key of Object.keys(result))if(key==='caution_fee'||key.startsWith('caution_fee_'))delete result[key];
 return result;
}
module.exports = { amountInKobo, nextStatus, withoutBookingFee };
