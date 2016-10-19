/**
 * Created by pariskshitdutt on 27/08/16.
 */
var config= require('config');
var events = require('../events');
var request=require('request');
var orderLogic=require("../logic/Order");
var async= require('async');
var q= require('q');
var log = require('tracer').colorConsole(config.get('log'));
var db=require('../db/DbSchema');

var orderTable=db.getorderdef;
var userTable=db.getuserdef;
var dishTable=db.getdishdef;
var restaurantTable=db.getrestaurantdef;

events.emitter.on("fetch_nomnom",function(data){
    nomnom_login(data).
        then(function(data){
            log.info(data);
            return fetch_orders(data);
        })
        .then(function(data){
            for(var i=0;i<data.order_ids.length;i++){
                queue.push({restaurant_name:data.restaurant_name,order_id:data.order_ids[i],token:data.token}, function(err) {
                });
            }
        })
        .catch(function(err){
            log.info(err);
        })
});
events.emitter.on('status_change_nomnom',function(data){
    log.info("changing status on nomnom");
    nomnom_login(data)
        .then(function(data){
            return changeStatus(data);
        })
        .then(function(){
            log.info("status changed on nomnom");
        })
        .catch(function(err){
            log.info(err);
        })
});
events.emitter.on('close_restaurant_nomnom',function(data){
    restaurantTable.findOne({name:data.restaurant_name},"nomnom_username nomnom_password dishes",function(err,restaurant){
        data.username=restaurant.nomnom_username;
        data.password=restaurant.nomnom_password;
        data.dishes_zasty=restaurant.dishes;
        nomnom_login(data)
            .then(function(data){
                return fetchDishes(data)
            })
            .then(function(data){
                var dish_map={};
                for(var i=0;i<data.dishes_zasty.length;i++){
                    dish_map[data.dishes_zasty[i].identifier.replace('(Boneless)','').replace('Half','').toLowerCase()]=true;
                }
                for(var i=0;i<data.dishes.length;i++){
                    if(dish_map[data.dishes[i]._source.dish_name.toLowerCase()]){
                        queue2.push({dish_id:data.dishes[i]._id,token:data.token,enable:0}, function(err) {
                        });
                    }
                }
            })
            .catch(function(err){

            })
    });
});
events.emitter.on('open_restaurant_nomnom',function(data){
    restaurantTable.findOne({name:data.restaurant_name},"nomnom_username nomnom_password",function(err,restaurant){
        if(!err&&restaurant){
            data.username=restaurant.nomnom_username;
            data.password=restaurant.nomnom_password;
            nomnom_login(data)
                .then(function(data){
                    return fetchDishes(data)
                })
                .then(function(data){
                    for(var i=0;i<data.dishes.length;i++){
                        queue2.push({dish_id:data.dishes[i]._id,token:data.token,enable:1}, function(err) {
                        });
                    }
                })
                .catch(function(err){

                })
        }else{
            log.info("error in turning off restaurant nomnom");
        }
    });
});

events.emitter.on('dish_change_status',function(data){
    restaurantTable.findOne({name:data.restaurant_name},"nomnom_username nomnom_password",function(err,restaurant){
        data.username=restaurant.nomnom_username;
        data.password=restaurant.nomnom_password;
        nomnom_login(data)
            .then(function(data){
                return fetchDishes(data)
            })
            .then(function(data){
                return findCorrectDish(data);
            })
            .then(function(data){
                return disableDish(data)
            })
            .then(function(){
                log.debug("status changed");
            })
            .catch(function(err){
                log.info(err)
            })
    });
});
var queue2 = async.queue(function(task, callback) {
    disableDish(task)
        .then(function(){
            callback();
        })
        .catch(function (err) {
            callback();
        })
},3);
queue2.drain = function() {
    console.log('restaurant has been turned off');
};
var queue = async.queue(function(task, callback) {
    request({
        url:"http://restaurant.gonomnom.in/nomnom/order_restaurant/?order_id="+task.order_id,
        method:"GET",
        headers:{
            "Access-Token":task.token
        },
        body:{},
        json:true
    },function(err,response,body){
        var response={};
        try{
            var dishes_ordered={}
            log.info(body[0].sub_order.items);
            for(var i=0;i<body[0].sub_order.items.length;i++){
                var name=body[0].sub_order.items[i].dish_name;
                if(body[0].sub_order.items[i].dish_variation_name!='-'){
                    name=name+" "+body[0].sub_order.items[i].dish_variation_name;
                }
                if(body[0].sub_order.items[i].dish_quantity_name!="Portion"){
                    name=name+" "+body[0].sub_order.items[i].dish_quantity_name;
                }
                dishes_ordered[name]={
                    price:body[0].sub_order.items[i].dish_price,
                    qty:body[0].sub_order.items[i].dish_quantity,
                }
            }
            convertDishNames(dishes_ordered)
                .then(function(dishes_ordered){
                    if(body[0].status=="order_prepared"){
                        body[0].status='prepared'
                    }else  if(body[0].status=="order_dispatched"){
                        body[0].status='dispatched'
                    }else  if(body[0].status=="restaurant_confirmed"){
                        body[0].status='confirmed'
                    }else  if(body[0].status=="canceled"){
                        body[0].status='rejected'
                    }else  if(body[0].status=="created"){
                        body[0].status='awaiting response'
                    }
                    log.info(dishes_ordered);
                    var req={}
                    req.body={
                        "city":"gurgaon",
                        "area":body[0].address.locality.name,
                        "locality":"gurgaon",
                        "address":body[0].address.name,
                        "dishes_ordered":dishes_ordered,
                        lat:body[0].address.sub_locality.latitude,
                        lon:body[0].address.sub_locality.longitude,
                        "customer_name":body[0].customer.name,
                        "customer_number":body[0].customer.primary_number,
                        "restaurant_name":task.restaurant_name,
                        payment_mode:'cod',
                        status:body[0].status,
                        source:{
                            name:"nomnom",
                            id:body[0].id
                        }
                    };
                    orderTable.find({'source.id':body[0].id},"_id",function(err,rows){
                        if(!err&&rows.length==0){
                            orderLogic.findRestaurantFromArea(req)
                                .then(function (restaurants) {
                                    return orderLogic.findActualRates(req, restaurants)
                                })
                                .then(function(restaurant){
                                    return orderLogic.createDishesOrderedList(req,restaurant);
                                })
                                .then(function(data){
                                    return orderLogic.saveOrder(req,data.dishes_ordered,data.restaurant);
                                })
                                .then(function(order){
                                    log.info(order);
                                    callback();
                                })
                                .catch(function(err){
                                    log.info(err);
                                    // userTable.findOne({is_admin: true}, function (err, user) {
                                    //     if (!err && user && user.phonenumber) {
                                    //         events.emitter.emit("sms", {
                                    //             number: user.phonenumber,
                                    //             message: "Error in fetching order from nomnom please look at nomnom panel for restaurant"+task.restaurant_name,
                                    //         })
                                    //     }
                                    //
                                    // });
                                    callback();
                                });
                        }
                    })
                })
                .catch(function(){
                    log.info(err);
                    // userTable.findOne({is_admin: true}, function (err, user) {
                    //     if (!err && user && user.phonenumber) {
                    //         events.emitter.emit("sms", {
                    //             number: user.phonenumber,
                    //             message: "Error in fetching order from nomnom please look at nomnom panel for restaurant"+task.restaurant_name,
                    //         })
                    //     }
                    //
                    // });
                    callback();
                })
        }catch(e){
            log.info(e)
        }
    });
}, 3);

// assign a callback
queue.drain = function() {
    console.log('all items have been processed');
};
function convertDishNames(dishes){
    var def=q.defer();
    var dishes_ordered={}
    log.info(Object.keys(dishes));
    dishTable.find({nomnom_name:{$in:Object.keys(dishes)}},"nomnom_name identifier",function(err,rows){
        log.info(rows);
        for(var i=0;i<rows.length;i++){
            var row=rows[i];
            if(dishes[row.nomnom_name]){
                dishes_ordered[row.identifier]=dishes[row.nomnom_name];
            }else{
                def.reject();
                break;
            }
        }
        def.resolve(dishes_ordered);
    });
    return def.promise;
}
function nomnom_login(data){
    var def= q.defer();
    request({
        url:"http://restaurant.gonomnom.in/nomnom/agent_login/",
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:{email:data.username,password:data.password},
        json:true
    },function(err,response,body){
        var response={};
        try{
            if(body.data.access_token){
                data.token=body.data.access_token;
                data.restaurant_name=data.name;
                data.restaurant_id=body.data.restaurant_agent.id;
                def.resolve(data);
            }else{
                def.reject();
            }
        }catch(e){
            def.reject();
        }
    });
    return def.promise;
}
function fetch_orders(data){
    var def= q.defer();
    request({
        url:"http://restaurant.gonomnom.in/nomnom/order_restaurant/",
        method:"GET",
        headers:{
          "Access-Token":data.token
        },
        body:{},
        json:true
    },function(err,response,body){
        try{
            data.order_ids=[];
            for(var i=0;i<body.length;i++){
                data.order_ids.push(body[i].order_id);
            }
            def.resolve(data);
        }catch(e){
            def.reject();
        }
    });
    return def.promise;
}
function changeStatus(data){
    var def= q.defer();
    //order_prepared
    //restaurant_confirmed
    //restaurant_dispatched
    var body={};
    if(data.status=='prepared'){
        data.status="order_prepared"
        body= {
            id: data.source,
            osl_status: data.status,
            update_status: true
        }
    }
    else if(data.status=='dispatched'){
        data.status="order_dispatched";
        body= {
            id: data.source,
            status: data.status,
            delivery_boy_details: "restaurant",
            delivery_boy_name: data.order.delivery_person_alloted,
            delivery_boy_number: data.order.delivery_person_contact,
            update_status: true
        }
    }else if(data.status=='confirmed'){
        data.status="restaurant_confirmed";
        body= {
            id: data.source,
            osl_status: data.status,
            update_status: true
        }
    }else if(data.status=='rejected'){
        data.status='canceled';
        body= {
            id: data.source,
            osl_status: data.status,
            update_status: true
        }
    }
    //delivery_boy_details:"restaurant"
    //delivery_boy_name:"HAM"
    //delivery_boy_number:1234567809
    log.info(data);
    log.info("http://restaurant.gonomnom.in/nomnom/order_restaurant/"+data.source+"/");
    request({
        url:"http://restaurant.gonomnom.in/nomnom/order_restaurant/"+data.source+"/",
        method:"PUT",
        body:body,
        headers:{
            "Access-Token":data.token,
            "Content-Type":"application/json"
        },
        json:true
    },function(err,response,body){
        log.info(err,body);
        try{
           if(body.status==data.status){
               def.resolve();
           }else{
               def.reject();
           }
        }catch(e){
            def.reject();
        }
    });
    return def.promise;
}
function fetchDishes(data){
    var def=q.defer();
    request({
        url:"http://restaurant.gonomnom.in/nomnom/restaurant_dish_list/",
        method:"GET",
        headers:{
            "Access-Token":data.token,
            "Content-Type":"application/json;charset=UTF-8"
        },
        json:true
    },function(err,response,body){
        try{
            if(body){
                data.dishes=body;
                def.resolve(data);
            }else{
                def.reject();
            }
        }catch(e){
            def.reject();
        }
    });
    return def.promise;
}
function findCorrectDish(data){
    var def=q.defer();
    for(var i=0;i<data.dishes.length;i++){
        if(data.dishes[i]._source.dish_name.toLowerCase()==data.dish_name.toLowerCase()){
            data.dish_id=data.dishes[i]._id;
            def.resolve(data);
            break;
        }
    }
    return def.promise;
}
function disableDish(data){
    var def=q.defer();
    request({
        url:"http://restaurant.gonomnom.in/nomnom/restaurant_dish/"+data.dish_id+"/",
        method:"PUT",
        body:{
            is_available:data.enable
        },
        headers:{
            "Origin":"http://restaurant.gonomnom.in",
            "Access-Token":data.token,
            "Content-Type":"application/json;charset=UTF-8"
        },
        json:true
    },function(err,response,body){
        log.info(err,body);
        try{
            if(body.status=="Updated"){
                def.resolve();
            }else{
                def.reject();
            }
        }catch(e){
            def.reject();
        }
    });
    return def.promise;
}

setInterval(function(){
    restaurantTable.find({is_verified:true,open_status:true}, "nomnom_username nomnom_password name",
        function (err, restaurants) {
            if (restaurants.length>0) {
                restaurants.forEach(function(restaurant){
                    if (restaurant.nomnom_username) {
                        events.emitter.emit("fetch_nomnom",
                            {
                                username: restaurant.nomnom_username,
                                password: restaurant.nomnom_password,
                                name: restaurant.name
                            });
                    }
                });
            }
        });
},60000);