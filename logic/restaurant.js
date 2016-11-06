/**
 * Created by pariskshitdutt on 08/03/16.
 */
var q = require('q');
var config = require('config');
var jwt = require('jwt-simple');
var ObjectId = require('mongoose').Types.ObjectId;
var moment = require('moment');
var async = require('async');
var db = require('../db/DbSchema');
var events = require('../events');
var log = require('tracer').colorConsole(config.get('log'));
var apn = require('../notificationSenders/apnsender');
var gcm = require('../notificationSenders/gcmsender');
var crypto = require('../authentication/crypto');
var bcrypt = require('bcrypt');

var restaurantTable = db.getrestaurantdef;
var userTable = db.getuserdef;
var orderTable = db.getorderdef;
var dishSchema = db.getDishSchema;


var listings = {
    checkAdmin: function (req) {
        var def = q.defer();
        log.info(req.user);
        if (req.user.is_admin) {
            def.resolve();
        } else {
            def.reject({status: 401, message: config.get("error.unauthorized")});
        }
        return def.promise;
    },
    checkProperUser: function (req) {
        var def = q.defer();
        if (req.user.is_admin) {
            def.resolve();
        } else {
            userTable.findOne({_id: req.user._id}, "is_res_owner restaurant_name", function (err, user) {
                if (!err) {
                    log.info(req.params.name, user.restaurant_name);
                    if (((req.params.name) && (req.params.name == user.restaurant_name)) ||
                        ((req.body.name) && (req.body.name == user.restaurant_name))) {
                        def.resolve();
                    } else {
                        def.reject({status: 401, message: config.get("error.unauthorized")});
                    }
                } else {
                    def.reject({status: 500, message: config.get("error.dberror")});
                }
            });
        }
        return def.promise;
    },
    addRestaurant: function (req) {
        var def = q.defer();
        req.body.name = req.params.name;
        var restaurant = new restaurantTable(req.body);
        restaurant.save(function (err, row, info) {
            if (!err) {
                def.resolve(config.get('ok'));
            } else {
                log.info(err);
                def.reject({status: 500, message: config.get('error.dberror')});
            }
        })
        return def.promise;
    },
    modifyRestaurant: function (req) {
        var def = q.defer();
        var res_name = req.params.name;
        for (var key in req.body) {
            if (key != "location" && key != "contact_number" && key != "contact_name") {
                delete req.body[key];
            }
        }
        restaurantTable.update({name: res_name, is_deleted: false}, {$set: req.body}, function (err, info) {
            if (!err) {
                def.resolve(config.get('ok'));
            } else {
                def.reject({status: 500, message: config.get('error.dberror')});
            }
        });
        return def.promise;
    },
    getRestaurant: function (req) {
        var def = q.defer();
        restaurantTable.findOne({
                name: req.params.name,
                is_deleted: false,
                is_verified: true
            }, "name dish_editable dish_add_allowed location contact_name contact_number contact_email address bank_name bank_account_name bank_account_number ifsc dishes open_status is_deleted",
            function (err, restaurant) {
                if (!err) {
                    def.resolve(restaurant);
                } else {
                    def.reject({status: 500, message: config.get('error.dberror')});
                }
            });
        return def.promise;
    },
    getRestaurants: function (req) {
        var def = q.defer();
        restaurantTable.find({
                is_deleted: false,
                is_verified: true
            }, "name location contact_name contact_number dishes open_status is_deleted",
            function (err, restaurants) {
                log.info(restaurants);
                if (!err) {
                    def.resolve(restaurants);
                } else {
                    def.reject({status: 500, message: config.get('error.dberror')});
                }
            })
        return def.promise;
    },
    addDishes: function (req) {
        var def = q.defer();
        // restaurantTable.update({
        //     name: req.params.name,
        //     is_deleted: false
        // }, {$addToSet: {dishes: req.body.dishes[0]}}, function (err, info) {
        //     log.info(err);
        //     if (!err) {
        //         def.resolve(config.get('ok'));
        //     } else {
        //         def.reject({status: 500, message: config.get('error.dberror')});
        //     }
        // });
        restaurantTable.findOne({name:req.params.name,is_deleted:false},"dishes",function(err,restaurant){

            var dishes=[];
            for(var i=0;i<req.body.dishes.length;i++){
                dishes.push(req.body.dishes[i]);
            }
            log.info(dishes);
            restaurant.dishes=dishes;
            restaurant.save(function(err,restaurant,info){
                log.info(restaurant);
                if (!err) {
                    def.resolve(config.get('ok'));
                } else {
                    log.info(err);
                    def.reject({status: 500, message: config.get('error.dberror')});
                }
            })
        });
        return def.promise;
    },
    getDishes: function (req) {
        var def = q.defer();
        restaurantTable.findOne({name: req.params.name, is_deleted: false}, "dishes",
            function (err, restaurant) {
                if (!err) {
                    def.resolve(restaurant.dishes);
                } else {
                    def.reject({status: 500, message: config.get('error.dberror')});
                }
            });
        return def.promise;
    },
    disableDish: function (req) {
        var def = q.defer();
        restaurantTable.update({name: req.params.name, 'dishes.identifier': req.body.dish_name},
            {$set: {'dishes.$.availability': false}}, {multi: true}, function (err, info) {
                log.info(err, info);
                if (!err) {
                    def.resolve(config.get('ok'));
                    events.emitter.emit('dish_change_status',{dish_name:req.body.dish_name,restaurant_name:req.params.name,enable:0});
                } else {
                    def.reject({status: 500, message: config.get('error.dberror')});
                }
            });
        return def.promise;
    },
    enableDish: function (req) {
        var def = q.defer();
        restaurantTable.update({name: req.params.name, 'dishes.identifier': req.body.dish_name},
            {$set: {'dishes.$.availability': true}}, {multi: true}, function (err, info) {
                if (!err) {
                    def.resolve(config.get('ok'));
                    events.emitter.emit('dish_change_status',{dish_name:req.body.dish_name,restaurant_name:req.params.name,enable:1});
                } else {
                    def.reject({status: 500, message: config.get('error.dberror')});
                }
            });
        return def.promise;
    },
    deleteDish: function (req) {
        var def = q.defer();
        restaurantTable.update({name: req.params.name},
            {$pull: {'dishes': {identifier: req.body.dish_name}}}, function (err, info) {
                log.info(err, info);
                if (!err) {
                    def.resolve(config.get('ok'));
                } else {
                    def.reject({status: 500, message: config.get('error.dberror')});
                }
            });
        return def.promise;
    },
    updateDishPrice: function (req) {
        var def = q.defer();
        restaurantTable.update({name: req.params.name, 'dishes.identifier': req.body.dish_name},
            {$set: {'dishes.$.price': req.body.price}}, function (err, info) {
                if (!err) {
                    def.resolve(config.get('ok'));
                } else {
                    def.reject({status: 500, message: config.get('error.dberror')});
                }
            });
        return def.promise;
    },
    closeRestaurant: function (req) {
        var def = q.defer();
        restaurantTable.update({
            name: req.params.name,
            is_deleted: false
        }, {$set: {open_status: false}}, function (err, info) {
            if (!err) {
                def.resolve(config.get('ok'));
                events.emitter.emit('close_restaurant_nomnom',{restaurant_name:req.params.name})
            } else {
                def.reject({status: 500, message: config.get('error.dberror')});
            }
        });
        return def.promise;
    },
    openRestaurant: function (req) {
        var def = q.defer();
        restaurantTable.update({
            name: req.params.name,
            is_deleted: false
        }, {$set: {open_status: true}}, function (err, info) {
            if (!err) {
                def.resolve(config.get('ok'));
                events.emitter.emit('open_restaurant_nomnom',{restaurant_name:req.params.name})
            } else {
                def.reject({status: 500, message: config.get('error.dberror')});
            }
        });
        return def.promise;
    },
    deleteRestaurant: function (req) {
        var def = q.defer();
        restaurantTable.update({name: req.params.name}, {$set: {is_deleted: true}}, function (err, info) {
            if (!err) {
                def.resolve(config.get('ok'));
            } else {
                def.reject({status: 500, message: config.get('error.dberror')});
            }
        });
        return def.promise;
    },
    verifyRestaurant: function (req) {
        var def = q.defer();
        restaurantTable.update({name: req.params.name}, {$set: {is_verified: true}}, function (err, info) {
            if (!err) {
                def.resolve(config.get('ok'));
            } else {
                def.reject({status: 500, message: config.get('error.dberror')});
            }
        });
        return def.promise;
    },
    getOrders: function (req) {
        var def = q.defer();
        if (!req.query.offset) {
            req.query.offset = 0;
        } else {
            try {
                req.query.offset = Number(req.query.offset);
            } catch (e) {
                req.query.offset = 0;
            }
        }
        var start_date = new Date(0);
        if (req.query.start_date) {
            try {
                start_date = Date.parse(req.query.start_date);
            } catch (e) {
            }
        }
        var end_date = new Date();
        if (req.query.end_date) {
            try {
                end_date = Date.parse(req.query.end_date);
            } catch (e) {
                log.info(e);
            }
        }
        var regex = new RegExp("", 'i')
        if (req.query.search) {
            regex = new RegExp(req.query.search, 'i');
        }
        log.info(start_date, end_date);
        orderTable.find({
                $and: [
                    {restaurant_assigned: req.params.name},
                    {created_time: {$gte: start_date, $lte: end_date}},
                    {
                        $or: [
                            {_id:req.query.search},
                            {address: regex},
                            {customer_name: regex},
                            {locality: regex},
                            {area: regex},
                            {status: regex},
                            {customer_name: regex},
                            {customer_number: regex},
                        ]
                    }
                ]
            },
                "address dishes_ordered delivery customer_name created_time log " +
                "customer_number customer_email city issue_raised issue_reason" +
                " locality area rejection_reason status payment_mode payment_status")
            .skip(Number(req.query.offset)).limit(20).sort({_id: -1})
            .exec(function (err, rows) {
                if (!err) {
                    def.resolve(rows);
                } else {
                    log.info(err);
                    def.reject({status: 500, message: config.get('error.dberror')});
                }
            })
        return def.promise;
    },
    getLiveOrders: function (req) {
        var def = q.defer();
        if (!req.query.offset) {
            req.query.offset = 0;
        } else {
            try {
                req.query.offset = Number(req.query.offset);
            } catch (e) {
                req.query.offset = 0;
            }
        }
        log.info("sending info");
        restaurantTable.findOne({name: req.params.name}, "nomnom_username nomnom_password servicing_restaurant",
            function (err, restaurant) {
            if(restaurant){
                log.info(restaurant);
                if(restaurant.nomnom_username){
                    events.emitter.emit("fetch_nomnom",
                        {
                            username: restaurant.nomnom_username,
                            password: restaurant.nomnom_password,
                            name: req.params.name,
                            serviced_by:restaurant.servicing_restaurant
                        });
                }
                orderTable.find({
                        restaurant_assigned: req.params.name,
                        status: {$in: ["awaiting response", "confirmed", "prepared","processing_delivery_request"]}
                    },
                    "address dishes_ordered full_order payment_mode delivery" +
                    " delivery_price_recieved customer_name customer_number log " +
                    "created_time customer_email nomnom_username issue_raised" +
                    " issue_reason nomnom_password city locality area rejection_reason" +
                    " status  payment_mode payment_status delivery_person_alloted delivery_person_contact")
                    .skip(Number(req.query.offset)).sort({_id: -1})
                    .exec(function (err, rows) {
                        log.info(err);
                        if (!err) {
                            def.resolve(rows);
                        } else {
                            def.reject({status: 500, message: config.get('error.dberror')});
                        }
                    });
            }
            });

        return def.promise;
    },
    getUnpaidOrders: function (req) {
        var def = q.defer();
        orderTable.find({
                restaurant_assigned: req.params.name,
                paid_status_to_restaurant: false,
                status: {$in: ["dispatched", "DELIVERED"]}
            },
            "address dishes_ordered full_order payment_mode delivery_price_recieved" +
            " delivery customer_name customer_number log created_time customer_email" +
            " issue_raised issue_reason nomnom_username nomnom_password city locality area rejection_reason status" +
            "  payment_mode payment_status")
            .sort({_id: -1})
            .exec(function (err, rows) {
                log.info(err);
                if (!err) {
                    def.resolve(rows);
                } else {
                    def.reject({status: 500, message: config.get('error.dberror')});
                }
            });
        return def.promise;
    },
    getOrder: function (req) {
        var def = q.defer();
        orderTable.findOne({_id: req.query.order_id},
            "address delivery full_order dishes_ordered city locality area rejection_reason status  payment_mode payment_status"
            , function (err, order) {
                if (!err) {
                    def.resolve(order);
                } else {
                    def.reject({status: 500, message: config.get('error.dberror')});
                }
            });
        return def.promise;
    },
    sendupdate:function(id){
      orderTable.find({combined_id:id},function(err,orders){
          log.info(orders);
          if(!err&&orders!=[]){
              var status=6;
              for(var i=0;i<orders.length;i++){
                      if(orders[i].status=="awaiting response"&&status>1){
                          status=1;
                      }else if(orders[i].status=="confirmed"&&status>2){
                          status=2;
                      }else if(orders[i].status=="prepared"&&status>3){
                          status=3;
                      }else if(orders[i].status=="dispatched"&&status>1){
                          status=4;
                      }else if(orders[i].status=="DELIVERED"&&status>1){
                          status=5;
                      }
              }
                      if(status==2){
                          events.emitter.emit("sms", {
                              number: orders[0].customer_number,
                              message: "Dear "+orders[0].customer_name+", your order is was" +
                              " confirmed by the kitchen. Thanks for using ZASTY!"
                          })
                      }else if(status==3){
                          events.emitter.emit("sms", {
                              number: orders[0].customer_number,
                              message: "Dear "+orders[0].customer_name+" your order is under processing and will be " +
                              "picked up shortly. Thanks for using ZASTY!"
                          })
                      }else if(status==4){
                          events.emitter.emit("sms", {
                              number: orders[0].customer_number,
                              message: "Dear "+orders[0].customer_name+", Our logistics Runner " +
                              orders[0].delivery_person_alloted+" "+orders[0].delivery_person_contact+" has " +
                              "picked up your order "+orders[0].combined_id+" and is on the way. The order will be delivered Shortly."
                          })
                      }else if(status==5){
                          events.emitter.emit("sms", {
                              number: orders[0].customer_number,
                              message: "Hi! Order number "+orders[0].combined_id+" is successfully delivered. We hope you loved it. Looking forward to serve you again."
                          })
                      }
          }
      });
    },
    confirmOrder: function (req) {
        var def = q.defer();
        orderTable.update({_id: req.body.order_id}, {
            $set: {status: "confirmed"},
            $push: {log: {status: "confirmed", date: new Date()}}
        }, function (err, info) {
            if (!err) {
                def.resolve(config.get('ok'));
                orderTable.findOne({_id: req.body.order_id}, "customer_name source restaurant_assigned customer_number source", function (err, order) {
                    if (!err&&order) {
                        if (order.source.name != "website") {
                            restaurantTable.findOne({name: order.restaurant_assigned}, "nomnom_username nomnom_password", function (err, restaurant) {
                                events.emitter.emit("status_change_nomnom",
                                    {
                                        username: restaurant.nomnom_username,
                                        password: restaurant.nomnom_password,
                                        status: "confirmed",
                                        source: order.source.id
                                    });
                            })
                        }
                            // events.emitter.emit("process_delivery_queue", order._id);
                        if (order.customer_number) {
// asdadadasdadaad
                        }
                    }
                });
            } else {
                def.reject({status: 500, message: config.get('error.dberror')});
            }
        });
        return def.promise;
    },
    rejectOrder: function (req) {
        var def = q.defer();
        events.emitter.emit("mail_admin", {
            subject: "Order Rejected by Restaurant - " + req.body.order_id,
            message: "Order Rejected by Restaurant - for order id-" + req.body.order_id + 'reason-' + req.body.reason,
            plaintext: "Order Rejected by Restaurant - for order id-" + req.body.order_id + 'reason-' + req.body.reason
        });
        orderTable.update({_id: req.body.order_id},
            {
                $set: {status: "rejected", rejection_reason: req.body.reason},
                $push: {log: {status: "rejected", date: new Date()}}
            }, function (err, info) {
                if (!err) {
                    def.resolve(config.get("ok"));
                    orderTable.findOne({_id: req.body.order_id}, "customer_name restaurant_assigned customer_number source", function (err, order) {
                        if (!err) {
                            if (order.source.name != "website") {
                                restaurantTable.findOne({name: order.restaurant_assigned}, "nomnom_username nomnom_password", function (err, restaurant) {
                                    events.emitter.emit("status_change_nomnom",
                                        {
                                            username: restaurant.nomnom_username,
                                            password: restaurant.nomnom_password,
                                            status: "rejected",
                                            source: order.source.id
                                        });
                                })
                            }
                            // if (order.customer_number) {
                            userTable.findOne({is_admin:true},function(err,user){
                                if(user&&user.phonenumber){
                                    events.emitter.emit("sms", {
                                        number: user.phonenumber,
                                        message: "Order number "+order._id+" has been rejected " +
                                        "by kitchen partner "+order.restaurant_assigned+". how can this happen! look into it now!"
                                    });
                                }
                            });
                            // }
                            // if (order.customer_email) {
                            //     events.emitter.emit("mail", {
                            //         subject: "Order rejected"
                            //         ,
                            //         message: "Your order was rejected",
                            //         plaintext: "Your order was confirmed",
                            //         toEmail: order.customer_email
                            //     })
                            // }
                        }
                    });
                } else {
                    def.reject({status: 500, message: config.get('error.dberror')});
                }
            });
        orderTable.findOne({_id: req.body.order_id},
            "address dishes_ordered city locality area rejection_reason status"
            , function (err, order) {
                if (!err) {
                    events.emitter.emit("rejected order", order);
                }
            });
        return def.promise;
    },

    changeOrderStatus: function (req) {
        var def = q.defer();
        if (req.body.status == "prepared" || req.body.status == "dispatched" || req.body.status == "delivered" || req.body.status == "new" || req.body.status == "confirmed" || req.body.status == "rejected") {
            orderTable.update({_id: req.body.order_id},
                {
                    $set: {status: req.body.status},
                    $push: {log: {status: req.body.status, date: new Date()}}
                }, function (err, info) {
                    if (!err) {
                        def.resolve(config.get("ok"));
                        orderTable.findOne({_id: req.body.order_id}, "customer_name source status " +
                            "customer_email delivery_person_alloted delivery_person_contact" +
                            " restaurant_assigned combined_id customer_number", function (err, order) {
                            if (!err) {
                                // if (order.status == "prepared") {
                                //     events.emitter.emit("process_delivery_queue", order._id);
                                // }
                                if (order.source.name == "nomnom") {
                                    restaurantTable.findOne({name: order.restaurant_assigned}, "nomnom_username nomnom_password", function (err, restaurant) {
                                        events.emitter.emit("status_change_nomnom",
                                            {
                                                username: restaurant.nomnom_username,
                                                password: restaurant.nomnom_password,
                                                status: req.body.status,
                                                order:order,
                                                source: order.source.id
                                            });
                                    })
                                }
                                log.info("sending update",order.combined_id);
                                listings.sendupdate(order.combined_id);
                                // if (order.customer_number) {
                                //     events.emitter.emit("sms", {
                                //         number: order.customer_number,
                                //         message: "Your order was " + order.status
                                //     })
                                // }
                                // if (order.customer_email) {
                                //     events.emitter.emit("mail", {
                                //         subject: "Order Confirmation"
                                //         ,
                                //         message: "Your order was " + order.status,
                                //         plaintext: "Your order was " + order.status,
                                //         toEmail: order.customer_email
                                //     })
                                // }
                            }
                        });
                    } else {
                        def.reject({status: 500, message: config.get('error.dberror')});
                    }
                });
        } else {
            def.reject({status: 400, message: config.get('error.badrequest')});
        }
        return def.promise;
    },
    raiseIssue: function (req) {
        var def = q.defer();
        events.emitter.emit("mail_admin", {
            subject: "Order Issue Raised by Restaurant - " + req.body.order_id,
            message: "order issue for order id-" + req.body.order_id + 'reason-' + req.body.reason,
            plaintext: "order issue for order id-" + req.body.order_id + 'reason-' + req.body.reason
        });
        userTable.findOne({is_admin:true},function(err,user){
            if(user&&user.phonenumber){
                events.emitter.emit("sms", {
                    number: user.phonenumber,
                    message: "issue has been raised on order number "+req.body.order_id+"  " +req.body.reason+
                    "by kitchen partner . how can this happen! look into it now!"
                });
            }
        });
        orderTable.update({_id: req.body.order_id}, {
            $set: {
                issue_raised: true,
                issue_reason: req.body.reason
            }
        }, function (err, info) {
            if (!err) {
                def.resolve(config.get('ok'));
            } else {
                def.reject({status: 500, message: config.get('error.dberror')});
            }
        });
        return def.promise;
    }
};
module.exports = listings;