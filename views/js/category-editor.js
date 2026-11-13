'use strict';
let categoryRequest=0;
async function openCategoryEditor(id) {
 const request=++categoryRequest;
 const form=document.getElementById('categoryEditorForm'),button=document.getElementById('saveCategory'),message=document.getElementById('categoryEditorMessage');
 form.reset();document.getElementById('categoryPhotoGallery').replaceChildren();document.getElementById('uploadCategoryPhotos').disabled=true;form.dataset.id=id;form.dataset.csrf='';button.disabled=true;
 message.textContent='Loading category…';$('#categoryEditorModal').modal('show');
 try {
  const response=await fetch('/portal/category-editor/'+encodeURIComponent(id),{cache:'no-store'});
  const result=await window.portalResponseJSON(response);if(request!==categoryRequest)return;
  if(!response.ok||!result.status)throw Error(result.message||'Unable to load category.');
  const {category,csrf}=result.data;
  Array.from(form.elements).filter(element=>element.name).forEach(element=>{
   if(element.type==='checkbox')element.checked=Boolean(category[element.name]);
   else element.value=category[element.name]??'';
  });
  form.dataset.csrf=csrf;message.textContent='';button.disabled=false;renderCategoryPhotos(category.picture||[]);document.getElementById('uploadCategoryPhotos').disabled=false;
 }catch(error){if(request===categoryRequest)message.textContent=error.message;}
}
document.getElementById('categoryEditorForm').addEventListener('submit',async function(event){
 event.preventDefault();const button=document.getElementById('saveCategory'),message=document.getElementById('categoryEditorMessage');
 const body={csrf:this.dataset.csrf};Array.from(this.elements).filter(element=>element.name).forEach(element=>{body[element.name]=element.type==='checkbox'?element.checked:element.value;});
 button.disabled=true;message.textContent='Saving…';
 try {
  const response=await fetch('/portal/category-editor/'+encodeURIComponent(this.dataset.id),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const result=await window.portalResponseJSON(response);if(!response.ok||!result.status)throw Error(result.message||'Unable to save category.');
  window.location.reload();
 }catch(error){message.textContent=error.message;button.disabled=false;}
});

function renderCategoryPhotos(pictures) {
 const gallery=document.getElementById('categoryPhotoGallery');gallery.replaceChildren();
 pictures.forEach(url=>{
  const card=document.createElement('div');card.className='col-6 col-md-4 mb-3';
  const image=document.createElement('img');image.src=url;image.alt='Category photo';image.className='img-fluid rounded';image.style.cssText='width:100%;height:120px;object-fit:cover';
  const remove=document.createElement('button');remove.type='button';remove.className='btn btn-sm btn-outline-danger mt-2';remove.textContent='Remove from category';
  remove.onclick=async()=>{remove.disabled=true;await categoryPhotoAction('DELETE',JSON.stringify({url}),{'Content-Type':'application/json'});remove.disabled=false;};
  card.append(image,remove);gallery.append(card);
 });
 if(!pictures.length)gallery.textContent='No category photos yet.';
}
async function categoryPhotoAction(method,body,headers={}) {
 const form=document.getElementById('categoryEditorForm'),id=form.dataset.id,request=categoryRequest,message=document.getElementById('categoryEditorMessage');
 message.textContent='Saving photos…';
 try {
  const response=await fetch('/portal/category-editor/'+encodeURIComponent(id)+'/photos',{method,headers:{...headers,'X-CSRF-Token':form.dataset.csrf},body});
  const result=await window.portalResponseJSON(response);if(request!==categoryRequest)return;
  if(!response.ok||!result.status)throw Error(result.message||'Unable to save category photos.');
  renderCategoryPhotos(result.data.picture);message.textContent=result.message;
  document.getElementById('categoryPhotoUpload').value='';
 }catch(error){if(request===categoryRequest)message.textContent=error.message;}
}
document.getElementById('uploadCategoryPhotos').addEventListener('click',async function(){
 const files=document.getElementById('categoryPhotoUpload').files,message=document.getElementById('categoryEditorMessage');
 if(!files.length||files.length>10||Array.from(files).some(file=>file.size>10485760)){message.textContent='Choose 1–10 photos, no larger than 10 MB each.';return;}
 const body=new FormData();Array.from(files).forEach(file=>body.append('image',file));
 this.disabled=true;await categoryPhotoAction('POST',body);this.disabled=false;
});
