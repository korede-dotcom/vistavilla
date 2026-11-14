'use strict';
module.exports=(rooms,id,numbers=[])=>{
 if(id!==undefined)return rooms.find(room=>String(room._id)===String(id))||null;
 return rooms.find(room=>String(room.room_number)===String(numbers[0]))||rooms[0]||null;
};
