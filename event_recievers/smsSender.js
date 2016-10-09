/**
 * Created by pariskshitdutt on 27/08/16.
 */
var config= require('config');
var events = require('../events');
var log = require('tracer').colorConsole(config.get('log'));
var request=require('request');

events.emitter.on('sms',function(data){
    log.info(data);
    request("https://control.msg91.com/api/sendhttp.php?" +
       "authkey="+config.get('sms.key')+"&" +
       "mobiles="+data.number+"&" +
       "message="+data.message+"&" +
       "sender=ZASTYY&" +
       "route=4&" +
       "country=91",
       function(error,response,body){
           log.info(error,body);
           if(body){
               try{
                   var code=Number(body);
                   if(100<code&&code<312){
                       log.warn("error in sending the sms",code);
                   }
               }catch(e){
                   log.info("sent the sms",body);
               }
           }
       });
});