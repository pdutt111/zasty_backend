/**
 * Created by pariskshitdutt on 27/08/16.
 */
var config= require('config');
var events = require('../events');

var request=require('request');

events.emitter.on('sms',function(data){
    request({
        url:"https://control.msg91.com/api/sendhttp.php?" +
        "authkey="+config.get('sms.key')+"&" +
        "mobiles="+data.number+"&" +
        "message="+data.message+"&" +
        "sender=senderid&" +
        "route=4&" +
        "country=0"
    })
});