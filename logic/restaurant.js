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

var listings={
    checkAdmin:function(req){
        var def= q.defer();
        if(req.user.is_admin){
            def.resolve();
        }else{
            def.reject({status:401,message:config.get("error.unauthorized")});
        }
        return def.promise;
    },
    checkProperUser:function(req){
      var def= q.defer();
        if(req.user.admin){
          def.resolve();
        }else{
            userTable.findOne({_id:req.user._id},"is_res_owner restaurant",function(err,user){
                if(!err){
                    if(((req.params.name)&&(req.params.name==user.restaurant))||
                        ((req.body.name)&&(req.body.name==user.restaurant))){
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
        restaurantTable.update({name:req.params.name,is_deleted:false},{$addToSet:{$each:req.body.dishes}},function(err,info){
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
                    def.resolve(restaurant);
                }else{
                    def.reject({status:500,message:config.get('error.dberror')});
                }
            });
        return def.promise;
    },
    disableDish:function(req){
        var def= q.defer();
        restaurantTable.update({name:req.params.name,'dishes.$.identifier':req.body.dish_name},
            {$set:{'dishes.$.availability':false}},function(err,info){
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
        restaurantTable.update({name:req.params.name,'dishes.$.identifier':req.body.dish_name},
            {$set:{'dishes.$.availability':true}},function(err,info){
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
        restaurantTable.update({name:req.params.name,'dishes.$.identifier':req.body.dish_name},
            {$pull:{'dishes.$.identifier':req.body.dish_name}},function(err,info){
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
        restaurantTable.update({name:req.params.name,'dishes.$.identifier':req.body.dish_name},
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
        restaurantTable.update({name:req.params.name},{$set:{is_verified:true}},function(err,info){
            if(!err){
                def.resolve(config.get('ok'));
            }else{
                def.reject({status:500,message:config.get('error.dberror')});
            }
        });
    }
};
module.exports=listings;