'use strict';
const roles={1:'ceo',2:'Cleaners',3:'gymmanager',4:'hotelmanager',5:'Security',6:'staffs',7:'hotel receptionist',8:'gym receptionist',9:'event receptionist',10:'bar manager'};
module.exports=user=>roles[Number(user.role_id)]||user.roleName;
