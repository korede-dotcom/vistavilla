'use strict';
module.exports=(query,total)=>{
 const limit=[10,25,50,100].includes(Number(query.limit))?Number(query.limit):10;
 const pages=Math.max(1,Math.ceil(total/limit)),page=Math.min(pages,Math.max(1,parseInt(query.page,10)||1));
 return {totalItems:total,totalPages:pages,currentPage:page,pageSize:limit,offset:(page-1)*limit};
};
