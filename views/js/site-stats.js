'use strict';
// Display actual totals directly; never animate a valid count down to zero.
async function refreshSiteStats(){
 try {
  const response=await fetch('/api/site-stats',{cache:'no-store',headers:{Accept:'application/json'}});
  if(!response.ok)return;
  const result=await response.json();
  if(!result.status||!result.data)return;
  for(const key of ['totalBookings','totalRooms']){
   const value=result.data[key];
   if(!Number.isSafeInteger(value)||value<0)continue;
   document.querySelectorAll('[data-stat="'+key+'"]').forEach(element=>{element.dataset.count=String(value);element.textContent=String(value);});
  }
 }catch(error){/* Keep the server-rendered totals when offline. */}
}
refreshSiteStats();
window.addEventListener('pageshow',event=>{if(event.persisted)refreshSiteStats();});
