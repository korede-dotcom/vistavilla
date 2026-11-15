'use strict';
const Rooms=require('../models/RoomNumbers'),{QueryTypes}=require('sequelize');
module.exports=async query=>{
 const counts=await Rooms.sequelize.query('SELECT COUNT(*) AS total_items FROM roomnumbers r INNER JOIN roomcategories c ON r.category_id=c._id',{type:QueryTypes.SELECT});
 const pagination=require('../utils/roomPagination')(query,Number(counts[0].total_items));
 const rows=await Rooms.sequelize.query('SELECT c.category_name,c.num_beds,c.number_of_guests,c.picture,c.room_type,c.price,r.*,r._id AS id FROM roomnumbers r INNER JOIN roomcategories c ON r.category_id=c._id ORDER BY r._id ASC LIMIT :limit OFFSET :offset',{type:QueryTypes.SELECT,replacements:{limit:pagination.pageSize,offset:pagination.offset}});
 return {rows,pagination};
};
