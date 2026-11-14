'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
process.env.GALLERY_FOLDER='images';process.env.folder_name='legacy';
const imageId=require('../utils/cloudinaryImageId');
const cloud=process.env.cloud_name||'villa';
const url=id=>'https://res.cloudinary.com/'+cloud+'/image/upload/v123/'+id+'.jpg';
test('Cloudinary public IDs retain folders and strip transformations and versions safely',()=>{
 assert.equal(imageId(url('images/categories/2/photo')),'images/categories/2/photo');
 assert.equal(imageId(url('images/categories/2/photo').replace('/v123/','/c_fill,w_100/v123/')),'images/categories/2/photo');
 assert.equal(imageId(url('legacy/photo')),'legacy/photo');
 for(const id of ['ids/customer','damages/window','images/ids/customer'])assert.equal(imageId(url(id)),null);
 assert.equal(imageId('https://other.example/images/photo.jpg'),null);
});
let destroyed,updates=[],removed,invalidated,failed=false;
const transaction={LOCK:{UPDATE:'UPDATE'}};
function stub(name,exports){const filename=require.resolve(name);require.cache[filename]={id:filename,filename,loaded:true,exports};}
stub('../config/connectDB',{transaction:async fn=>fn(transaction)});
stub('../models/Room',{findAll:async()=>[
 {picture:[url('images/shared'),url('images/keep')],update:async(data,options)=>{assert.equal(options.transaction,transaction);updates.push(data);}},
 {picture:[url('images/shared').replace('/v123/','/c_fill,w_100/v123/')],update:async data=>updates.push(data)}
]});
stub('../models/Images',{destroy:async options=>{assert.equal(options.transaction,transaction);removed=options.where;}});
stub('../repos/cloudinary',{delete:async id=>{destroyed=id;if(failed)throw Error('Cloudinary unavailable');return {result:'ok'};}});
stub('../services/publicPhotos',{invalidate:id=>{invalidated=id;}});
const remove=require('../services/deletePublicPhoto');
test('deleting a shared photo removes all room/category references and invalidates the public gallery',async()=>{
 await remove(url('images/shared'),'images/shared');
 assert.equal(destroyed,'images/shared');assert.equal(updates.length,2);
 assert.deepEqual(updates[0].picture,[url('images/keep')]);assert.deepEqual(updates[1].picture,[]);
 assert.ok(removed);assert.equal(invalidated,'images/shared');
});
test('provider failures and mismatched public IDs cannot report a successful deletion or remove references',async()=>{
 updates=[];removed=undefined;failed=true;
 await assert.rejects(remove(url('images/shared')),/Cloudinary unavailable/);assert.equal(updates.length,0);assert.equal(removed,undefined);
 failed=false;await assert.rejects(remove(url('images/shared'),'ids/customer'),/not a supported/);
});
