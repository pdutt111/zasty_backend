/**
 * Created by pariskshitdutt on 24/07/15.
 */
var q=require('q');
var ObjectId = require('mongoose').Types.ObjectId;
var crypto=require('../authentication/crypto');
var jwt = require('jwt-simple');
var config= require('config');
var log = require('tracer').colorConsole(config.get('log'));
var db=require('../db/DbSchema');
var userTable=db.getuserdef;

var auth=function(req,res,next){
    var def= q.defer();
    if(req.originalUrl.indexOf("/protected")>-1) {
        if(req.headers.authorization){
            var token=req.headers.authorization;
                try {
                    var decoded = crypto.decryptObject(jwt.decode(token, config.get('jwtsecret')).data);
                    var now = (new Date()).toISOString();
                    if ((now < decoded.exp)) {
                        userTable.findOne({_id:new ObjectId(decoded.user._id)},"name email token_validity_code",function(err,user){
                            if(!err&&user){
                                log.info(decoded,user);
                                if(decoded.user.token_validity_code==user.token_validity_code){
                                    def.resolve(user);
                                }else{
                                    def.reject({status:401,message:config.get('error.webtoken.unknown')})
                                }
                            }else{
                                def.reject({status:401,message:config.get('error.webtoken.unknown')})
                            }
                        });
                    }else{
                        if(req.originalUrl.indexOf("/protected/info/renew")>-1){
                            def.resolve(decoded.user);
                        }
                        else {
                            def.reject({status:401,message:config.get('error.webtoken.expired')});
                        }
                    }
                } catch (err) {
                    log.info(err);
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