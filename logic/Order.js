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
                def.resolve(area);
            } else{
                def.reject({status:500,message:config.get('error.dberror')});
            }
        });
        return def.promise;
    },
    findServicingRestaurant:function(req){
        var def= q.defer();
        areaTable.findOne({city:req.query.city,locality:req.query.locality,area:req.query.area,open_status:true},"serviced_by",function(err,area){
            if(!err||area){
                def.resolve({restaurant_name:area.serviced_by});
            }else{
                def.reject({status:500,message:config.get('error.dberror')});
            }
        });
        return def.promise;
    },
    findActualRates:function(req){
        var def=q.defer();
        restaurantTable.findOne({name:req.body.restaurant_name,is_deleted:false,is_verified:true},"dishes name open_status",function(err,restaurant){
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
        return def.promise;
    },
    createDishesOrderedList:function(req,restaurant){
        var def= q.defer();
        var dishes_ordered=[];
        for(var i=0;i<restaurant.dishes.length;i++){
            if(req.body.dishes_ordered[restaurant.dishes[i].identifier]){
                if(!restaurant.dishes[i].availability){
                    def.reject(def.reject({status:400,message:config.get('error.badrequest')}));
                }
                    dishes_ordered.push({
                        identifier:restaurant.dishes[i].identifier,
                        price_recieved:req.body.dishes_ordered[restaurant.dishes[i].identifier].price,
                        price_to_pay:restaurant.dishes[i].price,
                        qty:req.body.dishes_ordered[restaurant.dishes[i].identifier].qty
                    });
            }
        }
        if(dishes_ordered.length>0){
            def.resolve({dishes_ordered:dishes_ordered,restaurant:restaurant});
        }else{
            def.reject({status:400,message:config.get('error.badrequest')});
        }
        return def.promise;
    },
    saveOrder:function(req,dishes_ordered,restaurant){
        log.info(dishes_ordered,restaurant);
        var def= q.defer();
        var location=[90,90];
        if(req.body.lat&&req.body.lon){
            try{
                location=[Number(req.body.lon),Number(req.body.lat)];
            }catch(err){

            }
        }
        var order=new orderTable({
            address:req.body.address,
            area:req.body.area,
            locality:req.body.locality,
            city:req.body.city,
            location:location,
            customer_name:req.body.customer_name,
            customer_number:req.body.customer_number,
            customer_email:req.body.customer_email,
            dishes_ordered:dishes_ordered,
            restaurant_assigned:restaurant.name,
            status:"awaiting response"
        });
        order.save(function(err,order,info){
            log.info(err);
            if(!err){
                def.resolve(order);
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