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

events.emitter.on("fetch_nomnom",function(data){
    nomnom_login(data).
        then(function(data){
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
var queue = async.queue(function(task, callback) {
    request({
        url:"http://restaurant-test.gonomnom.in/nomnom/order_restaurant/?order_id="+task.order_id,
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
                dishes_ordered[body[0].sub_order.items[i].dish_name]={
                    price:body[0].sub_order.items[i].dish_price,
                    qty:body[0].sub_order.items[i].dish_quantity,
                }
            }
            log.info(dishes_ordered);
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
            req.body={
                "city":body[0].address.city.name,
                "area":body[0].address.locality.name,
                "locality":body[0].address.sub_locality.name,
                "address":body[0].address.sub_locality.name,
                "dishes_ordered":dishes_ordered,
                lat:body[0].address.sub_locality.latitude,
                lon:body[0].address.sub_locality.longitude,
                "customer_name":body[0].customer.name,
                "customer_number":body[0].customer.primary_number,
                "restaurant_name":task.restaurant_name,
                status:body[0].status,
                source:{
                    name:"nomnom",
                    id:body[0].id
                }
            };
            orderTable.find({'source.id':body[0].id},"_id",function(err,rows){
                if(!err&&rows.length==0){
                    orderLogic.findActualRates(req)
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
                            callback();
                        });
                }
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

function nomnom_login(data){
    var def= q.defer();
    request({
        url:"http://restaurant-test.gonomnom.in/nomnom/agent_login/",
        method:"POST",
        body:{email:data.username,password:data.password},
        json:true
    },function(err,response,body){
        var response={};
        try{
            if(body.data.access_token){
                data.token=body.data.access_token;
                data.restaurant_name=data.name;
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
        url:"http://restaurant-test.gonomnom.in/nomnom/order_restaurant/",
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
    if(data.status=='prepared'){
        data.status="order_prepared"
    }
    else if(data.status=='dispatched'){
        data.status="order_dispatched";
    }else if(data.status=='confirmed'){
        data.status="restaurant_confirmed";
    }else if(data.status=='rejected'){
        data.status='canceled';
    }
    //delivery_boy_details:"restaurant"
    //delivery_boy_name:"HAM"
    //delivery_boy_number:1234567809
    log.info(data);
    log.info("http://restaurant-test.gonomnom.in/nomnom/order_restaurant/"+data.source+"/");
    request({
        url:"http://restaurant-test.gonomnom.in/nomnom/order_restaurant/"+data.source+"/",
        method:"PUT",
        body:{
            id:data.source,
            osl_status:data.status,
            update_status:true
        },
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