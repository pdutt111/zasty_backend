/**
 * Created by pariskshitdutt on 24/07/15.
 */
var q=require('q');
var crypto=require('../authentication/crypto');
var jwt = require('jwt-simple');
var config= require('config');
var log = require('tracer').colorConsole(config.get('log'));


var auth=function(req,res,next){
    var def= q.defer();
    if(req.originalUrl.indexOf("/protected")>-1) {
        if(req.headers.authorization){
            var token=req.headers.authorization;
                try {
                    var decoded = crypto.decryptObject(jwt.decode(token, config.get('jwtsecret')).data);
                    var now = (new Date()).toISOString();
                    if ((now < decoded.exp)) {
                        def.resolve(decoded.user);
                    }else{
                        if(req.originalUrl.indexOf("/protected/info/renew")>-1){
                            def.resolve(decoded.user);
                        }
                        else {
                            def.reject({status:401,message:config.get('error.webtoken.expired')});
                        }
                    }
                } catch (err) {
                    def.reject({status:401,message:config.get('error.webtoken.unknown')})
                }
        } else {
            def.reject({status:401,message:config.get('error.webtoken.notprovided')})
        }
    }else{
        def.resolve();
    }
    return def.promise;
};

module.exports=auth;