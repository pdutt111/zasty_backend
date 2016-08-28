var express = require('express');
var router = express.Router();
var params = require('parameters-middleware');
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
var restaurantLogic=require('../logic/restaurant');



router.get('/protected/restaurant/all',
    function(req,res,next){
        restaurantLogic.checkAdmin(req)
            .then(function(){
                next();
            })
            .catch(function(err){
                res.status(err.status).json(err.message);
            })
    },
    function(req,res){
        restaurantLogic.getRestaurants(req)
            .then(function(restaurant){
                res.json(restaurant);
            })
            .catch(function(err){
                res.status(err.status).json(err.message);
            })
    });
router.put('/protected/restaurant/:name',
    params({body:['location','contact_number','contact_name','dishes']},
    {message : config.get('error.badrequest')}),
    function(req,res){
        restaurantLogic.addRestaurant(req)
            .then(function(info){
                res.json(info);
            })
            .catch(function(err){
                res.status(err.status).json(err.message);
            })
    });
router.post('/protected/restaurant/:name/verify',
    function(req,res,next){
        restaurantLogic.checkAdmin(req)
            .then(function(){
                next();
            })
            .catch(function(err){
                res.status(err.status).json(err.message);
            })
    },
    function(req,res){
        restaurantLogic.verifyRestaurant(req)
            .then(function(info){
                res.json(info);
            })
            .catch(function(err){
                res.status(err.status).json(err.message);
            })
    });
router.get('/protected/restaurant/:name',
    function(req,res,next){
        restaurantLogic.checkProperUser(req)
            .then(function(){
                next();
            })
            .catch(function(err){
                res.status(err.status).json(err.message);
            })
    },
    function(req,res){
        restaurantLogic.getRestaurant(req)
            .then(function(restaurant){
                res.json(restaurant);
            })
            .catch(function(err){
                res.status(err.status).json(err.message);
            })
    });
router.delete('/protected/restaurant/:name',
    function(req,res,next){
        restaurantLogic.checkProperUser(req)
            .then(function(){
                next();
            })
            .catch(function(err){
                res.status(err.status).json(err.message);
            })
    },
    function(req,res){
        restaurantLogic.deleteRestaurant(req)
            .then(function(info){
                res.json(info);
            })
            .catch(function(err){
                res.status(err.status).json(err.message);
            })
    });
router.post('/protected/restaurant/:name/update',
    function(req,res,next){
        restaurantLogic.checkProperUser(req)
            .then(function(){
                next();
            })
            .catch(function(err){
                res.status(err.status).json(err.message);
            })
    },
    function(req,res){
        restaurantLogic.modifyRestaurant(req)
            .then(function(info){
                res.json(info);
            })
            .catch(function(err){
                res.status(err.status).json(err.message);
            })
    });
router.post('/protected/restaurant/:name/open',
    function(req,res,next){
        restaurantLogic.checkProperUser(req)
            .then(function(){
                next();
            })
            .catch(function(err){
                res.status(err.status).json(err.message);
            })
    },
    function(req,res){
        restaurantLogic.openRestaurant(req)
            .then(function(info){
                res.json(info);
            })
            .catch(function(err){
                res.status(err.status).json(err.message);
            })
    });
router.post('/protected/restaurant/:name/close',
    function(req,res,next){
        restaurantLogic.checkProperUser(req)
            .then(function(){
                next();
            })
            .catch(function(err){
                res.status(err.status).json(err.message);
            })
    },
    function(req,res){
        restaurantLogic.closeRestaurant(req)
            .then(function(info){
                res.json(info);
            })
            .catch(function(err){
                res.status(err.status).json(err.message);
            })
    });

router.get('/protected/restaurant/:name/orders',
    function(req,res,next){
        restaurantLogic.checkProperUser(req)
            .then(function(){
                next();
            })
            .catch(function(err){
                res.status(err.status).json(err.message);
            })
    },
    function(req,res){
        restaurantLogic.getOrders(req)
            .then(function(restaurant){
                res.json(restaurant);
            })
            .catch(function(err){
                res.status(err.status).json(err.message);
            })
    });
router.get('/protected/restaurant/:name/orders/live',
    function(req,res,next){
        res.header("Cache-Control", "no-cache, no-store, must-revalidate");
        res.header("Pragma", "no-cache");
        res.header("Expires", 0);
        next();
    },
    function(req,res,next){
        restaurantLogic.checkProperUser(req)
            .then(function(){
                next();
            })
            .catch(function(err){
                res.status(err.status).json(err.message);
            })
    },
    function(req,res){
        restaurantLogic.getLiveOrders(req)
            .then(function(restaurant){
                res.json(restaurant);
            })
            .catch(function(err){
                res.status(err.status).json(err.message);
            })
    });
router.get('/protected/restaurant/:name/orders/unpaid',
    function(req,res,next){
        res.header("Cache-Control", "no-cache, no-store, must-revalidate");
        res.header("Pragma", "no-cache");
        res.header("Expires", 0);
        next();
    },
    function(req,res,next){
        restaurantLogic.checkProperUser(req)
            .then(function(){
                next();
            })
            .catch(function(err){
                res.status(err.status).json(err.message);
            })
    },
    function(req,res){
        restaurantLogic.getUnpaidOrders(req)
            .then(function(restaurant){
                res.json(restaurant);
            })
            .catch(function(err){
                res.status(err.status).json(err.message);
            })
    });


router.get('/protected/restaurant/:name/order',
    params({query:['order_id']},
        {message : config.get('error.badrequest')}),
    function(req,res,next){
        restaurantLogic.checkProperUser(req)
            .then(function(){
                next();
            })
            .catch(function(err){
                res.status(err.status).json(err.message);
            })
    },
    function(req,res){
        restaurantLogic.getOrder(req)
            .then(function(restaurant){
                res.json(restaurant);
            })
            .catch(function(err){
                res.status(err.status).json(err.message);
            })
    });
router.post('/protected/restaurant/:name/order/confirm',
    params({body:['order_id']},
        {message : config.get('error.badrequest')}),
    function(req,res,next){
        restaurantLogic.checkProperUser(req)
            .then(function(){
                next();
            })
            .catch(function(err){
                res.status(err.status).json(err.message);
            })
    },
    function(req,res){
        restaurantLogic.confirmOrder(req)
            .then(function(restaurant){
                res.json(restaurant);
            })
            .catch(function(err){
                res.status(err.status).json(err.message);
            })
    });
router.post('/protected/restaurant/:name/order/reject',
    params({body:['order_id']},
        {message : config.get('error.badrequest')}),
    function(req,res,next){
        restaurantLogic.checkProperUser(req)
            .then(function(){
                next();
            })
            .catch(function(err){
                res.status(err.status).json(err.message);
            })
    },
    function(req,res){
        restaurantLogic.rejectOrder(req)
            .then(function(restaurant){
                res.json(restaurant);
            })
            .catch(function(err){
                res.status(err.status).json(err.message);
            })
    });
router.post('/protected/restaurant/:name/order/status',
    params({body:['status','order_id']},
        {message : config.get('error.badrequest')}),
    function(req,res,next){
        restaurantLogic.checkProperUser(req)
            .then(function(){
                next();
            })
            .catch(function(err){
                res.status(err.status).json(err.message);
            })
    },
    function(req,res){
        restaurantLogic.changeOrderStatus(req)
            .then(function(restaurant){
                res.json(restaurant);
            })
            .catch(function(err){
                res.status(err.status).json(err.message);
            })
    });
module.exports = router;
