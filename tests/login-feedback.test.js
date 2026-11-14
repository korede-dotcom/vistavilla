'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('vm'),fs=require('fs');
async function run(status,body,reject=false){
 const messages=[],timers=[],elements={email:{value:'staff@example.com'},password:{value:'wrong'},loginBtn:{},loginForm:{addEventListener(type,fn){this.submit=fn;}}};
 const context={window:{location:{}},document:{getElementById:id=>elements[id],querySelectorAll:()=>[]},console:{error(){}},setTimeout:fn=>timers.push(fn),Toastify:options=>({showToast(){messages.push(options.text);}}),fetch:async()=>{if(reject)throw new TypeError('Failed to fetch');return {status,text:async()=>JSON.stringify(body)};}};
 vm.createContext(context);vm.runInContext(fs.readFileSync('views/js/portal-response.js','utf8'),context);
 const source=fs.readFileSync('views/portal/login.ejs','utf8');
 const script=[...source.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].find(match=>match[1].includes("getElementById('loginForm')"))[1];
 vm.runInContext(script,context);elements.loginForm.submit({preventDefault(){}});await new Promise(resolve=>setImmediate(resolve));
 return {messages,timers,context,button:elements.loginBtn};
}
test('invalid login credentials show the server message and restore the sign-in button',async()=>{
 const result=await run(401,{data:{status:false,message:'Incorrect email or password'}});
 assert.deepEqual(result.messages,['Incorrect email or password']);assert.equal(result.timers.length,0);assert.equal(result.button.disabled,false);
});
test('first login still redirects to password setup, while real connection failures show connectivity feedback',async()=>{
 let result=await run(401,{data:{status:false,message:'Change your password',errorCode:'01',user_id:'staff'}});
 assert.deepEqual(result.messages,['Change your password']);result.timers[0]();assert.equal(result.context.window.location.href,'/portal/first-time?id=staff');
 result=await run(0,null,true);assert.match(result.messages[0],/check your connection/);
});
