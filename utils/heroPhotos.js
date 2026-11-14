'use strict';
const {allowedUrl}=require('./publicPhoto');
module.exports=function heroPhotos(categories=[],gallery=[]){
 const photos=[],seen=new Set();
 const add=photo=>{if(photos.length<8&&allowedUrl(photo.url)&&!seen.has(photo.url)){seen.add(photo.url);photos.push(photo);}};
 // Give each category a slide before filling in its additional room photos.
 categories.forEach(category=>{const url=(category.picture||[]).find(allowedUrl);if(url)add({url,title:category.category_name||'Vistavilla Apartments',href:'/rooms?id='+encodeURIComponent(category._id)});});
 categories.forEach(category=>(category.picture||[]).forEach(url=>add({url,title:category.category_name||'Vistavilla Apartments',href:'/rooms?id='+encodeURIComponent(category._id)})));
 gallery.forEach(photo=>add({url:photo.url,title:photo.title||'Vistavilla Apartments',href:'/gallery'}));
 return photos.length?photos:[{url:'/images/most-rated.jpg',title:'Vistavilla Apartments',href:'/rooms'}];
};
