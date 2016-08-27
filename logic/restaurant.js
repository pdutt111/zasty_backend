/**
 * Created by pariskshitdutt on 08/03/16.
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


var listings={
    checkAdmin:function(req){
        var def= q.defer();
        log.info(req.user);
        if(req.user.is_admin){
            def.resolve();
        }else{
            def.reject({status:401,message:config.get("error.unauthorized")});
        }
        return def.promise;
    },
    checkProperUser:function(req){
      var def= q.defer();
        if(req.user.is_admin){
          def.resolve();
        }else{
            userTable.findOne({_id:req.user._id},"is_res_owner restaurant",function(err,user){
                if(!err){
                    if(((req.params.name)&&(req.params.name==user.restaurant_name))||
                        ((req.body.name)&&(req.body.name==user.restaurant_name))){
                        def.resolve();
                    }else{
                        def.reject({status:401,message:config.get("error.unauthorized")});
                    }
                }else{
                    def.reject({status:500,message:config.get("error.dberror")});
                }
            });
        }
        return def.promise;
    },
    addRestaurant:function(req){
        var def= q.defer();
        req.body.name=req.params.name;
        var restaurant=new restaurantTable(req.body);
        restaurant.save(function(err,row,info){
            if(!err){
                def.resolve(config.get('ok'));
            }else{
                def.reject({status:500,message:config.get('error.dberror')});
            }
        })
        return def.promise;
    },
    modifyRestaurant:function(req){
        var def= q.defer();
        var res_name=req.params.name;
        for(var key in req.body){
            if(key!="location"&&key!="contact_number"&&key!="contact_name"){
                delete req.body[key];
            }
        }
        restaurantTable.update({name:res_name,is_deleted:false},{$set:req.body},function(err,info){
            if(!err){
                def.resolve(config.get('ok'));
            }else{
                def.reject({status:500,message:config.get('error.dberror')});
            }
        });
        return def.promise;
    },
    getRestaurant:function(req){
        var def= q.defer();
        restaurantTable.findOne({name:req.params.name,is_deleted:false,is_verified:true},"name location contact_name contact_number dishes open_status is_deleted",
        function(err,restaurant){
            if(!err){
                def.resolve(restaurant);
            }else{
                def.reject({status:500,message:config.get('error.dberror')});
            }
        });
        return def.promise;
    },
    getRestaurants:function(req){
        var def= q.defer();
        restaurantTable.find({is_deleted:false,is_verified:true},"name location contact_name contact_number dishes open_status is_deleted",
            function(err,restaurants){
                log.info(restaurants);
                if(!err){
                    def.resolve(restaurants);
                }else{
                    def.reject({status:500,message:config.get('error.dberror')});
                }
            })
        return def.promise;
    },
    addDishes:function(req){
        var def= q.defer();
        log.info(req.body.dishes);
        restaurantTable.update({name:req.params.name,is_deleted:false},{$addToSet:{dishes:{$each:req.body.dishes}}},function(err,info){
            log.info(err);
            if(!err){
                def.resolve(config.get('ok'));
            }else{
                def.reject({status:500,message:config.get('error.dberror')});
            }
        });
        return def.promise;
    },
    getDishes:function(req){
        var def= q.defer();
        restaurantTable.findOne({name:req.params.name,is_deleted:false},"dishes",
            function(err,restaurant){
                if(!err){
                    def.resolve(restaurant.dishes);
                }else{
                    def.reject({status:500,message:config.get('error.dberror')});
                }
            });
        return def.promise;
    },
    disableDish:function(req){
        var def= q.defer();
        restaurantTable.update({name:req.params.name,'dishes.identifier':req.body.dish_name},
            {$set:{'dishes.$.availability':false}},{multi:true},function(err,info){
                log.info(err,info);
                if(!err){
                    def.resolve(config.get('ok'));
                }else{
                    def.reject({status:500,message:config.get('error.dberror')});
                }
            });
        return def.promise;
    },
    enableDish:function(req){
        var def= q.defer();
        restaurantTable.update({name:req.params.name,'dishes.identifier':req.body.dish_name},
            {$set:{'dishes.$.availability':true}},{multi:true},function(err,info){
                if(!err){
                    def.resolve(config.get('ok'));
                }else{
                    def.reject({status:500,message:config.get('error.dberror')});
                }
            });
        return def.promise;
    },
    deleteDish:function(req){
        var def= q.defer();
        restaurantTable.update({name:req.params.name},
            {$pull:{'dishes':{identifier:req.body.dish_name}}},function(err,info){
                log.info(err,info);
                if(!err){
                    def.resolve(config.get('ok'));
                }else{
                    def.reject({status:500,message:config.get('error.dberror')});
                }
            });
        return def.promise;
    },
    updateDishPrice:function(req){
        var def= q.defer();
        restaurantTable.update({name:req.params.name,'dishes.identifier':req.body.dish_name},
            {$set:{'dishes.$.price':req.body.price}},function(err,info){
                if(!err){
                    def.resolve(config.get('ok'));
                }else{
                    def.reject({status:500,message:config.get('error.dberror')});
                }
            });
        return def.promise;
    },
    closeRestaurant:function(req){
        var def= q.defer();
        restaurantTable.update({name:req.params.name,is_deleted:false},{$set:{open_status:false}},function(err,info){
            if(!err){
                def.resolve(config.get('ok'));
            }else{
                def.reject({status:500,message:config.get('error.dberror')});
            }
        });
        return def.promise;
    },
    openRestaurant:function(req){
        var def= q.defer();
        restaurantTable.update({name:req.params.name,is_deleted:false},{$set:{open_status:true}},function(err,info){
            if(!err){
                def.resolve(config.get('ok'));
            }else{
                def.reject({status:500,message:config.get('error.dberror')});
            }
        });
        return def.promise;
    },
    deleteRestaurant:function(req){
        var def= q.defer();
        restaurantTable.update({name:req.params.name},{$set:{is_deleted:true}},function(err,info){
            if(!err){
                def.resolve(config.get('ok'));
            }else{
                def.reject({status:500,message:config.get('error.dberror')});
            }
        });
        return def.promise;
    },
    verifyRestaurant:function(req){
        var def= q.defer();
        restaurantTable.update({name:req.params.name},{$set:{is_verified:true}},function(err,info){
            if(!err){
                def.resolve(config.get('ok'));
            }else{
                def.reject({status:500,message:config.get('error.dberror')});
            }
        });
        return def.promise;
    },
    getOrders:function(req){
        var def= q.defer();
        orderTable.find({restaurant_assigned:req.params.name},
            "address dishes_ordered customer_name customer_number customer_email city locality area rejection_reason status")
            .skip(Number(req.query.offset)).limit(20).sort({_id:-1})
            .exec(function(err,rows){
                log.info(err);
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
            {$set:{status:"rejected",rejection_reason:req.body.reason}},function(err,info){
                if(!err){
                    def.resolve(config.get("ok"));
                }else{
                    def.reject({status:500,message:config.get('error.dberror')});
                }
            });
        orderTable.findOne({_id:new ObjectId(req.body.order_id)},
            "address dishes_ordered city locality area rejection_reason status"
            ,function(err,order){
                if(!err){
                    events.emitter.emit("rejected order",order);
                }
            });
        return def.promise;
    },

    changeOrderStatus:function(req){
        var def= q.defer();
        if(req.status=="prepared"||req.status=="dispatched"||req.status=="delivered"||req.status=="new"){
            orderTable.update({_id:new ObjectId(req.body.order_id)},
                {$set:{status:req.body.status}},function(err,info){
                    if(!err){
                        def.resolve(config.get("ok"));
                    }else{
                        def.reject({status:500,message:config.get('error.dberror')});
                    }
                });
        }else{
            def.reject({status:400,message:config.get('error.badrequest')});
        }
        return def.promise;
    }
};
module.exports=listings;