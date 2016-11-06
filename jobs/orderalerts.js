/**
 * Created by pariskshitdutt on 26/09/15.
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
var CronJob = require('cron').CronJob;
var orderTable=db.getorderdef;
var userTable=db.getuserdef;
log.info("running job");
var job = new CronJob({
    onTick: function() {
        log.info("running job");
        orderTable.find({status:"awaiting response",created_time:{$lte:moment().subtract(5, 'minutes')}},function(err,orders){
            log.info(orders);
            orders.forEach(function(order){
                userTable.findOne({restaurant_name:order.restaurant_assigned},function(err,user){
                    if(user.phonenumber){
                        events.emitter.emit("sms", {
                            number: user.phonenumber,
                            message: "Dear Kitchen partner, please accept order "+order._id+" , is on hold and may cause penalty."
                        });
                    }
                });
                userTable.findOne({is_admin:true},function(err,user){
                    if(user.phonenumber){
                        events.emitter.emit("sms", {
                            number: user.phonenumber,
                            message: "Order number "+order._id+" has not been accepted by now by kitchen partner "+order.restaurant_assigned+". Time to speak to them!"
                        });
                    }
                });
            })
        });
        orderTable.find({$or:[{status:"prepared"},{status:"confirmed"}],created_time:{$lte:moment().subtract(20, 'minutes')}},function(err,orders){
            log.info(orders);
            orders.forEach(function(order){
                userTable.findOne({restaurant_name:order.restaurant_assigned},function(err,user){
                    if(user.phonenumber){
                        events.emitter.emit("sms", {
                            number: user.phonenumber,
                            message: "Dear Kitchen Partner, order number "+order._id+" is not yet marked ready to dispatch. Please do to avoid penalties."
                        });
                    }
                });
                userTable.findOne({is_admin:true},function(err,user){
                    if(user.phonenumber){
                        events.emitter.emit("sms", {
                            number: user.phonenumber,
                            message: "Order number "+order._id+" has been delayed in preparation by kitchen partner "+order.restaurant_assigned+". Time to speak to them!"
                        });
                    }
                });
            })
        });
    },
    cronTime: '0 1 * * * *',
    start: false,
    timeZone: 'Asia/Kolkata'
});
job.start();

module.exports = router;
