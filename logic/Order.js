/**
 * Created by pariskshitdutt on 26/07/16.
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
var areaTable = db.getareadef;
var orderLogic = {
    findCity: function (req) {
        var def = q.defer();
        areaTable.find().distinct('city', function (err, cities) {
            if (!err) {
                def.resolve(cities);
            } else {
                def.reject({status: 500, message: config.get('error.dberror')});
            }
        });
        return def.promise;
    },
    findLocalities: function (req) {
        var def = q.defer();
        areaTable.find({city: req.query.city}).distinct('locality', function (err, localities) {
            if (!err) {
                def.resolve(localities);
            } else {
                def.reject({status: 500, message: config.get('error.dberror')});
            }
        });
        return def.promise;
    },
    findArea: function (req) {
        var def = q.defer();
        areaTable.find({city: req.query.city, locality: req.query.locality}).distinct('area', function (err, area) {
            if (!err) {
                def.resolve(area);
            } else {
                def.reject({status: 500, message: config.get('error.dberror')});
            }
        });
        return def.promise;
    },
    findServicingRestaurant: function (req) {
        var def = q.defer();
        areaTable.findOne({
            city: req.query.city,
            locality: req.query.locality,
            area: req.query.area,
            open_status: true
        }, "serviced_by", function (err, area) {
            if (!err || area) {
                def.resolve({restaurant_name: area.serviced_by});
            } else {
                def.reject({status: 500, message: config.get('error.dberror')});
            }
        });
        return def.promise;
    },
    findActualRates: function (req) {
        var def = q.defer();
        restaurantTable.findOne({
            name: req.body.restaurant_name,
            is_deleted: false,
            is_verified: true
        }, "dishes name open_status", function (err, restaurant) {
            if (!err && restaurant) {
                if (restaurant.open_status) {
                    def.resolve(restaurant);
                } else {
                    def.reject({status: 200, message: config.get("error.closed")})
                }
            } else {
                def.reject({status: 500, message: config.get('error.dberror')});
            }
        });
        return def.promise;
    },
    createDishesOrderedList: function (req, restaurant) {
        var def = q.defer();
        var dishes_ordered = [];
        if (Object.keys(req.body.dishes_ordered).length == 0) {
            def.reject({status: 400, message: config.get('error.badrequest')});
        }
        for (var i = 0; i < restaurant.dishes.length; i++) {
            if (req.body.dishes_ordered[restaurant.dishes[i].identifier]) {
                if (
                    restaurant.dishes[i].availability &&
                    req.body.dishes_ordered[restaurant.dishes[i].identifier].qty > 0 &&
                    req.body.dishes_ordered[restaurant.dishes[i].identifier].qty < 10 &&
                    req.body.dishes_ordered[restaurant.dishes[i].identifier].price > 0
                ) {
                    dishes_ordered.push({
                        identifier: restaurant.dishes[i].identifier,
                        price_recieved: req.body.dishes_ordered[restaurant.dishes[i].identifier].price,
                        price_to_pay: restaurant.dishes[i].price,
                        qty: req.body.dishes_ordered[restaurant.dishes[i].identifier].qty
                    });
                } else {
                    def.reject({status: 400, message: config.get('error.badrequest')});
                }
            }
        }
        if (dishes_ordered.length == Object.keys(req.body.dishes_ordered).length) {
            def.resolve({dishes_ordered: dishes_ordered, restaurant: restaurant});
        } else {
            def.reject({status: 400, message: config.get('error.badrequest')});
        }
        return def.promise;
    },
    saveOrder: function (req, dishes_ordered, restaurant) {
        log.info(dishes_ordered, restaurant);
        var def = q.defer();
        var location = [90, 90];
        if (req.body.lat && req.body.lon) {
            try {
                location = [Number(req.body.lon), Number(req.body.lat)];
            } catch (err) {

            }
        }
        var source = {
            name: "website",
            id: false
        }
        if (req.body.source) {
            source.name = req.body.source.name;
            source.id = req.body.source.id;
        }
        var status = "awaiting response"
        if (req.body.status) {
            status = req.body.status;
        }
        log.info(source);

        var total_price_recieved = 0;
        var total_price_to_pay = 0;
        dishes_ordered.forEach(function (d) {
            total_price_recieved += (d.price_recieved * d.qty);
            total_price_to_pay += (d.price_to_pay * d.qty);
        });

        var order = new orderTable({
            address: req.body.address,
            area: req.body.area,
            locality: req.body.locality,
            city: req.body.city,
            location: location,
            total_price_recieved: total_price_recieved,
            total_price_to_pay: total_price_to_pay,
            customer_name: req.body.customer_name,
            customer_number: req.body.customer_number,
            customer_email: req.body.customer_email,
            dishes_ordered: dishes_ordered,
            restaurant_assigned: restaurant.name,
            status: status,
            source: source
        });
        order.save(function (err, order, info) {
            log.info(err);
            if (!err) {
                def.resolve(order);

                var message = "new order id- " + order.order_id + ' \n';
                order.dishes_ordered.forEach(function (d) {
                    message += '\ndish:' + d.identifier + ' \tqty: ' + d.qty + ' \tprice: ' + d.price_to_pay;
                });
                message += '\ntotal price to restaurant: ' + order.total_price_to_pay;

                var email = {
                    subject: "New Order" + order.order_id,
                    message: message,
                    plaintext: message
                };

                userTable.findOne({restaurant_name: order.restaurant_assigned}, function (err, doc) {
                    if (doc && doc.email) {
                        email.toEmail = doc.email;
                        events.emitter.emit("mail", email);
                    }
                });

                email.message += '\ntotal price: ' + order.total_price_recieved;
                email.plaintext += '\ntotal price: ' + order.total_price_recieved;

                events.emitter.emit("mail_admin", email);

            } else {
                log.info(err);
                def.reject({status: 500, message: config.get('error.dberror')});
            }
        });
        return def.promise;
    },
    deleteOrder: function (req) {
        var def = q.defer();
        orderTable.update({_id: req.body.order_id},
            {$set: {is_deleted: true}}, function (err, info) {
                if (!err) {
                    def.resolve(config.get("ok"));
                } else {
                    def.reject({status: 500, message: config.get('error.dberror')});
                }
            });
        return def.promise;
    },
    saveAddress:function(req){
        var def=q.defer();
        var address={
            address: req.body.address,
            area: req.body.area,
            locality: req.body.locality,
            city: req.body.city,
        };
        userTable.update({email:req.body.customer_email},{$addToSet:{address:address}},function(err,info){
            if(!err) {
                def.resolve("saved address");
            }else{
                def.reject({status: 500, message: config.get('error.dberror')});
            }
        })
        return def.promise;
    },
    deliveryCallback: function (req) {
        log.info(req.params, req.body);
        var def = q.defer();

        orderTable.findOne({_id: req.params.order_id}, function (err, doc) {
            if (err || !doc) {
                def.reject({status: 500, message: config.get('error.dberror')});
            }

            doc.delivery.log.push({status: JSON.stringify(req.body)});

            if (req.body.order_status == 'DELIVERED') {
                doc.status = req.body.order_status;
            }

            doc.delivery.status = req.body.order_status;

            if (parseInt(req.body.cancel_reason) > -1) {
                doc.status = 'DELIVERY_ERROR';
                var text = "order delivery service issue for order id-" + doc._id + ' r- ' + JSON.stringify(req.body);
                events.emitter.emit("mail_admin", {
                    subject: "Order Delivery Issue",
                    message: text,
                    plaintext: text
                });
            }
            doc.save();
            def.resolve(doc);
        });
        return def.promise;
    }

};

module.exports = orderLogic;