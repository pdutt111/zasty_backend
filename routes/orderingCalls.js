/**
 * Created by pariskshitdutt on 31/07/16.
 */
var express = require('express');
var router = express.Router();
var params = require('parameters-middleware');
var config = require('config');
var events = require('../events');
var jwt = require('jwt-simple');
var moment = require('moment');
var async = require('async');
var db = require('../db/DbSchema');
var log = require('tracer').colorConsole(config.get('log'));
var apn = require('../notificationSenders/apnsender');
var gcm = require('../notificationSenders/gcmsender');
var orderLogic = require('../logic/Order');


router.get('/city',
    function (req, res, next) {
        orderLogic.findCity(req)
            .then(function (cities) {
                res.json(cities)
            })
            .catch(function (err) {
                res.status(err.status).json(err.message);
            })
    });
router.get('/locality',
    params({query: ['city']},
        {message: config.get('error.badrequest')}),
    function (req, res, next) {
        orderLogic.findLocalities(req)
            .then(function (cities) {
                res.json(cities)
            })
            .catch(function (err) {
                res.status(err.status).json(err.message);
            })
    });
router.get('/area',
    params({query: ['city', 'locality']},
        {message: config.get('error.badrequest')}),
    function (req, res, next) {
        orderLogic.findArea(req)
            .then(function (cities) {
                res.json(cities)
            })
            .catch(function (err) {
                res.status(err.status).json(err.message);
            })
    });
router.get('/servicingRestaurant',
    params({query: ['area']},
        {message: config.get('error.badrequest')}),
    function (req, res, next) {
        orderLogic.findServicingRestaurant(req)
            .then(function (restaurants) {
                log.info(restaurants);
                return orderLogic.combineRestaurant(req,restaurants);
            })
            .then(function(response){
                res.json(response);
            })
            .catch(function (err) {
                res.status(err.status).json(err.message);
            })
    });
router.post('/order',
    params({body: ['city', 'area', 'locality', 'address', 'dishes_ordered', 'restaurant_name', 'customer_name', 'customer_number']},
        {message: config.get('error.badrequest')}),
    function (req, res, next) {
        orderLogic
            .findRestaurantFromArea(req)
            .then(function(restaurants){
              return orderLogic.findActualRates(req,restaurants)
            })
            .then(function (restaurant) {
                return orderLogic.createDishesOrderedList(req, restaurant);
            })
            .then(function (data) {
                return orderLogic.saveOrder(req, data.dishes_ordered, data.restaurant);
            })
            .then(function (order) {
                res.json(order);
                orderLogic.saveAddress(req)
                    .then(function(info){
                        log.info(info);
                    })
                    .catch(function(err){
                      log.warn(err);
                    });
            })
            .catch(function (err) {
                res.status(err.status).json(err.message);
            })
    });
router.put('/deliverystatus/:order_id',
    params({body: ['sfx_order_id', 'client_order_id', 'order_status']},
        {message: config.get('error.badrequest')}),
    function (req, res, next) {
        log.info('deliverystatus', req.body);
        orderLogic.deliveryCallback(req)
            .then(function (order) {
                log.info(order);
                res.json({message:'done successfully'});
            })
            .catch(function (err) {
                log.info(err);
                res.json({message:'failed to update status'});
            })
    });


module.exports = router;
