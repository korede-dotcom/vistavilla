'use strict';
(function(){
 const receipt=document.getElementById('receiptDocument'),button=document.getElementById('downloadReceipt'),status=document.getElementById('receiptDownloadStatus');
 document.getElementById('printReceipt').addEventListener('click',()=>window.print());
 button.addEventListener('click',async()=>{
  button.disabled=true;status.textContent='Preparing your high-resolution receipt…';
  try{
   if(typeof html2canvas!=='function')throw Error('Image download is unavailable. Use Print / Save PDF instead.');
   if(document.fonts&&document.fonts.ready)await document.fonts.ready;
   await Promise.all(Array.from(receipt.querySelectorAll('img')).map(image=>image.decode?image.decode():Promise.resolve()));
   const canvas=await html2canvas(receipt,{scale:2,width:760,backgroundColor:'#fffdf8',useCORS:true,windowWidth:1100,
    onclone:doc=>{doc.documentElement.classList.add('receipt-export');doc.getElementById('receiptDocument').style.width='760px';}
   });
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
   if(!blob)throw Error('Unable to prepare receipt image. Use Print / Save PDF instead.');
   const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='Vistavilla-Receipt-'+receipt.dataset.reference.replace(/[^a-zA-Z0-9_-]/g,'')+'.png';
   document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);status.textContent='Your receipt is ready. Check your downloads.';
  }catch(error){status.textContent=error.message;}finally{button.disabled=false;}
 });
})();
