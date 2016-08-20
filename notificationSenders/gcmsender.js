/**
 * Created by pariskshitdutt on 09/08/14.
 */
var gcm = require('node-gcm');
var config= require('config');
var events = require('../events');
var log = require('tracer').colorConsole(config.get('log'));
var db=require('../db/DbSchema');

var sender = new gcm.Sender(config.get('gcmServerKey'));

exports.sendmessage=function sendmessage(message,extra,type,regid,collapse_key){
// or with object values
var message = new gcm.Message({
    collapseKey: collapse_key,
    delayWhileIdle: true,
    data: {
        message: message,
        type: type,
        extra_data:extra
    }
});

var registrationIds = [];

// At least one required
    registrationIds.concat(regid);
//registrationIds.push(regid);

sender.send(message, registrationIds, 4, function (err, result) {
    console.log(result);
    if(result.failure){
        if(result.results[0].error=='NotRegistered'){
        }
    }else{
        if(result.results[0].registration_id){
        }
    }
});
}
