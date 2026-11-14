'use strict';
// Keep server HTML and parser internals out of user-facing modal messages.
window.portalResponseJSON=async function(response,options={}){
 const sessionExpired=(!options.authentication&&response.status===401)||(response.redirected&&/\/portal\/?(?:\?|$)|\/login(?:\?|$)/.test(response.url||''));
 if(sessionExpired)throw Error('Your session has expired. Sign in again, then retry this action.');
 if(response.status===403&&!options.authentication)throw Error('You do not have permission for this action, or the form has expired. Refresh the page and try again.');
 const fallback=response.status===404?'This action is unavailable. Refresh the page and try again.':response.status===413?'The selected files are too large. Choose smaller files and try again.':response.status>=500?'The server could not complete this action. Please try again shortly.':'Unable to complete this action. Refresh the page and try again.';
 let body;
 try{body=await response.text();}catch(error){throw Error('Unable to connect to the server. Check your connection and try again.');}
 if(!body||/^\s*</.test(body))throw Error(fallback);
 let result;try{result=JSON.parse(body);}catch(error){throw Error(fallback);}
 if(!result||typeof result!=='object')throw Error(fallback);
 return result;
};
