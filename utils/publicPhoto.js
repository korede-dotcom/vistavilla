'use strict';
function folder(){const value=(process.env.GALLERY_FOLDER||'images').replace(/^\/+|\/+$/g,'');if(!/^[a-zA-Z0-9_/-]+$/.test(value)||['ids','damages'].includes(value.split('/')[0]))throw Error('Choose a public images gallery folder.');return value;}
function allowedId(id){return typeof id==='string'&&id.startsWith(folder()+'/')&&!id.split('/').some(part=>['ids','damages'].includes(part));}
function allowedUrl(url){
 try{const parsed=new URL(url);const parts=decodeURIComponent(parsed.pathname).split('/');return parsed.protocol==='https:'&&parsed.hostname==='res.cloudinary.com'&&parts.includes('upload')&&!parts.some(part=>['ids','damages'].includes(part))&&parsed.pathname.includes('/'+folder()+'/');}catch(_){return false;}
}
module.exports={folder,allowedId,allowedUrl};
