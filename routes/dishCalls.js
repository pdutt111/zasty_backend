/**
 * Created by pariskshitdutt on 26/07/16.
 */
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

router.use('/protected/restaurant/:name/dishes',
    function(req,res,next){
        restaurantLogic.checkProperUser(req)
            .then(function(){
                next();
            })
            .catch(function(err){
                res.status(err.status).json(err.message);
            })
    });
router.get('/protected/restaurant/:name/dishes',
    function(req,res){
        restaurantLogic.getDishes(req)
            .then(function(dishes){
                res.json(dishes);
            })
            .catch(function(err){
                res.status(err.status).json(err.message);
            });
    });
router.post('/protected/restaurant/:name/dishes/add',
    params({body:['dishes']},
        {message : config.get('error.badrequest')}),
    function(req,res){
    restaurantLogic.addDishes(req)
        .then(function(info){
            res.json(info);
        })
        .catch(function(err){
            res.status(err.status).json(err.message);
        })
});
router.post('/protected/restaurant/:name/dishes/disable',
    params({body:['dish_name']},
        {message : config.get('error.badrequest')}),
    function(req,res){
        restaurantLogic.disableDish(req)
            .then(function(info){
                res.json(info);
            })
            .catch(function(err){
                res.status(err.status).json(err.message);
            })
    });
router.post('/protected/restaurant/:name/dishes/enable',
    params({body:['dish_name']},
        {message : config.get('error.badrequest')}),
    function(req,res){
        restaurantLogic.enableDish(req)
            .then(function(info){
                res.json(info);
            })
            .catch(function(err){
                res.status(err.status).json(err.message);
            })
    });
router.post('/protected/restaurant/:name/dishes/update',
    params({body:['dish_name','price']},
        {message : config.get('error.badrequest')}),
    function(req,res){
        restaurantLogic.updateDishPrice(req)
            .then(function(info){
                res.json(info);
            })
            .catch(function(err){
                res.status(err.status).json(err.message);
            })
    });
router.delete('/protected/restaurant/:name/dishes/',
    params({body:['dish_name']},
        {message : config.get('error.badrequest')}),
    function(req,res){
        restaurantLogic.deleteDish(req)
            .then(function(info){
                res.json(info);
            })
            .catch(function(err){
                res.status(err.status).json(err.message);
            })
    });
module.exports = router;