'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs');
const stores=[];
function stub(name,exports){const filename=require.resolve(name);require.cache[filename]={id:filename,filename,loaded:true,exports};}
stub('cloudinary',{v2:{config(){},uploader:{}}});
stub('multer-storage-cloudinary',{CloudinaryStorage:class{constructor(options){this.options=options;stores.push(options);}}});
stub('multer',options=>({any:()=>options}));
const repo=require('../repos/cloudinary');
test('booking ID and damage upload parsers use their dedicated folders and limits',()=>{
 assert.equal(repo.idsParser.storage.options.params.folder,'ids');assert.equal(repo.idsParser.limits.files,1);
 assert.equal(repo.damagesParser.storage.options.params.folder,'damages');assert.equal(repo.damagesParser.limits.files,5);
 assert.equal(repo.idsParser.limits.fileSize,10485760);
 const pay=fs.readFileSync('routes/Paystack.js','utf8');assert.ok(pay.includes("'/paystack/initialize/reception', checkAuthCookie, cloudinaryRepo.idsParser"));
 const admin=fs.readFileSync('routes/Admin.js','utf8');assert.ok(admin.includes('cloudinaryRepo.damagesParser, DamageController.createDamage'));assert.ok(admin.includes('cloudinaryRepo.damagesParser, DamageController.updateDamage'));
});
test('damage controller preserves parser upload URLs instead of uploading the same image again',()=>{
 const source=fs.readFileSync('controllers/Damage.js','utf8');assert.ok(!source.includes('uploadMany(req.files)'));assert.equal((source.match(/url:file.path,public_id:file.filename/g)||[]).length,2);
 const details=fs.readFileSync('views/portal/check-in.ejs','utf8');assert.ok(details.includes('bookings.id_card_url'));assert.ok(details.includes('alt="Customer ID card"'));
});
