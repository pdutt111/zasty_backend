/**
 * Created by pariskshitdutt on 09/02/16.
 */
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
var CronJob = require('cron').CronJob;
var userTable=db.getuserdef;
var job = new CronJob({
    onTick: function() {
        var today=new Date();
        today.setHours(0,0,0,0);
        log.info(today.toUTCString());
        userTable.find({created_time:{$gte:today}},function(err,rows){
            if(!err&&rows.length!=0){
                events.emitter.emit("mail",{to:'parikshit@woobus.in,tushar@woobus.in',subject:"New Users today",text:JSON.stringify(rows)});
                log.info("Users Found email sent")
            }else{
                log.info("No new Users");
            }
        })
    },
    cronTime: '0 0 23 * * *',
    start: false,
    timeZone: 'Asia/Kolkata'
});
job.start();

module.exports = router;
