/**
 * Created by pariskshitdutt on 12/08/14.
 */

var apns = require('apn');
var config= require('config');
var events = require('../events');
var db=require('../db/DbSchema');
var log = require('tracer').colorConsole(config.get('log'));

var options = {
    gateway: 'gateway.sandbox.push.apple.com',
    port: 2195,
    rejectUnauthorized: true,
    enhanced: true,
    cacheLength: 100,
    production:true,
    autoAdjustCache: true,
    connectionTimeout: 0
}

var apnsConnection = new apns.Connection(options);
exports.sendmessage=function sendmessage(message,regid){
    var note = new apns.Notification();

    note.expiry = Math.floor(Date.now() / 1000) + 3600;
    note.badge = 1;
    note.sound = 'ping.aiff';
    note.alert = message;
    note.payload = {'rid': 'rid'};
    apnsConnection.pushNotification(note, regid);
}
// i handle these events to confirm the notification gets
// transmitted to the APN server or find error if any

function logger(type) {
    return function() {
        log.info(type, arguments);
    }
}

apnsConnection.on('error', logger('error'));
apnsConnection.on('transmitted', logger('transmitted'));
apnsConnection.on('timeout', logger('timeout'));
apnsConnection.on('connected', logger('connected'));
apnsConnection.on('disconnected', logger('disconnected'));
apnsConnection.on('socketError', logger('socketError'));
apnsConnection.on('transmissionError', logger('transmissionError'));
apnsConnection.on('cacheTooSmall', logger('cacheTooSmall'));
