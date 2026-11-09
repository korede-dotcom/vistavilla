'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const config=require('../config/mail');
test('custom mailbox uses authenticated sender and STARTTLS; old Gmail settings are ignored',()=>{
 const c=config({SMTP_PASSWORD:'test-only',smtp_host:'smtp.gmail.com',smtp_user:'old@example.com'});
 assert.equal(c.transport.host,'mail.privateemail.com');assert.equal(c.transport.auth.user,'contact@vistavillaapartments.org');assert.equal(c.from.address,c.transport.auth.user);assert.equal(c.transport.requireTLS,true);assert.equal(c.transport.secure,false);
 assert.equal(config({SMTP_PASSWORD:'test-only',SMTP_PORT:'465'}).transport.secure,true);
 assert.throws(()=>config({smtp_pass:'old'}),/SMTP_PASSWORD/);
});
let options,message,closed=0;
const filename=require.resolve('nodemailer');require.cache[filename]={id:filename,filename,loaded:true,exports:{createTransport(o){options=o;return {sendMail:async m=>{message=m;return {messageId:'test'};},close(){closed++;}};}}};
process.env.SMTP_PASSWORD='test-only';
const send=require('../utils/sendEmail');
test('system mail preserves recipient and uses visitor only as reply-to',async()=>{
 await send('Contact','Hello','<p>Hello</p>','contact@vistavillaapartments.org',{replyTo:'visitor@example.com'});
 assert.equal(message.from.address,options.auth.user);assert.equal(message.replyTo,'visitor@example.com');assert.equal(message.to,'contact@vistavillaapartments.org');assert.equal(closed,1);
});
