'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),ejs=require('ejs');
const rooms=Array.from({length:13},(_,index)=>({id:index+1,room_name:'Room '+(index+1),room_number:String(index+1),category_name:'Suite',num_beds:1,number_of_guests:2,picture:[],createdAt:new Date(),status:false,is_retained:false}));
const filename=require.resolve('../models/RoomNumbers');
require.cache[filename]={id:filename,filename,loaded:true,exports:{sequelize:{query:async(sql,options)=>{
 if(sql.includes('COUNT(*)'))return [{total_items:13}];
 assert.match(sql,/ORDER BY r\._id ASC/);const {limit,offset}=options.replacements;return rooms.slice(offset,offset+limit);
}}}};
const list=require('../services/roomList');
test('13 rooms span two server pages with page 2 showing the remaining three rooms',async()=>{
 const first=await list({}),second=await list({page:'2'});
 assert.equal(first.rows.length,10);assert.equal(first.pagination.totalPages,2);
 assert.equal(second.rows.length,3);assert.equal(second.rows[0].id,11);assert.equal(second.rows[2].id,13);
 const template=fs.readFileSync('views/portal/all-rooms.ejs','utf8').replace(/<%- include\([^\n]+?%>/g,'');
 const html=ejs.render(template,{data:second.rows,pagination:second.pagination,roleName:'hotel receptionist'});
 assert.match(html,/Showing 11–13 of 13 rooms/);assert.match(html,/rel="prev"/);assert.doesNotMatch(html,/<table class="datatable/);
});
test('page bounds are clamped and page size can show all 13 rooms',async()=>{
 assert.equal((await list({limit:'25'})).rows.length,13);
 assert.equal((await list({page:'999'})).pagination.currentPage,2);
 assert.equal((await list({page:'-1',limit:'99999'})).pagination.currentPage,1);
});
