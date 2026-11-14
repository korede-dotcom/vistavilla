'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),ejs=require('ejs'),express=require('express');
const paused=require('../middleware/onlinePaymentsPaused'),delivery=require('../utils/photoDelivery');
test('public online booking stops before any payment or booking writes and returns WhatsApp contact details',async()=>{
 let gatewayCalled=false;
 const router=express.Router();router.post('/initialize',paused,()=>{gatewayCalled=true;});
 const result=await new Promise((resolve,reject)=>{
  const req={method:'POST',url:'/initialize',headers:{}};
  const res={statusCode:200,status(code){this.statusCode=code;return this;},json(body){resolve({http:this.statusCode,body});}};
  router.handle(req,res,error=>reject(error||Error('No response')));
 });
 assert.equal(result.http,503);assert.equal(gatewayCalled,false);assert.equal(result.body.phone,'09117777221');
 assert.equal(result.body.whatsapp,'https://wa.me/2349117777221');assert.match(result.body.message,/coming soon/);
});
test('public room booking replaces payment collection with WhatsApp, while reception route remains available',()=>{
 const template=fs.readFileSync('views/room-details.ejs','utf8');ejs.compile(template);
 assert.ok(template.includes('Book via WhatsApp'));assert.ok(template.includes('https://wa.me/2349117777221?text='));
 assert.ok(!template.includes('/payments/paystack/initialize'));assert.ok(!template.includes('Secure payment via Paystack'));
 const routes=fs.readFileSync('routes/Paystack.js','utf8');
 assert.ok(routes.includes("'/paystack/initialize', require('../middleware/onlinePaymentsPaused')"));
 assert.ok(routes.includes("'/paystack/initialize/reception', checkAuthCookie, cloudinaryRepo.idsParser"));
});
test('hero delivery uses large high-quality responsive images instead of thumbnail transformations',()=>{
 const original='https://res.cloudinary.com/villa/image/upload/c_fill,w_300,q_30/v123/images/rooms/photo.jpg';
 const url=delivery(original,2560);
 assert.ok(url.includes('f_auto,q_auto:best,c_limit,w_2560/v123/images/rooms/photo.jpg'));
 assert.ok(!url.includes('w_300'));assert.equal(delivery('/images/most-rated.jpg',3840),'/images/most-rated.jpg');
});
