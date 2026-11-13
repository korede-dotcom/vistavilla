'use strict';
document.querySelectorAll('.transfer-payment-panel').forEach(panel => {
  const select = document.getElementById(panel.dataset.roomSelect);
  const confirm = document.getElementById(panel.dataset.confirm);
  const paid = panel.querySelector('input');
  const output = panel.querySelector('[data-transfer-quote]');
  let quote = null;
  let revision = 0;
  const money = value => (value / 100).toLocaleString('en-NG', { style: 'currency', currency: 'NGN' });
  function display() {
    if (!quote) return;
    const amount = Math.round(Number(paid.value) * 100);
    const due = Math.max(0, quote.total - quote.previousPaid);
    paid.max = (due / 100).toFixed(2);
    confirm.disabled = !paid.checkValidity() || !Number.isFinite(amount) || amount < 0 || amount > due;
    output.textContent = (quote.sameCategory ? 'Same-category move: no new payment required. Existing booking price and any outstanding balance are retained. ' : '') + `Booking rate: ${money(quote.rate * 100)} × ${quote.nights} night(s). Total: ${money(quote.total)}. Price adjustment: ${money(quote.adjustment)}. Already paid: ${money(quote.previousPaid)}. Balance after payment: ${money(due - (Number.isFinite(amount) ? amount : 0))}. Guest credit owed: ${money(quote.credit || 0)}.`;
  }
  select.addEventListener('change', async () => {
    const request = ++revision;
    quote = null;
    confirm.disabled = true;
    if (!select.value) { output.textContent = 'Select a destination room.'; return; }
    output.textContent = 'Calculating new room price…';
    try {
      const params = new URLSearchParams({ reference_id: panel.dataset.reference, old_room_id: panel.dataset.oldRoom, new_room_id: select.value });
      const response = await fetch('/portal/transfer-room-quote?' + params, { cache: 'no-store' });
      const result = await window.portalResponseJSON(response);
      if (request !== revision) return;
      if (!response.ok || !result.status) throw Error(result.message || 'Unable to calculate price.');
      quote = result.data;
      display();
    } catch (error) { if (request === revision) output.textContent = error.message; }
  });
  paid.addEventListener('input', display);
});
