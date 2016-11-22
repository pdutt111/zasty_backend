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
var saving={};
events.emitter.on("fetch_nomnom",function(data){
    log.info("fetching nomnom")
    nomnom_login(data).
        then(function(data){
            return fetch_orders(data);
        })
        .then(function(data){
            for(var i=0;i<data.order_ids.length;i++){
                queue.push({restaurant_name:data.restaurant_name,order_id:data.order_ids[i],token:data.token,serviced_by:data.serviced_by}, function(err) {
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
    restaurantTable.findOne({name:data.restaurant_name},"nomnom_username nomnom_password dishes name").populate("dishes.details").exec(function(err,restaurant){
        if(!err&&restaurant){
            data.username=restaurant.nomnom_username;
            data.password=restaurant.nomnom_password;
            nomnom_login(data)
                .then(function(data){
                    return fetchDishes(data);
                })
                .then(function (data) {
                    for(var l=0;l<restaurant.dishes.length;l++){
                        for(var i=0;i<data.dishes.length;i++){
                            for(var j=0;j<data.dishes[i]._source.variations.length;j++){
                                for(var k=0;k<data.dishes[i]._source.variations[j].quantities.length;k++){
                                    if(data.dishes[i]._source.variations[j].quantities[k]
                                            .nomnom_name.toLowerCase().replace("portion","")
                                            .replace(/-/g,"").replace("regular","")
                                            .replace(/  /g," ").trim().replace(/  /g," ")==
                                        restaurant.dishes[l].details.nomnom_name.replace(/-/g,"").toLowerCase()){
                                        data.dish_id=data.dishes[i]._source.variations[j].quantities[k].variation;
                                        log.debug("changing name for",restaurant.dishes[l].details.nomnom_name.replace(/-/g,"").toLowerCase())
                                        data.main_dish_id=data.dishes[i]._source.id;
                                        data.main_enable=0;
                                        changemaindishstatus(data)
                                            .then(function(){
                                                log.info("dish status changed");
                                            })
                                            .catch(function(err){
                                                log.error("error in disabling dish",err);
                                            })
                                    }
                                }
                            }
                        }
                        // if(restaurant.dishes[i].availability){
                        //     events.emitter.emit('dish_change_status',
                        //         {dish_name:restaurant.dishes[i].details.identifier,restaurant_name:restaurant.name,enable:1});
                        // }else{
                        //     events.emitter.emit('dish_change_status',
                        //         {dish_name:restaurant.dishes[i].details.identifier,restaurant_name:restaurant.name,enable:0});
                        // }

                    }
                })

        }else{
            log.info("error in turning off restaurant nomnom");
        }
    });
});
events.emitter.on('open_restaurant_nomnom',function(data){
    restaurantTable.findOne({name:data.restaurant_name},"nomnom_username nomnom_password dishes name").populate("dishes.details").exec(function(err,restaurant){
        if(!err&&restaurant){
            data.username=restaurant.nomnom_username;
            data.password=restaurant.nomnom_password;
            nomnom_login(data)
                .then(function(data){
                    return fetchDishes(data);
                })
                .then(function (data) {
                    for(var l=0;l<restaurant.dishes.length;l++){
                        for(var i=0;i<data.dishes.length;i++){
                            for(var j=0;j<data.dishes[i]._source.variations.length;j++){
                                for(var k=0;k<data.dishes[i]._source.variations[j].quantities.length;k++){
                                    if(data.dishes[i]._source.variations[j].quantities[k]
                                            .nomnom_name.toLowerCase().replace("portion","")
                                            .replace(/-/g,"").replace("regular","")
                                            .replace(/  /g," ").trim().replace(/  /g," ")==
                                        restaurant.dishes[l].details.nomnom_name.replace(/-/g,"").toLowerCase()){
                                        data.dish_id=data.dishes[i]._source.variations[j].quantities[k].variation;
                                        log.debug("changing name for",restaurant.dishes[l].details.nomnom_name.replace(/-/g,"").toLowerCase())
                                        data.main_dish_id=data.dishes[i]._source.id;
                                        data.main_enable=1;
                                        data.enable=0;
                                        if(restaurant.dishes[l].availability){
                                            data.enable=1;
                                        }
                                        changemaindishstatus(data)
                                            // .then(function(data){
                                            //     return disableDish(data)
                                            // })
                                            .then(function(){
                                            })
                                            .catch(function(err){
                                            })                                    }
                                }
                            }
                        }
                        // if(restaurant.dishes[i].availability){
                        //     events.emitter.emit('dish_change_status',
                        //         {dish_name:restaurant.dishes[i].details.identifier,restaurant_name:restaurant.name,enable:1});
                        // }else{
                        //     events.emitter.emit('dish_change_status',
                        //         {dish_name:restaurant.dishes[i].details.identifier,restaurant_name:restaurant.name,enable:0});
                        // }

                    }
                })

        }else{
            log.info("error in turning off restaurant nomnom");
        }
    });
});

events.emitter.on('dish_change_status',function(data){
    log.debug(data);
    restaurantTable.findOne({name:data.restaurant_name},"nomnom_username nomnom_password",function(err,restaurant){
        data.username=restaurant.nomnom_username;
        data.password=restaurant.nomnom_password;
        log.debug(data);
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
},1);
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
            for(var i=0;i<body[0].sub_order.items.length;i++){
                var name=body[0].sub_order.items[i].dish_name;
                if(body[0].sub_order.items[i].dish_variation_name!='-'){
                    name=name+" "+body[0].sub_order.items[i].dish_variation_name;
                }
                if(body[0].sub_order.items[i].dish_quantity_name!="Portion"&&body[0].sub_order.items[i].dish_quantity_name!="Regular"){
                    name=name+" "+body[0].sub_order.items[i].dish_quantity_name;
                }
                dishes_ordered[name]={
                    price:body[0].sub_order.items[i].dish_price,
                    qty:body[0].sub_order.items[i].dish_quantity,
                }
            }
            log.info(dishes_ordered);
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
                    var req={}
                    req.body={};
                    if(body[0].source.toLowerCase()=="swiggy"){
                        req.body = {
                            "city": "gurgaon",
                            "area": '',
                            "locality": "gurgaon",
                            "address": '',
                            "dishes_ordered": dishes_ordered,
                            lat: '28',
                            lon: '77',
                            "customer_name": '',
                            "customer_number": '',
                            "restaurant_name": task.restaurant_name,
                            payment_mode: 'cod',
                            status: body[0].status,
                            source: {
                                name: body[0].source,
                                id: body[0].external_source_id
                            }
                        };
                    }else {
                        var id=body[0].id;
                        if(body[0].source.toLowerCase()!="nomnom"){
                            id=body[0].external_source_id;
                        }
                        if(!body[0].address.locality){
                            body[0].address.locality={}
                            body[0].address.locality.name=body[0].address.name;
                        }
                        if(!body[0].address.sub_locality){
                            body[0].address.sub_locality={}
                            body[0].address.sub_locality.latitude='28'
                            body[0].address.sub_locality.longitude='77'
                        }
                        req.body = {
                            "city": "gurgaon",
                            "area": body[0].address.locality.name,
                            "locality": "gurgaon",
                            "address": body[0].address.name,
                            "dishes_ordered": dishes_ordered,
                            lat: body[0].address.sub_locality.latitude,
                            lon: body[0].address.sub_locality.longitude,
                            "customer_name": body[0].customer.name,
                            "customer_number": body[0].customer.primary_number,
                            "restaurant_name": task.restaurant_name,
                            payment_mode: 'cod',
                            status: body[0].status,
                            source: {
                                name: body[0].source,
                                id: id
                            }
                        };
                    }
                    if(body[0].source.toLowerCase()=="foodpanda" ||
                        body[0].source.toLowerCase()=="swiggy"){
                        req.body.payment_mode="online"
                        req.body.delivery_enabled=false;
                    }
                    if(body[0].source.toLowerCase()=="foodpanda" &&task.serviced_by==["Z0101Z5IOUK", "Z0101Z5CCP"]){
                        req.body.delivery_enabled=true;
                    }
                    log.info(req.body);
                            orderLogic.findActualRates(req, task.serviced_by)
                                .then(function(restaurant){
                                    return orderLogic.createDishesOrderedList(req,restaurant);
                                })
                                .then(function(data){
                                    log.info(data.id);
                                    orderTable.find({'source.id':data.id},"_id",function(err,rows){
                                        if(!err&&rows.length==0&&!saving[id]){
                                            log.debug(err,rows.length,saving[id],id);
                                            saving[id]=true;
                                            return orderLogic.saveOrder(req,data.dishes_ordered,data.restaurant);
                                        }else{
                                            log.warn(!err,rows.length,!saving[body[0].id])
                                        }
                                    })
                                })
                                .then(function(order){
                                    delete saving[id];
                                     callback();
                                })
                                .catch(function(err){
                                    delete saving[id];
                                    callback();
                                    log.err(err);
                                    // userTable.findOne({is_admin: true}, function (err, user) {
                                    //     if (!err && user && user.phonenumber) {
                                    //         events.emitter.emit("sms", {
                                    //             number: user.phonenumber,
                                    //             message: "Error in fetching order from nomnom please look at nomnom panel for restaurant"+task.restaurant_name,
                                    //         })
                                    //     }
                                    //
                                    // });
                                });


                })
                .catch(function(err){
                    log.warn(err);
                    callback();
                    // userTable.findOne({is_admin: true}, function (err, user) {
                    //     if (!err && user && user.phonenumber) {
                    //         events.emitter.emit("sms", {
                    //             number: user.phonenumber,
                    //             message: "Error in fetching order from nomnom please look at nomnom panel for restaurant"+task.restaurant_name,
                    //         })
                    //     }
                    //
                    // });
                })
        }catch(e){
            log.debug(e)
            callback();
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
    dishTable.find({nomnom_name:{$in:Object.keys(dishes)}},"nomnom_name identifier",function(err,rows){
        for(var i=0;i<rows.length;i++){
            var row=rows[i];
            if(dishes[row.nomnom_name]){
                dishes_ordered[row.identifier]=dishes[row.nomnom_name];
            }else{
                def.reject();
                return;
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
            log.info(body);
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
            // status: data.status,
            update_status: true
        }
    }
    else if(data.status=='dispatched'){
        data.status="restaurant_dispatched";
        body= {
            id: data.source,
            status: data.status,
            delivery_boy_details: "restaurant",
            delivery_boy_name: data.order.delivery_person_alloted ? data.order.delivery_person_alloted : "none",
            delivery_boy_number: data.order.delivery_person_contact ? data.order.delivery_person_contact:"0000000000",
            update_status: true
        }
    }else if(data.status=='confirmed'){
        data.status="restaurant_confirmed";
        body= {
            id: data.source,
            status: "restaurant_confirmed",
            update_status: true
        }
    }else if(data.status=='rejected'){
        data.status='canceled';
        body= {
            id: data.source,
            message:"rejected",
            status: data.status,
            update_status: true
        }
    }
    //delivery_boy_details:"restaurant"
    //delivery_boy_name:"HAM"
    //delivery_boy_number:1234567809
    log.info("http://restaurant.gonomnom.in/nomnom/order_restaurant/"+data.source+"/",body);
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
    log.debug(data);
    dishTable.findOne({identifier:data.dish_name},"nomnom_name",function(err,dish){
        log.debug(dish.nomnom_name)
        for(var i=0;i<data.dishes.length;i++){
            for(var j=0;j<data.dishes[i]._source.variations.length;j++){
                for(var k=0;k<data.dishes[i]._source.variations[j].quantities.length;k++){
                    if(data.dishes[i]._source.variations[j].quantities[k]
                            .nomnom_name.toLowerCase().replace("portion","")
                            .replace(/-/g,"").replace("regular","").replace(/  /g," ").trim().replace(/  /g," ")==dish.nomnom_name.replace(/-/g,"").toLowerCase()){
                        data.dish_id=data.dishes[i]._source.variations[j].quantities[k].variation;
                        log.debug("found");
                        def.resolve(data);
                        break;
                    }
                }
            }
        }
    });
    return def.promise;
}
function disableDish(data){
    var def=q.defer();
    log.debug(data.dish_id,data.enable);
    request({
        url:"http://restaurant.gonomnom.in/nomnom/variation/"+data.dish_id+"/",
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
        log.debug(err,body);
        try{
            if(body.success=="Updated"){
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
function changemaindishstatus(data){
    var def=q.defer();
    request({
        url:"http://restaurant.gonomnom.in/nomnom/restaurant_dish/"+data.main_dish_id+"/",
        method:"PUT",
        body:{
            is_available:data.main_enable
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
            if(body.success=="Updated"){
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
setInterval(function(){
    restaurantTable.find({is_verified:true,open_status:true}, "nomnom_username nomnom_password name servicing_restaurant",
        function (err, restaurants) {
            if (restaurants.length>0) {
                restaurants.forEach(function(restaurant){
                    if (restaurant.nomnom_username) {
                        events.emitter.emit("fetch_nomnom",
                            {
                                username: restaurant.nomnom_username,
                                password: restaurant.nomnom_password,
                                name: restaurant.name,
                                serviced_by:restaurant.servicing_restaurant
                            });
                    }
                });
            }
        });
},10000);

// setInterval(function(){
//     restaurantTable.find({is_verified:true,open_status:true}, "nomnom_username nomnom_password name servicing_restaurant",
//         function (err, restaurants) {
//             if (restaurants.length>0) {
//                 restaurants.forEach(function(restaurant){
//                     if (restaurant.nomnom_username) {
//                         if(restaurant.open_status){
//                             events.emitter.emit("open_restaurant_nomnom",
//                                 {
//                                     username: restaurant.nomnom_username,
//                                     password: restaurant.nomnom_password,
//                                     name: restaurant.name,
//                                 });
//                         }
//                     }
//                 });
//             }
//         });
// },60*60*1000);