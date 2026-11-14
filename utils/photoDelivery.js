'use strict';
module.exports=function photoDelivery(url,width){
 try{
  const parsed=new URL(url);if(parsed.protocol!=='https:'||parsed.hostname!=='res.cloudinary.com')return url;
  const marker='/image/upload/',index=parsed.pathname.indexOf(marker);if(index<0)return url;
  const tail=parsed.pathname.slice(index+marker.length),version=tail.match(/(?:^|\/)(v\d+\/.*)$/);
  const original=version?version[1]:tail;
  // Versioned URLs allow existing thumbnail transforms to be replaced with a full-size delivery.
  if(!version&&original.split('/')[0].includes(','))return url;
  parsed.pathname=parsed.pathname.slice(0,index)+marker+'f_auto,q_auto:best,c_limit,w_'+width+'/'+original;
  return parsed.toString();
 }catch(error){return url;}
};
