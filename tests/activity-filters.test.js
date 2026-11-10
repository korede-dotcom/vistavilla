'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Op}=require('sequelize');const build=require('../utils/activityFilters');
test('activity search combines staff, type, date and status filters using bounded pagination',()=>{
 const q=build({q:'Room 1',actor:'Reception',resource:'hotelbooking',outcome:'success',start:'2026-11-01',end:'2026-11-10',size:'50',page:'2'});
 assert.equal(q.limit,50);assert.equal(q.page,2);assert.ok(q.where[Op.and].length>=5);
 const range=q.where[Op.and].find(term=>term.createdAt).createdAt;
 assert.equal(range[Op.gte].toISOString(),'2026-10-31T23:00:00.000Z');assert.equal(range[Op.lt].toISOString(),'2026-11-10T23:00:00.000Z');
 const next=new URL(q.pageUrl(3),'https://example.com/portal/activity-logs');assert.equal(next.searchParams.get('q'),'Room 1');assert.equal(next.searchParams.get('actor'),'Reception');assert.equal(next.searchParams.get('page'),'3');assert.equal(next.searchParams.get('size'),'50');
});
test('filters reject invalid dates and escape search wildcard characters',()=>{
 assert.throws(()=>build({start:'2026-02-30'}));assert.throws(()=>build({start:'2026-11-10',end:'2026-11-01'}));
 const q=build({q:'name_%',views:'1',size:'999',page:'-1'});assert.equal(q.limit,25);assert.equal(q.page,1);
 const searches=q.where[Op.and][0][Op.or];assert.ok(searches[0].description[Op.iLike].includes('\\_\\%'));
});
