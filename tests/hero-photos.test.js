'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const build=require('../utils/heroPhotos');
const url=name=>'https://res.cloudinary.com/villa/image/upload/images/'+name+'.jpg';
test('hero gives each category a slide and includes its additional room photos without duplicates',()=>{
 const slides=build([{_id:1,category_name:'One bed',picture:[url('one'),url('room101')]},{_id:2,category_name:'Two bed',picture:[url('two')]}],[{url:url('one')},{url:url('pool'),title:'Pool'}]);
 assert.deepEqual(slides.map(slide=>slide.url),[url('one'),url('two'),url('room101'),url('pool')]);
 assert.equal(slides[1].title,'Two bed');assert.equal(slides[1].href,'/rooms?id=2');
});
test('hero is capped at eight approved images and always has a visible fallback',()=>{
 assert.equal(build([])[0].url,'/images/most-rated.jpg');
 const privateUrl='https://res.cloudinary.com/villa/image/upload/ids/customer.jpg';
 assert.equal(build([{picture:[privateUrl]}])[0].url,'/images/most-rated.jpg');
 assert.equal(build([],Array.from({length:20},(_,i)=>({url:url(String(i))}))).length,8);
});
