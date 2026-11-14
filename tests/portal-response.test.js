'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('vm'),fs=require('fs');
const context={window:{}};vm.runInNewContext(fs.readFileSync('views/js/portal-response.js','utf8'),context);
const parse=context.window.portalResponseJSON;
const response=(body,status=200,extra={})=>({status,url:'https://example.com/portal/action',text:async()=>body,...extra});
test('modal responses preserve valid JSON while hiding HTML and parser errors',async()=>{
 assert.equal((await parse(response('{"status":true,"data":{"id":2}}'))).data.id,2);
 assert.equal((await parse(response('{"status":false,"message":"Room is unavailable"}',400))).message,'Room is unavailable');
 for(const body of ['<!DOCTYPE html><html>Private server details</html>','broken JSON','']) {
  await assert.rejects(parse(response(body)),error=>!error.message.includes('Unexpected token')&&!error.message.includes('Private server details')&&error.message.includes('Refresh'));
 }
});
test('modals explain expired sessions, missing routes, large uploads and server errors',async()=>{
 await assert.rejects(parse(response('<html>',200,{redirected:true,url:'https://example.com/portal'})),/Sign in again/);
 await assert.rejects(parse(response('',401)),/session has expired/);
 await assert.rejects(parse(response('',403)),/permission/);
 await assert.rejects(parse(response('<html>',404)),/unavailable/);
 await assert.rejects(parse(response('<html>',413)),/files are too large/);
 await assert.rejects(parse(response('<html>',502)),/try again shortly/);
});

test('login can read invalid-credential and first-login JSON on HTTP 401 without treating them as expired sessions',async()=>{
 const invalid=await parse(response('{"data":{"status":false,"message":"Incorrect email or password"}}',401),{authentication:true});
 assert.equal(invalid.data.message,'Incorrect email or password');
 const first=await parse(response('{"data":{"status":false,"errorCode":"01","user_id":"staff"}}',401),{authentication:true});
 assert.equal(first.data.errorCode,'01');
 await assert.rejects(parse(response('<!DOCTYPE html>',502),{authentication:true}),/server could not complete/);
});
