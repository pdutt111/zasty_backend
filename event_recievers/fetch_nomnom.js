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
                response.token=body.data.access_token;
                response.restaurant_name=data.name;
                def.resolve(response);
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