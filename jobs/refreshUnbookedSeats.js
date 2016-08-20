/**
 * Created by pariskshitdutt on 16/10/15.
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
var apn=require('../notificationSenders/apnsender');
var gcm=require('../notificationSenders/gcmsender');
var CronJob = require('cron').CronJob;
var buslocation=db.getbuslocationdef;
var bookingTable=db.getbookingsdef;
var busTable=db.getbusdef;
var job = new CronJob({
    onTick: function() {
      bookingTable.find({is_confirmed:false,is_deleted:false,created_time:{$lte:moment().subtract(5, 'minutes')}},function(err,bookings){
          async.each(bookings,function(bus,callback){
              bookingTable.update({_id:new ObjectId(bus._id)},{$set:{is_deleted:true}},function(err,info){
              });
              async.each(bus.seat_no,function(val,callback){
                  busTable.update({_id: new ObjectId(bus.bus_id), 'seats.seat_no': val},
                      {$set: {'seats.$.is_booked': false },$unset:{'seats.$.booking_id':""}}, function (err, info) {
                          callback(err);
                      });
              },function(err){

              })
          },function(err){

          })
      })
    },
    cronTime: '0 */5 * * * *',
    start: true,
    timeZone: 'Asia/Kolkata'
});
job.start();

module.exports = router;

