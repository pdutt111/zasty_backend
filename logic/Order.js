/**
 * Created by pariskshitdutt on 26/07/16.
 */
var q= require('q');
var config= require('config');
var jwt = require('jwt-simple');
var ObjectId = require('mongoose').Types.ObjectId;
var moment= require('moment');
var async= require('async');
var db=require('../db/DbSchema');
var events = require('../events');
var log = require('tracer').colorConsole(config.get('log'));
var apn=require('../notificationSenders/apnsender');
var gcm=require('../notificationSenders/gcmsender');
var crypto=require('../authentication/crypto');
var bcrypt = require('bcrypt');

var restaurantTable=db.getrestaurantdef;
var userTable=db.getuserdef;
var orderTable=db.getorderdef;
var areaTable=db.getareadef;
var orderLogic={
    findCity:function(req){
        var def= q.defer();
        areaTable.find().distinct('city',function(err,cities){
           if(!err){
               def.resolve(cities);
           } else{
               def.reject({status:500,message:config.get('error.dberror')});
           }
        });
        return def.promise;
    },
    findLocalities:function(req){
        var def= q.defer();
        areaTable.find({city:req.query.city}).distinct('locality',function(err,localities){
            if(!err){
                def.resolve(localities);
            } else{
                def.reject({status:500,message:config.get('error.dberror')});
            }
        });
        return def.promise;
    },
    findArea:function(req){
        var def= q.defer();
        areaTable.find({city:req.query.city,locality:req.query.locality}).distinct('area',function(err,area){
            if(!err){
                def.resolve(areas);
            } else{
                def.reject({status:500,message:config.get('error.dberror')});
            }
        });
        return def.promise;
    },
    findServicingRestaurant:function(req){
        var def= q.defer();
        areaTable.findOne({area:req.body.area},"serviced_by",function(err,area){
            if(!err){
                def.resolve(area.serviced_by);
            }else{
                def.reject({status:500,message:config.get('error.dberror')});
            }
        });
        return def.promise;
    },
    findActualRates:function(req,serviced_by){
        var def=q.defer();
        restaurantTable.findOne({_id:new ObjectId(serviced_by)},"dishes open_status",function(err,restaurant){
           if(!err){
               if(restaurant.open_status){
                   def.resolve(restaurant);
               }else{
                   def.reject({status:200,message:config.get("error.closed")})
               }
           } else{
               def.reject({status:500,message:config.get('error.dberror')});
           }
        });
        return def.pomise;
    },
    createDishesOrderedList:function(req,restaurant){
        var def= q.defer();
        var dishes_ordered=[];
        for(var i=0;i<restaurant.dishes.length;i++){
            if(req.body.dishes_ordered[restaurant.dishes[i].identifier]){
                dishes_ordered.push({
                    identifier:restaurant.dishes[i].identifier,
                    price_recieved:req.body.dishes_ordered[restaurant.dishes[i].identifier],
                    price_to_pay:restaurant.dishes[i].price
                });
            }
        }
        if(dishes_ordered.length>0){
            def.resolve(dishes_ordered);
        }else{
            def.reject({status:400,message:config.get('error.badrequest')});
        }
        return def.promise;
    },
    saveOrder:function(req,dishes_ordered,restaurant){
        var def= q.defer();
        var order=new orderTable({
            address:req.body.address,
            area:req.body.area,
            locality:req.body.locality,
            city:req.body.city,
            location:[req.body.lon,req.body.lat],
            dishes_ordered:dishes_ordered,
            restaurant_assigned:new ObjectId(restaurant._id),
            status:"awaiting response",
        });
        order.save(function(err,order,info){
            if(!err){
                def.resolve(order);
            }else{
                def.reject({status:500,message:config.get('error.dberror')});
            }
        })
        return def.promise;
    },
    confirmOrder:function(req){
        var def= q.defer();
        orderTable.update({_id:new ObjectId(req.body.order_id)},{$set:{status:"confirmed"}},function(err,info){
            if(!err){
                def.resolve(config.get('ok'));
            }else{
                def.reject({status:500,message:config.get('error.dberror')});
            }
        });
        return def.promise;
    },
    rejectOrder:function(req){
        var def= q.defer();
        orderTable.update({_id:new ObjectId(req.body.order_id)},
            {$set:{status:"rejected",rejection_reason:eq.body.reason}},function(err,info){
                if(!err){
                    def.resolve(config.get("ok"));
                }else{
                    def.reject({status:500,message:config.get('error.dberror')});
                }
            });
        orderTable.findOne({_id:new ObejctId(req.body.order_id)},
            "address dishes_ordered city locality area rejection_reason status"
            ,function(err,order){
                if(!err){
                    events.emitter.emit("rejected order",order);
                }
            });
        return def.promise;
    },
    getOrders:function(req){
        var def= q.defer();
        orderTable.find({restaurant_assigned:new ObjectId(req.query.res_id)},
            "address dishes_ordered city locality area rejection_reason status")
            .skip(req.query.offset).limit(20)
            .exec(function(err,rows){
                if(!err){
                    def.resolve(rows);
                }else{
                    def.reject({status:500,message:config.get('error.dberror')});
                }
            })
        return def.promise;
    },
    getOrder:function(req){
        var def= q.defer();
        orderTable.findOne({_id:new ObjectId(req.query.order_id)},
            "address dishes_ordered city locality area rejection_reason status"
        ,function(err,order){
                if(!err){
                    def.resolve(order);
                }else {
                    def.reject({status: 500, message: config.get('error.dberror')});
                }
                });
        return def.promise;
    },
    changeOrderStatus:function(req){
        var def= q.defer();
        orderTable.update({_id:new ObjectId(req.body.order_id)},
            {$set:{status:req.body.status}},function(err,info){
                if(!err){
                    def.resolve(config.get("ok"));
                }else{
                    def.reject({status:500,message:config.get('error.dberror')});
                }
            });
        return def.promise;
    },
    deleteOrder:function(req){
        var def= q.defer();
        orderTable.update({_id:new ObjectId(req.body.order_id)},
            {$set:{is_deleted:true}},function(err,info){
                if(!err){
                    def.resolve(config.get("ok"));
                }else{
                    def.reject({status:500,message:config.get('error.dberror')});
                }
            });
        return def.promise;
    }

};

module.exports=orderLogic