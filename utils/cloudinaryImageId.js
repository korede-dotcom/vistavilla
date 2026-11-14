'use strict';
// Read the original public ID, retaining folders and removing delivery versions/transforms.
module.exports=function imageId(value){
 try{
  const url=new URL(value);
  if(url.protocol!=='https:'||url.hostname!=='res.cloudinary.com')return null;
  const parts=decodeURIComponent(url.pathname).split('/').filter(Boolean);
  if(process.env.cloud_name&&parts[0]!==process.env.cloud_name)return null;
  if(parts[1]!=='image'||parts[2]!=='upload')return null;
  let tail=parts.slice(3);const version=tail.findIndex(part=>/^v\d+$/.test(part));
  if(version>=0)tail=tail.slice(version+1);
  if(!tail.length||tail.some(part=>['ids','damages','.','..'].includes(part)))return null;
  const id=tail.join('/').replace(/\.[a-zA-Z0-9]+$/,'');
  const roots=[require('./publicPhoto').folder(),process.env.folder_name].filter(Boolean);
  return roots.some(root=>id.startsWith(root.replace(/\/$/,'')+'/'))?id:null;
 }catch(error){return null;}
};
