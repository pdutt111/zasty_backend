/**
 * Created by pariskshitdutt on 31/07/16.
 */
var express = require('express');
var router = express.Router();
var params = require('parameters-middleware');
var config= require('config');
var jwt = require('jwt-simple');
var moment= require('moment');
var async= require('async');
var db=require('../db/DbSchema');
var events = require('../events');
var log = require('tracer').colorConsole(config.get('log'));
var apn=require('../notificationSenders/apnsender');
var gcm=require('../notificationSenders/gcmsender');
var orderLogic=require('../logic/Order');



router.get('/city',
    function(req,res,next){
        orderLogic.findCity(req)
            .then(function(cities){
                res.json(cities)
            })
            .catch(function(err){
                res.status(err.status).json(err.message);
            })
    });
router.get('/locality',
    params({query:['city']},
        {message : config.get('error.badrequest')}),
    function(req,res,next){
        orderLogic.findLocalities(req)
            .then(function(cities){
                res.json(cities)
            })
            .catch(function(err){
                res.status(err.status).json(err.message);
            })
    });
router.get('/area',
    params({query:['city','locality']},
        {message : config.get('error.badrequest')}),
    function(req,res,next){
        orderLogic.findArea(req)
            .then(function(cities){
                res.json(cities)
            })
            .catch(function(err){
                res.status(err.status).json(err.message);
            })
    });
router.get('/servicingRestaurant',
    params({query:['area']},
        {message : config.get('error.badrequest')}),
    function(req,res,next){
        orderLogic.findServicingRestaurant(req)
            .then(function(cities){
                res.json(cities)
            })
            .catch(function(err){
                res.status(err.status).json(err.message);
            })
    });
router.post('/order',
    params({body:['city','area','locality','address','lon','lat','dishes_ordered','restaurant_name']},
        {message : config.get('error.badrequest')}),
    function(req,res,next){
       orderLogic.findActualRates()
    });


module.exports = router;
