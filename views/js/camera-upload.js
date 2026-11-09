(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else {root.VistavillaCameraFiles=api;api.initialize(root);}
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function mergeFiles(current,incoming,options={}){
  const files=options.multiple&&options.append!==false?[...current,...incoming]:[...incoming];
  const selected=options.multiple?files:files.slice(0,1);
  if(options.maxFiles&&selected.length>options.maxFiles)throw Error('Maximum '+options.maxFiles+' photos allowed. Remove a selected file before taking another.');
  for(const file of incoming){
   if(!file.type.startsWith('image/'))throw Error('The camera must provide an image.');
   if(options.maxSize&&file.size>options.maxSize)throw Error('The photo is too large. Please choose a smaller image.');
  }
  return selected;
 }
 function initialize(win){
  const doc=win.document;if(win.vistavillaCameraReady)return;win.vistavillaCameraReady=true;
  let active=null,stream=null,generation=0,returnFocus=null;
  const dialog=doc.createElement('dialog');dialog.className='camera-upload-dialog';dialog.setAttribute('aria-labelledby','camera-upload-title');
  dialog.innerHTML='<header><div><span>VISTAVILLA</span><h2 id="camera-upload-title">Take a picture</h2></div><button type="button" data-camera-close aria-label="Close camera">×</button></header><video autoplay playsinline muted></video><p data-camera-message role="status">Allow camera access to take a photo.</p><footer><button type="button" data-camera-switch>Switch camera</button><button type="button" data-camera-capture disabled>Use picture</button></footer>';
  const video=dialog.querySelector('video'),message=dialog.querySelector('[data-camera-message]'),capture=dialog.querySelector('[data-camera-capture]');
  let facing='environment';
  function stop(){generation++;if(stream)stream.getTracks().forEach(track=>track.stop());stream=null;video.srcObject=null;capture.disabled=true;}
  function close(){stop();dialog.close();if(returnFocus&&returnFocus.isConnected)returnFocus.focus();}
  async function start(){
   stop();const request=generation;message.textContent='Opening camera…';
   try{
    const camera=await win.navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:facing},width:{ideal:1600},height:{ideal:1200}},audio:false});
    if(request!==generation||!dialog.open){camera.getTracks().forEach(track=>track.stop());return;}
    stream=camera;video.srcObject=camera;await video.play();capture.disabled=false;message.textContent='Position the document or damage in the frame, then choose Use picture.';
   }catch(error){
    if(request!==generation)return;
    stop();message.textContent=error.name==='NotAllowedError'?'Camera permission was denied. Allow camera access in your browser settings, or use the file chooser.':error.name==='NotFoundError'?'No camera was found. Use the file chooser to upload a photo.':'Unable to open the camera. Close this window and use the file chooser.';
   }
  }
  function apply(input,files,status){
   try{
    const selected=mergeFiles(Array.from(input.files||[]),files,{multiple:input.multiple,append:input.dataset.cameraAppend!=='false',maxFiles:Number(input.dataset.maxFiles||0),maxSize:Number(input.dataset.maxFileSize||0)});
    const transfer=new win.DataTransfer();selected.forEach(file=>transfer.items.add(file));input.files=transfer.files;
    input.dispatchEvent(new win.Event('change',{bubbles:true}));input.dispatchEvent(new win.Event('input',{bubbles:true}));
    status.textContent='Photo added. '+selected.length+' file(s) selected. Submit the form to save.';return true;
   }catch(error){status.textContent=error.message||'Unable to attach the photo. Use the file chooser.';return false;}
  }
  dialog.querySelector('[data-camera-close]').addEventListener('click',close);
  dialog.addEventListener('cancel',()=>stop());dialog.addEventListener('close',stop);
  dialog.querySelector('[data-camera-switch]').addEventListener('click',()=>{facing=facing==='environment'?'user':'environment';start();});
  capture.addEventListener('click',async()=>{
   if(!active||!video.videoWidth||!video.videoHeight)return;
   const session=generation,target=active;
   capture.disabled=true;
   const canvas=doc.createElement('canvas'),scale=Math.min(1,1600/video.videoWidth);
   canvas.width=Math.round(video.videoWidth*scale);canvas.height=Math.round(video.videoHeight*scale);
   canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.88));
   if(!dialog.open||generation!==session||active!==target)return;
   if(!blob){message.textContent='Unable to capture a picture. Try again.';capture.disabled=false;return;}
   const file=new win.File([blob],'vistavilla-photo-'+Date.now()+'.jpg',{type:'image/jpeg',lastModified:Date.now()});
   if(apply(target.input,[file],target.status))close();else message.textContent=target.status.textContent;
   if(dialog.open)capture.disabled=false;
  });
  function scan(){
   doc.querySelectorAll('input[type="file"]:not([data-camera-source])').forEach(input=>{
    if(input.dataset.cameraEnhanced||input.disabled)return;
    const accept=(input.accept||'').toLowerCase();
    if(accept&&!/image\/|\.(?:jpg|jpeg|png|webp|gif|heic|heif)/.test(accept))return;
    input.dataset.cameraEnhanced='true';
    const controls=doc.createElement('div');controls.className='camera-upload-controls';
    const button=doc.createElement('button');button.type='button';button.className='camera-upload-button';button.textContent='Take Picture';
    const status=doc.createElement('small');status.setAttribute('role','status');controls.append(button,status);
    const native=doc.createElement('input');native.type='file';native.accept='image/*';native.setAttribute('capture','environment');native.dataset.cameraSource='true';native.hidden=true;controls.append(native);
    const anchor=input.closest('.custom-file')||input;anchor.insertAdjacentElement('afterend',controls);
    native.addEventListener('change',()=>{if(native.files&&native.files.length)apply(input,Array.from(native.files),status);native.value='';});
    button.addEventListener('click',event=>{
     event.stopPropagation();
     returnFocus=button;
     const mobile=/Android|iPhone|iPad|iPod/i.test(win.navigator.userAgent)||(win.navigator.maxTouchPoints>1&&/Mac/i.test(win.navigator.platform));
     if(mobile||typeof dialog.showModal!=='function'||!win.navigator.mediaDevices||!win.navigator.mediaDevices.getUserMedia||!win.isSecureContext){native.click();return;}
     active={input,status};facing='environment';dialog.showModal();start();
    });
   });
  }
  function ready(){doc.body.appendChild(dialog);scan();new win.MutationObserver(scan).observe(doc.body,{childList:true,subtree:true});}
  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
  win.addEventListener('pagehide',stop);
  doc.addEventListener('visibilitychange',()=>{if(doc.hidden&&dialog.open)close();});
 }
 return {mergeFiles,initialize};
});
