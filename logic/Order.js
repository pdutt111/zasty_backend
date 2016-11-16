/**
 * Created by pariskshitdutt on 26/07/16.
 */
var q = require('q');

var jwt = require('jwt-simple');
var ObjectId = require('mongoose').Types.ObjectId;
var moment = require('moment');
var async = require('async');
var db = require('../db/DbSchema');
var events = require('../events');
var crypto2 = require('crypto');
var config = require('config');
var log = require('tracer').colorConsole(config.get('log'));
var apn = require('../notificationSenders/apnsender');
var gcm = require('../notificationSenders/gcmsender');
var crypto = require('../authentication/crypto');
var bcrypt = require('bcrypt');
var ejs = require('ejs');

var restaurantTable = db.getrestaurantdef;
var userTable = db.getuserdef;
var orderTable = db.getorderdef;
var paymentTable = db.getpaymentdef;
var areaTable = db.getareadef;
var couponTable = db.getcoupondef;
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
        areaTable.find({city: req.query.city}).distinct('area', function (err, area) {
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
            area: new RegExp(req.query.area,'i'),
        }, "serviced_by", function (err, area) {
            log.info(err, area);
            if (!err && area) {
                log.info(area);
                def.resolve(area.serviced_by);
            } else {
                log.info(err);
                def.reject({status: 500, message: config.get('error.dberror')});
            }
        });
        return def.promise;
    },
    combineRestaurant: function (req, restaurants) {
        log.info(restaurants);
        var def = q.defer();
        restaurantTable.find({
            name: {$in: restaurants},
            open_status:true,
            is_deleted: false,
            is_verified: true
        }, "name dishes contact_name open_status contact_number").populate('dishes.details').exec( function (err, restaurants) {
            log.info(restaurants);
            if (!err && restaurants.length > 0) {
                var response = {};
                response.contact_name = restaurants[0].contact_name;
                response.contact_number = restaurants[0].contact_number;
                response.dishes = [];

                for (var i = 0; i < restaurants.length; i++) {
                    for (var j = 0; j < restaurants[i].dishes.length; j++) {
                        if(restaurants[i].dishes[j].availability){
                            response.dishes.push(restaurants[i].dishes[j]);
                        }
                    }
                }
                def.resolve(response);
            } else {
                def.reject({status: 400, message: config.get('error.closed')});
            }
        });
        return def.promise;
    },
    confirmCode:function(req){
        var def=q.defer();
        var random=randomString(6,"#");
        if(req.body.phonenumber.slice(0,3)=="+91"){
            req.body.phonenumber=req.body.phonenumber.slice(3);
        }
        userTable.update({_id:req.user._id},{$set:{pin:random,phonenumber:req.body.phonenumber}},
        function(err,info){
            if(!err){
                def.resolve(config.get('ok'));
                events.emitter.emit("sms", {number: req.body.phonenumber, message: random+" is your zasty confirmation code"});
            }else{
                def.reject({status: 500, message: config.get('error.dberror')});
            }
        })
        return def.promise;
    },
    findRestaurantFromArea: function (req) {
        var def = q.defer();
        areaTable.findOne({
            city: req.body.city,
            area: new RegExp(req.body.area,'i'),
            // area: new RegExp("Block B - Sector 56",'i'),
        }, "serviced_by", function (err, area) {
            if (!err && area) {
                def.resolve(area.serviced_by);
            } else {
                log.info(err,req.body.area);
                def.reject({status: 500, message: config.get('error.dberror')});
            }
        });
        return def.promise;
    },
    findActualRates: function (req, restaurants) {
        var def = q.defer();
        restaurantTable.find({
            name: {$in: restaurants},
            is_deleted: false,
            is_verified: true
        }, "dishes name delivery_enabled open_status", function (err, restaurants) {
            if (!err && restaurants) {
                // if (restaurant.open_status) {
                def.resolve(restaurants);
                // } else {
                //     def.reject({status: 200, message: config.get("error.closed")})
                // }
            } else {
                // log.info(err,restaurants);
                def.reject({status: 500, message: config.get('error.dberror')});
            }
        });
        return def.promise;
    },
    createDishesOrderedList: function (req, restaurants) {
        var def = q.defer();
        // log.info(restaurants);
        var dishes_ordered = [];
        if (Object.keys(req.body.dishes_ordered).length == 0) {
            log.info("dishes not found")
            def.reject({status: 400, message: config.get('error.badrequest')});
        }
        var completeDishList = []
        for (var i = 0; i < restaurants.length; i++) {
            for (var j = 0; j < restaurants[i].dishes.length; j++) {
                var dish = restaurants[i].dishes[j]
                // restaurants[i].dishes=restaurants[i].dishes.toObject();
                dish = dish.toObject();
                dish.res_name = restaurants[i].name;
                completeDishList.push(dish)
            }
        }
        for (var i = 0; i < completeDishList.length; i++) {
            // log.info(req.body.dishes_ordered[completeDishList[i].identifier]);
            if (req.body.dishes_ordered[completeDishList[i].identifier]) {

                if (
                    // (req.source.name!="website"||completeDishList[i].availability) &&
                    req.body.dishes_ordered[completeDishList[i].identifier].qty > 0 &&
                    req.body.dishes_ordered[completeDishList[i].identifier].qty < 10 &&
                    req.body.dishes_ordered[completeDishList[i].identifier].price > 0
                ) {
                    log.info("here");
                    dishes_ordered.push({
                        identifier: completeDishList[i].identifier,
                        price_recieved: completeDishList[i].price_to_consumer,
                        price_to_pay: completeDishList[i].price,
                        qty: req.body.dishes_ordered[completeDishList[i].identifier].qty,
                        res_name: completeDishList[i].res_name
                    });
                    log.info(dishes_ordered);
                } else {
                    log.info("here");
                    def.reject({status: 400, message: config.get('error.badrequest')});
                }
            }
        }
        log.debug(dishes_ordered.length,Object.keys(req.body.dishes_ordered).length);

        if (dishes_ordered.length == Object.keys(req.body.dishes_ordered).length) {
            var dishesByRestaurant = {};
            for (var i = 0; i < dishes_ordered.length; i++) {
                if (dishesByRestaurant[dishes_ordered[i].res_name]) {
                    dishesByRestaurant[dishes_ordered[i].res_name].push(dishes_ordered[i]);
                } else {
                    dishesByRestaurant[dishes_ordered[i].res_name] = [];
                    dishesByRestaurant[dishes_ordered[i].res_name].push(dishes_ordered[i]);
                }
            }
            // log.info(dishesByRestaurant);
            def.resolve({dishes_ordered: dishesByRestaurant, restaurant: restaurants});
        } else {
            log.info("dishes did not match",req.body.dishes_ordered,req.body);
            def.reject({status: 400, message: config.get('error.badrequest')});
        }
        return def.promise;
    },
    saveOrder: function (req, dishes_ordered, restaurants) {
        var def = q.defer();
        log.info(dishes_ordered);
        var location = [0, 0];
        if (req.body.lat && req.body.lon) {
            try {
                location = [Number(req.body.lon), Number(req.body.lat)];
            } catch (err) {

            }
        }
        var source = {
            name: "website",
        }
        if (req.body.source) {
            source.name = req.body.source.name;
            source.id = req.body.source.id;
        }
        var status = "awaiting response"
        //if (req.body.status) {
        //    status = req.body.status;
        //}
        // log.info(source);

        var delivery_price_recieved = 0;
        var delivery_price_to_pay = 0;

        for (var i = 0; i < restaurants.length; i++) {
            if (dishes_ordered[restaurants[i].name]) {
                for (var j = 0; j < dishes_ordered[restaurants[i].name].length; j++) {
                    var dish = dishes_ordered[restaurants[i].name][j];
                    delivery_price_recieved += (dish.price_recieved * dish.qty);
                    delivery_price_to_pay += (dish.price_to_pay * dish.qty);
                }
            }
        }
        log.info(req.body.coupon_code);
        if (req.body.coupon_code && req.body.coupon_code.off) {
            delivery_price_recieved = (delivery_price_recieved * (100 - Number(req.body.coupon_code.off)) / 100);
        }
        delivery_price_recieved = Math.round(delivery_price_recieved * (113.13) / 100);
        var ordersList = [];
        // log.info(order_completed);
        var full_order = false;

        var _restaurants = []
        for (var i = 0; i < restaurants.length; i++) {
            if (dishes_ordered[restaurants[i].name]) {
                _restaurants.push(restaurants[i]);
            }
        }
        restaurants = _restaurants;
        if (restaurants.length == 1) {
            full_order = true;
        }
        var order_completed = restaurants.length;
        var combined_id = Math.floor(Math.random() * 9000000) + 1000000;
        for (var i = 0; i < restaurants.length; i++) {
            log.info(dishes_ordered[restaurants[i].name]);
            if (dishes_ordered[restaurants[i].name]) {
                if (restaurants[i].open_status) {
                    if (Object.keys(dishes_ordered).length > 1) {
                        if (i != 0) {
                            req.body.delivery_enabled = false;

                        } else {
                            req.body.delivery_enabled = true;
                        }
                    }
                    var total_price_recieved = 0;
                    var total_price_to_pay = 0;
                    dishes_ordered[restaurants[i].name].forEach(function (d) {
                        total_price_recieved += (d.price_recieved * d.qty);
                        total_price_to_pay += (d.price_to_pay * d.qty);
                    });

                    // log.info(total_price_recieved);
                    var order = new orderTable({
                        address: req.body.address,
                        payment_mode: req.body.payment_mode,
                        payment_status: req.body.payment_mode == 'cod' ? req.body.payment_status : 'pending',
                        area: req.body.area,
                        combined_id: combined_id,
                        full_order: full_order,
                        coupon: req.body.coupon_code,
                        locality: req.body.locality,
                        city: req.body.city,
                        location: location,
                        delivery_enabled:restaurants[i].delivery_enabled && req.body.delivery_enabled,
                        // delivery: {
                        //     // enabled: restaurants[i].delivery_enabled && req.body.delivery_enabled
                        //     enabled: true
                        // },
                        total_price_recieved: total_price_recieved,
                        total_price_to_pay: total_price_to_pay,
                        delivery_price_recieved: delivery_price_recieved,
                        delivery_price_to_pay: delivery_price_to_pay,
                        customer_name: req.body.customer_name,
                        customer_number: req.body.customer_number,
                        customer_email: req.body.customer_email,
                        dishes_ordered: dishes_ordered[restaurants[i].name],
                        restaurant_assigned: restaurants[i].name,
                        status: (req.body.payment_mode == 'cod'||req.body.payment_mode == 'online') ? status : 'pending payment',
                        source: source
                    });
                    order.save(function (err, order, info) {
                        order_completed--;
                        if (!err) {
                            ordersList.push(order);
                            if (order_completed == 0) {
                                if (ordersList.length < restaurants.length) {
                                    def.reject({status: 500, message: config.get('error.dberror')});
                                    for (var l = 0; l < ordersList.length; l++) {
                                        log.info("removing order")
                                        orderTable.remove({_id: ordersList[l]}, function (err, info) {
                                        })
                                    }
                                } else {

                                    //payu
                                    log.info('/getShaKey');
                                    var shasum = crypto2.createHash('sha512');
                                    var txnid = '#txnid' + combined_id;
                                    var dataSequence = config.payu.key
                                        + '|' + txnid
                                        + '|' + parseFloat(parseFloat(delivery_price_recieved).toFixed(2))
                                        + '|' + 'food'
                                        + '|' + req.body.customer_name
                                        + '|' + req.body.customer_email
                                        + '|||||||||||'
                                        + config.payu.salt;
                                    var resultKey = shasum.update(dataSequence).digest('hex');
                                    log.info(dataSequence);
                                    log.info(resultKey);

                                    def.resolve({
                                        id: combined_id,
                                        key: config.payu.key,
                                        hash: resultKey,
                                        txnid: txnid,
                                        firstname: req.body.customer_name,
                                        email: req.body.customer_email,
                                        phone: req.body.customer_number,
                                        payu_url: config.payu.url,
                                        surl: config.base_url + '/api/v1/order/paymentstatus/success/' + combined_id,
                                        furl: config.base_url + '/api/v1/order/paymentstatus/failed/' + combined_id,
                                        price: parseFloat(parseFloat(delivery_price_recieved).toFixed(2))
                                    });

                                    // if (req.body.payment_mode == 'cod'){
                                        var dishes=[];
                                        for(var name in req.body.dishes_ordered){
                                            dishes.push({identifier:name,qty:req.body.dishes_ordered[name].qty,price_recieved:req.body.dishes_ordered[name].price});
                                        }
                                        var new_order=JSON.parse(JSON.stringify(order));
                                        new_order.dishes_ordered=dishes
                                    if(new_order.payment_mode!="payu"){
                                        orderLogic.createMail(new_order);
                                        ordersList.forEach(function(order){
                                            orderLogic.createRestaurantMail(order);
                                            orderLogic.createAdminMail(order);

                                        })
                                    }
                                    // }
                                }
                            }
                        } else {
                            log.info(err);
                            if (order_completed == 0) {
                                def.reject({status: 500, message: config.get('error.dberror')});
                                for (var l = 0; l < ordersList.length; l++) {
                                    orderTable.remove({_id: ordersList[l]}, function (err, info) {

                                    })
                                }
                            }
                        }
                    });
                } else {
                    order_completed--;
                    log.info("restaurant closed");
                    def.reject({status: 500, message: config.get('error.dberror')});

                }

            } else {
                order_completed--;
                log.info("restaurant not used");
            }
        }

        return def.promise;
    },
    createMail: function (order) {
        order.track_link=config.get('server_url')+"/track.html?orderid="+order.combined_id;
        ejs.renderFile('./public/user/email_templates/order_placed_user.html', {order:order}, function(err, str){
            // str => Rendered HTML string
            log.info(err,str);
            var email = {
                subject: "Zasty Order - ID - " + order.combined_id,
                message: str,
                plaintext: str
            };

            email.toEmail = order.customer_email;
            events.emitter.emit("mail", email);
            var id=order.combined_id;
            if(order.source.name!="website"&&order.source.id){
                id=order.source.id
            }
            if(order.payment_mode=='cod'){
                events.emitter.emit("sms", {number: order.customer_number, message: "Dear "+order.customer_name+" , we have successfully recieved your order. " +
                "Your Order "+id+" will be delivered shortly.Please pay Rs."+order.delivery_price_recieved+" to the delivery executive Thanks for using ZASTY! track your order here http://zasty.co/track.html?orderid="+order.combined_id})
            }else{
                events.emitter.emit("sms", {number: order.customer_number, message: "Dear "+order.customer_name+" , we have successfully recieved your order. " +
                "Your Order "+id+" will be delivered shortly. Total bill amount Rs."+order.delivery_price_recieved+" Thanks for using ZASTY! track your order here http://zasty.co/track.html?orderid="+order.combined_id})
            }
        });
    },
    createRestaurantMail:function(order){
        ejs.renderFile('./public/user/email_templates/order_placed_kp.html', {order:order}, function(err, str){
            var email = {
                subject: "New Order ID - " + order._id,
                message: str,
                plaintext: str
            };
            userTable.findOne({restaurant_name: order.restaurant_assigned}, function (err, doc) {
                if (doc && doc.email) {
                    if (doc.phonenumber) {
                        var dish_names=""
                        order.dishes_ordered.forEach(function (d) {
                            dish_names += d.qty + "-" + d.identifier+" ";
                        });
                        var message = "you have received a new order "+order._id+" from ZASTY. " +
                            "Prepare "+dish_names+" Order will be picked up in 20 minutes.";
                        if(order.payment_mode=="cod"){
                            message +=". collect cash "+order.delivery_price_recieved;
                        }
                        log.info("sending sms");
                        events.emitter.emit("sms", {number: doc.phonenumber, message: message})
                    }
                    email.toEmail = doc.email;
                    events.emitter.emit("mail", email);
                }
            });
        });
    },
    createAdminMail:function(order){
        ejs.renderFile('./public/user/email_templates/order_placed_admin.html', {order:order}, function(err, str){
            var email = {
                subject: "New Order ID - " + order._id,
                message: str,
                plaintext: str
            };
            events.emitter.emit("mail_admin", email);
            userTable.findOne({is_admin: true}, function (err, doc) {
                if (doc) {
                    if (doc.phonenumber) {
                        var dish_names=""
                        order.dishes_ordered.forEach(function (d) {
                            dish_names += d.qty + "-" + d.identifier+" ";
                        });
                        var message = "you have received a new order from "+order.customer_name+" "+order.address+", "+order.area+", "+order.city+" " +
                            "with combined order number "+order.combined_id+" and split number"+order._id+" assigned to"+order.restaurant_assigned+". Items "+dish_names+". Total order value "+order.delivery_price_recieved+" .";
                        if(order.payment_mode=="cod"){
                            message +=". collect cash "+order.delivery_price_recieved;
                        }
                        log.info("sending sms");
                        events.emitter.emit("sms", {number: doc.phonenumber, message: message})
                    }
                }
            });
        });
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
    getcoupon: function (req, name) {
        var def = q.defer();
        if (name) {
            couponTable.findOne({name: name, is_active: true}, "name off", function (err, coupon) {
                if (!err) {
                    if (coupon) {
                        def.resolve(coupon);
                    } else {
                        def.resolve({});
                    }
                } else {
                    def.reject({status: 500, message: config.get('error.dberror')});

                }
            })
        } else {
            def.resolve({});
        }
        return def.promise;
    },
    checkCode:function(req){
        var def=q.defer();
        userTable.findOne({email:req.body.customer_email},"pin",function(err,user){
           if(!err&&user){
               log.info(user,req.body);
               if(user.pin==req.body.code){
                   user.pin=""
                   user.save(function(err,user,info){
                       def.resolve();
                   });
               }else{
                   def.reject({status: 400, message: config.get('error.badrequest')});
               }
           } else{
               def.reject({status: 500, message: config.get('error.dberror')});
           }
        });
        return def.promise;
    },
    saveAddress: function (req) {
        var def = q.defer();
        var address = {
            address: req.body.address,
            area: req.body.area,
            locality: req.body.locality,
            city: req.body.city,
        };
        userTable.update({email: req.body.customer_email}, {$addToSet: {address: address}}, function (err, info) {
            if (!err) {
                def.resolve("saved address");
            } else {
                def.reject({status: 500, message: config.get('error.dberror')});
            }
        })
        return def.promise;
    },
    deliveryCallback: function (req) {
        var def = q.defer();
        log.info(req.body);
        orderTable.findOne({_id: req.params.order_id}, function (err, doc) {
            if (err || !doc) {
                def.reject({status: 500, message: config.get('error.dberror')});
            }
            if(req.body.rider_name){
                doc.delivery_person_alloted=req.body.rider_name;
            }
            if(req.body.rider_contact){
                doc.delivery_person_contact=req.body.rider_contact;
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
                userTable.findOne({is_admin: true}, function (err, user) {
                    if (!err && user && user.phonenumber) {
                        events.emitter.emit("sms", {
                            number: user.phonenumber,
                            message: "order delivery service issue for order id-" + doc._id,
                        })
                    }

                });
            }
            doc.save();
            def.resolve(doc);
        });
        return def.promise;
    },
    paymentCallback: function (req) {
        var def = q.defer();
        var pay = new paymentTable({
            params: req.params,
            status: req.params.status,
            order_id: req.params.order_id,
            body: req.body
        });
        pay.save(function (err, doc) {
            log.info(pay);
            if (err) {
                log.info(err, pay);
                return def.reject();
            }
            if (req.params.status === 'success') {
                orderTable.update(
                    {combined_id: req.params.order_id},
                    {
                        payment_status: req.body.status,
                        status: "awaiting response",
                        payment_mihpayid: req.body.mihpayid,
                        payment_id: req.body.txnid
                    },
                    {multi: true},
                    function (err, info) {
                        if (!err) {
                            def.resolve(doc);
                            //send email after finsing orders
                            orderTable.find({combined_id: req.params.order_id}, function (err, docs) {
                                if(!err&&docs!=[]){
                                    var dishes=[]
                                    docs.forEach(function (order) {
                                        orderLogic.createRestaurantMail(order);
                                        for(var i=0;i<order.dishes_ordered.length;i++){
                                            dishes.push(order.dishes_ordered[i]);
                                        }
                                    });
                                    log.info(dishes);
                                    docs[0].dishes_ordered=dishes;
                                    orderLogic.createMail(docs[0]);
                                    orderLogic.createAdminMail(docs[0]);
                                }
                            });
                        } else {
                            def.reject();
                        }
                    });
            } else {
                orderTable.update(
                    {combined_id: req.params.order_id},
                    {
                        payment_status: req.body.status,
                        status: "payment fail",
                        payment_mihpayid: req.body.mihpayid,
                        payment_id: req.body.txnid
                    },
                    {multi: true},
                    function (err, info) {

                    });
                var text = "Order Payment Fail -" + "\n" + JSON.stringify(req.body, null, '\t')
                    + "\n" + JSON.stringify(req.params, null, '\t');

                var email = {
                    subject: "Payu Payment Failed for Combined Order ID: " + req.params.order_id,
                    message: text,
                    plaintext: text
                };
                events.emitter.emit("mail_admin", email);
                def.reject();
            }
        });
        return def.promise;
    },
    getorderDetails:function(req){
        var def=q.defer();
        orderTable.find({combined_id:req.query.id},function(err,orders){
            if(!err&&orders!=[]){
                def.resolve(orders);
            }else{
                def.reject({status: 500, message: config.get('error.dberror')});
            }
        })
        return def.promise;
    },
    getcombinedstatus:function(req,orders){
        var def=q.defer();
        var details={
            dishes:[],
            off:Number,
            total:String,
            status:String,
            address:String,
            area: String,
            locality: String,
            city: String,
        };
        var dishes=[];
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
            for(var j=0;j<orders[i].dishes_ordered.length;j++){
                dishes.push({name:orders[i].dishes_ordered[j].identifier,price:orders[i].dishes_ordered[j].price_recieved,qty:orders[i].dishes_ordered[j].qty})
            }
            details.off=orders[i].coupon.off;
            details.mode=orders[i].payment_mode;
            details.address=orders[i].address;
            details.area=orders[i].area;
            details.locality=orders[i].locality;
            details.city=orders[i].city;
            details.total=orders[i].delivery_price_recieved;
            details.delivery_person_alloted=orders[i].delivery_person_alloted;
            details.delivery_person_contact=orders[i].delivery_person_contact;
        }
        details.dishes=dishes;
        details.status=status;
        def.resolve(details);
        return def.promise;
    }
};

function randomString(length, chars) {
    var mask = '';
    if (chars.indexOf('a') > -1) mask += 'abcdefghijklmnopqrstuvwxyz';
    if (chars.indexOf('A') > -1) mask += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (chars.indexOf('#') > -1) mask += '0123456789';
    if (chars.indexOf('!') > -1) mask += '~`!@#$%^&*()_+-={}[]:";\'<>?,./|\\';
    var result = '';
    for (var i = length; i > 0; --i) result += mask[Math.round(Math.random() * (mask.length - 1))];
    return result;
}
module.exports = orderLogic;