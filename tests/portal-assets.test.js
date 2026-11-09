'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),ejs=require('ejs');
test('shared portal assets use absolute paths on nested booking edit URLs',()=>{
 const base='https://example.com/portal/edit-booking/BOOK123';
 for(const partial of ['header','footer']){
  const filename=`views/portal/partial/${partial}.ejs`;
  const html=ejs.render(fs.readFileSync(filename,'utf8'),{title:'Edit Booking',roleName:'hotel receptionist',name:'Reception',email:'r@example.com'},{filename});
  assert.ok(!/(?:src|href)=["'](?:\.\/|\.\.\/)*assets\//.test(html));
  const assets=[...html.matchAll(/(?:src|href)=["'](\/portal\/assets\/[^"']+)["']/g)].map(match=>match[1]);
  assert.ok(assets.length>0);
  for(const asset of assets){
   assert.equal(new URL(asset,base).pathname,asset);
   if(/(?:bootstrap\.min\.css|css\/style\.css|jquery-3\.5\.1\.min\.js|js\/script\.js)$/.test(asset))assert.ok(fs.existsSync(path.join('views',asset)),asset);
  }
 }
});
test('portal templates contain no page-relative assets that break nested routes',()=>{
 let count=0;
 function scan(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  const filename=path.join(dir,entry.name);
  if(entry.isDirectory())scan(filename);
  else if(filename.endsWith('.ejs')){
   const source=fs.readFileSync(filename,'utf8');
   assert.ok(!/(?:src|href|poster)\s*=\s*["'](?:\.\/|\.\.\/)*assets\//.test(source),filename);
   ejs.compile(source,{filename});count++;
  }
 }}
 scan('views/portal');assert.ok(count>30);
});
