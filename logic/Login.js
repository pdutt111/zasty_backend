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

var userTable;
var pinTable;
    userTable=db.getuserdef;
    pinTable=db.getpindef;
var feedbackTable=db.getfeedbackdef;

var users={
    userCreate:function(req,res){
            var def= q.defer();
            bcrypt.genSalt(10, function(err, salt) {
                bcrypt.hash(req.body.password, salt, function(err, hash) {
                    // Store hash in your password DB.
                    req.body.password=hash;
                    req.body._id=new ObjectId();
                    var user = new userTable(req.body);
                    user.save(function(err,user,info){
                        if(!err){
                            var tokendata={
                                _id:user._id,
                                name:user.name,
                                is_verified:user.is_verified,
                                is_operator:user.is_operator,
                                is_admin:user.is_admin

                            };
                            def.resolve(tokendata);
                        }else{
                            log.warn(err);
                            def.reject({status: 500, message: config.get('error.dberror')});
                        }
                    });
                });
            });

            return def.promise;
        },
    signin:function(req,res){
        var def= q.defer();
        userTable.findOne({email:req.body.email},"password name phonenumber is_res_owner is_admin").exec()
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
        log.info(req.secret);
        var def= q.defer();
        delete req.user.is_operator;
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