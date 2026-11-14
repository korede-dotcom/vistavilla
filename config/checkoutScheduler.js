'use strict';
module.exports=async function checkoutScheduler(cron,release,logger=console){
 let running=false;
 const run=async()=>{if(running)return;running=true;try{await release();}catch(error){logger.error('Automatic checkout failed:',error.message);}finally{running=false;}};
 // Run every minute for retries/catch-up; the service enforces 11:59 AM Lagos.
 const task=cron.schedule('* * * * *',run,{timezone:'Africa/Lagos'});
 await run();
 return task;
};
