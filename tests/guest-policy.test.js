'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),ejs=require('ejs');
function stub(name,exports){const filename=require.resolve(name);require.cache[filename]={id:filename,filename,loaded:true,exports};}
let price='150000.50';
stub('../models/Room',{findAll:async()=>[{_id:1,category_name:'1 Bed',price,number_of_guests:2},{_id:2,category_name:'2 Bed',price:'200000',number_of_guests:4}]});
stub('../repos/PricingConfig-repo',{findActive:async()=>[{category_id:2,special_price:'180000'}]});
const policy=require('../services/guestPolicy');
test('guest policy uses current category capacity, live prices and active special rates',async()=>{
 let rows=await policy();assert.equal(rows[0].price,150000.5);assert.equal(rows[0].capacity,2);assert.equal(rows[1].price,180000);
 price='160000';rows=await policy();assert.equal(rows[0].price,160000);
});
test('guest policy renders actual amounts and escapes category names without old gathering prices',()=>{
 const template=fs.readFileSync('views/terms.ejs','utf8');
 const section=template.slice(template.indexOf('<h2>Guest Policy</h2>'),template.indexOf('<h2>Damages</h2>'));
 const html=ejs.render(section,{guestPolicy:[{name:'1 Bed <script>',capacity:2,price:150000.5}]});
 assert.match(html,/150,000.5/);assert.match(html,/2 guests/);assert.ok(!html.includes('<script>'));assert.ok(!html.includes('#60,000'));assert.ok(!html.includes('#120,000'));
 assert.match(ejs.render(section,{guestPolicy:[]}),/contact us for current room prices/);
});
