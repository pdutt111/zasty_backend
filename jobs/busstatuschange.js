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
var buslocation=db.getbuslocationdef;
var busTable=db.getbusdef;
var job = new CronJob({
    onTick: function() {
        busTable.update({departure_time:{$lte:new Date()}},{$set:{in_booking:false,in_transit:true}},
            {multi:true},function(err,info){
        });
        busTable.update({departure_time:{$lte:moment().add(3, 'hours')}},{$set:{in_booking:false}},
            {multi:true},function(err,info){
        });
        //busTable.update({departure_time:{$lte:moment().subtract(15, 'hours')}},{$set:{in_transit:false,is_completed:true}},
        //    {multi:true},function(err,info){
        //    });
    },
    cronTime: '30 * * * * *',
    start: false,
    timeZone: 'Asia/Kolkata'
});
job.start();

module.exports = router;
