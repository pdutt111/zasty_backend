/**
 * Created by pariskshitdutt on 04/09/15.
 */
var q= require('q');
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
var crypto=require('../authentication/crypto');
var bcrypt = require('bcrypt');
var request= require('request');

var userTable;
var pinTable;
    userTable=db.getuserdef;
    pinTable=db.getpindef;
var feedbackTable=db.getfeedbackdef;

var users={
    validateTokenFB:function(req){
        var def= q.defer();
        request("https://graph.facebook.com/debug_token?%20input_token="+req.body.fb_token+"&access_token="+config.get("fb_access_token"),function(err,response,body){
            var body=JSON.parse(body);
            log.info(body);
            if(!err){
                if(body.data&&(!body.data.error)&&body.data.user_id){
                    if((new Date).getTime() / 1000<Number(body.data.expires_at)&&body.data.app_id==config.get("fb_app_id")){
                        req.body.fb_user_id=body.data.user_id;
                        request("https://graph.facebook.com/v2.8/"+req.body.fb_user_id+"?access_token="+req.body.fb_token+"&fields=email,name",function(err,response,body){
                            var body=JSON.parse(body);
                            log.info(body);
                            if(req.body.email==body.email){
                                req.body.name=body.name;
                                def.resolve()
                            }
                            def.reject({status: 401, message: config.get('error.unauthorized')})
                        })
                    }else{
                        def.reject({status: 401, message: config.get('error.unauthorized')})
                    }
                }else{
                    def.reject({status: 401, message: config.get('error.unauthorized')})
                }
            }else{
                def.reject({status: 500, message: config.get('error.dberror')})
            }
        });
        return def.promise;
    },
    validateTokenGP:function(req){
        var def= q.defer();
        request("https://www.googleapis.com/oauth2/v3/tokeninfo?id_token="+req.body.gptoken,function(err,response,body){
            var body=JSON.parse(body);
            log.info(body);
            if(!err){
                if(body.data&&(!body.data.error)&&body.email){
                    if((new Date).getTime() / 1000<Number(body.exp)&&body.aud==config.get("gp_app_id")){
                        req.body.google_user_id=body.sub;
                        def.resolve()
                    }else{
                        def.reject({status: 401, message: config.get('error.unauthorized')})
                    }
                }else{
                    def.reject({status: 401, message: config.get('error.unauthorized')})
                }
            }else{
                def.reject({status: 500, message: config.get('error.dberror')})
            }
        });
        return def.promise;
    },
    userCreate:function(req,res){
        var def= q.defer();
        bcrypt.genSalt(10, function(err, salt) {
            var token_validity_code=randomString(20,'aA#!');
            req.body.token_validity_code=token_validity_code;
            if(!req.body.password){
                var passInterim=randomString(5,'aA#')
            }else{
                var passInterim=req.body.password;
            }
            bcrypt.hash(passInterim, salt, function(err, hash) {
                // Store hash in your password DB.
                if(req.body.password){
                    req.body.password=hash;
                    req.body.password_interim=null;
                }else{
                    req.body.password=hash;
                    req.body.password_interim=passInterim;
                }
                req.body._id=new ObjectId();
                var user = new userTable(req.body);
                user.save(function(err,user,info){
                    if(!err){
                        var tokendata={
                            _id:user._id,
                            email:user.email,
                        };
                        def.resolve(tokendata);
                    }else{
                        log.info(err);
                        if(err.code==11000) {
                            userTable.findOne({email:req.body.email},"email token_validity_code fb_user_id password",function(err,user){
                                if(!err&&user) {
                                    if(req.body.fb_user_id==user.fb_user_id){
                                        def.resolve(user);
                                    }else if(req.body.google_user_id==user.google_user_id){
                                        def.resolve(user);
                                    }else if(req.body.password){
                                        bcrypt.compare(req.body.password,user.password,function(err,res){
                                            if(err){
                                                def.reject({status: 500, message: config.get('error.dberror')});
                                                return;
                                            }
                                            if(res){
                                                def.resolve(user);
                                            }else{
                                                def.reject({status: 401, message: config.get('error.unauthorized')});
                                            }
                                        });
                                    }
                                    else{
                                        def.reject({status:401,message:config.get('error.unauthorized')});
                                    }
                                }else{
                                    log.warn(err);
                                    def.reject({status: 500, message: config.get('error.dberror')});
                                }
                            })
                        }else{
                            log.warn(err);
                            def.reject({status: 500, message: config.get('error.dberror')});
                        }
                    }
                });
            });
        });

        return def.promise;
    },
    signin:function(req,res){
        var def= q.defer();
        userTable.findOne({email:req.body.email},"password name phonenumber token_validity_code is_res_owner is_admin").exec()
            .then(function(user){
                log.info(user);
                bcrypt.compare(req.body.password,user.password,function(err,res){
                    log.info(err,res);
                    if(err){
                        def.reject({status: 500, message: config.get('error.dberror')});
                        return;
                    }
                    if(res){
                        def.resolve(user);
                    }else{
                        def.reject({status: 401, message: config.get('error.unauthorized')});
                    }
                });
            })
            .then(null,function(err){
                def.reject({status: 500, message: config.get('error.dberror')});
            });
        return def.promise;
    },
    renewToken:function(req,res){
        var def= q.defer();
        if(req.user._id==req.body.secret) {
            def.resolve();
        }else{
            def.reject({status:401,message:config.get('error.unauthorized')});
        }
        return def.promise;
    },
    sendToken:function(req,res){
        log.info(req.secret,req.user);
        var def= q.defer();
        delete req.user.password;
        var expires = new Date(moment().add(config.get('token.expiry'), 'days').valueOf()).toISOString();
        var token_data={
            user: req.user,
            exp: expires
        };
        var token = jwt.encode({
            data:crypto.encryptObject(token_data)
        }, config.get('jwtsecret'));
        var response={
            token: token,
            secret:req.user._id,
            expires: expires
        };
        if(!req.secret){
           delete response.secret;
        }

        def.resolve(response);
        return def.promise;
    },
    updateUserProfile:function(req,res){
        var def= q.defer();
            for(var key in req.body){
                if(key!="name"&&key!="email"&&key!="profession"&&key!="address"){
                    delete req.body[key];
                }
            }
            userTable.update({_id:new ObjectId(req.user._id)},{$set:req.body}).exec()
                .then(function(info) {
                    userTable.findOne({_id:new ObjectId(req.user._id)},"phonenumber name is_verified is_operator is_admin",function(err,user){
                        if(!err&&user){
                            def.resolve(user);
                        }else{
                            def.reject({status: 500, message: config.get('error.dberror')});
                        }
                    })
                })
                .then(null,function(err){
                    log.warn(err);
                    def.reject({status: 500, message: config.get('error.dberror')});
                })
        return def.promise;
    },
    insertDevice:function(req,res){
        var def= q.defer();
        userTable.update({_id:new ObjectId(req.user._id)},{device:{$addToSet:[{service:req.body.service,reg_id:req.body.reg_id}]}},function(err,info){
            log.warn(err);
            if(!err){
                def.resolve();
            }else{
                def.reject({status: 500, message: config.get('error.dberror')});
            }
        });
        return def.promise;
    },
    forgot:function(req,res){
        var def=q.defer();
        var forgot_code=randomString(20,'aA#');
        userTable.update({email:req.body.email},{$set:{token_validity_code:forgot_code}},function(err,info){
            if(!err){
                userTable.findOne({email:req.body.email},function(err,user){
                    if(!err&&user){
                        log.info(user,forgot_code);

                        events.emitter.emit('mail',{
                            subject:"Zasty Forgot Password",
                            toEmail:req.body.email,
                            message:"To reset Password Please <a href='"+config.get('server_url')+"/forgot.html?code="+forgot_code+"'>click here</a>",
                            altText: "To reset Please click here "+config.get('server_url')+"/forgot.html?code="+forgot_code
                        });
                        def.resolve();
                    }else{
                        def.reject({status: 500, message: config.get('error.dberror')});
                    }
                })

            }else{
                def.reject({status: 500, message: config.get('error.dberror')});
            }
        })
        return def.promise;
    },
    resetPassword:function(req,res){
        var def=q.defer();
            bcrypt.genSalt(10, function(err, salt) {
                if(!err){
                    bcrypt.hash(req.body.password, salt, function(err, hash) {
                        if(!err){
                            userTable.findOne({token_validity_code:req.body.code},"email token_validity_code fb_user_id password",function(err,user){
                                if(!err){
                                    user.password=hash;
                                    user.token_validity_code=randomString(20,'aA#');
                                    user.save(function(err,user,info){
                                        if(!err){
                                            log.info(user);
                                            def.resolve(user);
                                        }else{
                                            def.reject({status: 500, message: config.get('error.dberror')});
                                        }
                                    })
                                }else{
                                    def.reject({status: 500, message: config.get('error.dberror')});

                                }
                            })
                        }else{
                            def.reject({status: 500, message: config.get('error.dberror')});
                        }

                    });
                }else{
                    def.reject({status: 500, message: config.get('error.dberror')});
                }
            });
        return def.promise;
    }
};
function randomString(length, chars) {
    var mask = '';
    if (chars.indexOf('a') > -1) mask += 'abcdefghijklmnopqrstuvwxyz';
    if (chars.indexOf('A') > -1) mask += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (chars.indexOf('#') > -1) mask += '0123456789';
    if (chars.indexOf('!') > -1) mask += '~`!@#$%^&*()_+-={}[]:";\'<>?,./|\\';
    var result = '';
    for (var i = length; i > 0; --i) result += mask[Math.round(Math.random() * (mask.length - 1))];
    return result;
}
module.exports=users;