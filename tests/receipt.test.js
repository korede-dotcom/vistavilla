'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),ejs=require('ejs');
const booking={reference_id:'VV123',guest_name:'Jane <script>',guest_email:'guest@example.com',guest_phone:'08000000000',start:'2026-11-10T12:00:00Z',end:'2026-11-13T12:00:00Z',night:3,amount:13500000,amount_paid:5000000,balance:8500000,status:'part-payment',price_subtotal:15000000,discount_total:1500000,discount_type:'percentage',discount_value:10,room_name:'City Suite',room_number:'201',guest_count:2,caution_fee_amount:2000000,caution_fee_status:'hold'};
function render(name,data){const filename=`views/${name}.ejs`;return ejs.render(fs.readFileSync(filename,'utf8'),{booking:data},{filename});}
test('receipt shows actual room payments, discount and separate caution fee in naira',()=>{
 const html=render('success',booking);
 assert.ok(html.includes('Part paid'));for(const amount of ['135,000','150,000','50,000','85,000','20,000'])assert.ok(html.includes(amount),amount);
 assert.ok(html.includes('Jane &lt;script&gt;'));assert.ok(!html.includes('btw-cdn.com'));assert.ok(!html.includes('window.onload'));
 assert.ok(html.includes('Download receipt'));assert.ok(html.includes('Print / Save PDF'));
});
test('legacy fully paid receipts infer payments while pending verification never claims success',()=>{
 const paid=render('success',{...booking,status:'success',balance:0,amount_paid:0});assert.ok(paid.includes('Paid in full'));
 const pending=render('failed',{...booking,status:'pending',balance:13500000,amount_paid:0});assert.ok(pending.includes('Verification pending'));assert.ok(!pending.includes('Paid in full'));
});
test('room downgrade credits and refunded caution fees are explicitly identified',()=>{
 const html=render('success',{...booking,status:'success',balance:0,amount_paid:15000000,caution_fee_status:'refunded'});
 assert.ok(html.includes('Guest credit owed'));assert.ok(html.includes('15,000'));assert.ok(html.includes('Refunded'));
});
