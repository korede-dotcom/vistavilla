'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),ejs=require('ejs');
const {mergeFiles}=require('../views/js/camera-upload');
const photo=name=>({name,type:'image/jpeg',size:1000});
test('camera photos append to multiple uploads and replace single-file selections',()=>{
 const original=photo('original.jpg'),captured=photo('camera.jpg');
 assert.deepEqual(mergeFiles([original],[captured],{multiple:true}),[original,captured]);
 assert.deepEqual(mergeFiles([original],[captured],{multiple:false}),[captured]);
 assert.deepEqual(mergeFiles([original],[captured],{multiple:true,append:false}),[captured]);
});
test('camera input enforces count and size limits without modifying existing files',()=>{
 const selected=Array.from({length:5},(_,i)=>photo(i+'.jpg'));
 assert.throws(()=>mergeFiles(selected,[photo('new.jpg')],{multiple:true,maxFiles:5}),/Maximum 5/);
 assert.equal(selected.length,5);
 assert.throws(()=>mergeFiles([],[{name:'large.jpg',type:'image/jpeg',size:11000000}],{maxSize:10485760}),/too large/);
 assert.throws(()=>mergeFiles([],[{name:'file.pdf',type:'application/pdf',size:1000}]),/image/);
});
test('portal shared and standalone heads load camera controls and target forms retain upload fields',()=>{
 function scan(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  const filename=path.join(dir,entry.name);if(entry.isDirectory())scan(filename);else if(filename.endsWith('.ejs')){
   const source=fs.readFileSync(filename,'utf8');if(!source.includes('<head>'))continue;
   assert.ok(source.includes('/js/camera-upload.js?v=1'),filename);assert.ok(source.includes('/css/camera-upload.css?v=1'),filename);ejs.compile(source,{filename});
  }
 }}scan('views/portal');
 const damages=fs.readFileSync('views/portal/damages.ejs','utf8');assert.ok(damages.includes('data-max-files="5"'));
 const booking=fs.readFileSync('views/portal/add-booking-category.ejs','utf8');assert.ok(booking.includes('id="id_card" data-max-file-size="10485760"'));
 const editing=fs.readFileSync('views/portal/edit-room-category.ejs','utf8');assert.ok(editing.includes('id="imageInput" data-camera-append="false"'));
});
