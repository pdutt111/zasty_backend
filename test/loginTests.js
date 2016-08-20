/**
 * Created by pariskshitdutt on 05/09/15.
 */
var chai = require('chai');
var usersLogic=require('../logic/Login');
var config= require('config');
var httpMocks=require('express-mocks-http');
var chaiAsPromised=require('chai-as-promised');
var crypto=require('../authentication/crypto');
var auth=require('../authentication/authentication');
var details=require('../authentication/detailsFetch');
var jwt = require('jwt-simple');

//chai.use(chaiAsPromised);
var should=chai.should();
describe('login', function() {
    describe('usercreate',function(){
        it('it should create a new user in the database',function(done){
            var req=httpMocks.createExpressRequest({
                method:'POST',
                url:'/api/v1/users/create',
                body:{password:"test",email:"test@test.com"}
            });
            var res=httpMocks.createExpressResponse();
            usersLogic.userCreate(req,res)
                .then(function(user){
                    done();
                }).catch(function(err){
                    try {
                        err.status.should.equal(401);
                        done()
                    }catch(e){
                        done(e);
                    }
                });
        });
            it('it should not enter junk in database',function(done){
                var req=httpMocks.createExpressRequest({
                    method:'POST',
                    url:'/api/v1/users/create',
                    body:{password:"test",blahblah:"blahblah"}
                });
                var res=httpMocks.createExpressResponse();
                usersLogic.userCreate(req,res)
                    .then(function(user){
                        done();
                    }).catch(function(err){
                        try {
                            err.status.should.equal(500);
                            done();
                        }catch(e){
                            done(e);
                        }
                    });
            });
        it('it should not authorize a wrong guy',function(done){
            var req=httpMocks.createExpressRequest({
                method:'POST',
                url:'/api/v1/users/create',
                body:{blahblah:"blahblah"}
            });
            var res=httpMocks.createExpressResponse();
            usersLogic.userCreate(req,res)
                .then(function(user){
                    done();
                }).catch(function(err){
                    try {
                        err.status.should.equal(500);
                        done();
                    }catch(e){
                        done(e);
                    }
                });
        })
    })
    describe('signin',function(){
        it('it should respond with a user object in username and password are correct',function(done){
            var req=httpMocks.createExpressRequest({
                method:'POST',
                url:'/api/v1/users/create',
                body:{password:"test",email:"test@test.com"}
            });
            var res=httpMocks.createExpressResponse();
            usersLogic.signin(req,res)
                .then(function(user){
                    try {
                        user.should.have.property('password');
                        user.should.have.property('email');
                        user.should.have.property('_id');
                        done();
                    }catch(e){
                        done(e);
                    }
                }).catch(function(err){
                    try {
                        err.status.should.equal(401);
                        done(err)
                    }catch(e){
                        done(e);
                    }
                });
        });
        it('it should not authenticate without an email',function(done){
            var req=httpMocks.createExpressRequest({
                method:'POST',
                url:'/api/v1/users/create',
                body:{password:"test"}
            });
            var res=httpMocks.createExpressResponse();
            usersLogic.signin(req,res)
                .then(function(user){
                    done(new Error());
                }).catch(function(err){
                    try {
                        err.status.should.equal(500);
                        done();
                    }catch(e){
                        done(e);
                    }
                });
        });
        it('it should not authorize without right password',function(done){
            var req=httpMocks.createExpressRequest({
                method:'POST',
                url:'/api/v1/users/create',
                body:{email:"test@test.com",password:"wrong"}
            });
            var res=httpMocks.createExpressResponse();
            usersLogic.signin(req,res)
                .then(function(user){
                    done(new Error());
                }).catch(function(err){
                    try {
                        err.status.should.equal(401);
                        done();
                    }catch(e){
                        done(e);
                    }
                });
        })
    });
    var token;
    describe('sendtoken',function(){
        it('given the user object it should provide a token',function(done){
            var req={
                method:'POST',
                url:'/api/v1/users/create',
                user:{name:"test",email:"test@test.com",_id:"55ef3d8f7a4b2a831b37db8b",password:"test2"}};
            var res=httpMocks.createExpressResponse();
            usersLogic.sendToken(req,res)
                .then(function(response){
                    try {
                        response.should.have.property("token");
                        response.should.have.property("secret");
                        response.should.have.property("expires");
                        response.should.not.have.property("password");
                        var jwt_decoded=jwt.decode(response.token, config.get('jwtsecret'));
                        var decoded = crypto.decryptObject(jwt_decoded.data);
                        decoded.should.have.property("user");
                        decoded.should.have.property("exp");
                        decoded.user.name.should.be.equal("test");
                        decoded.user._id.should.be.equal("55ef3d8f7a4b2a831b37db8b");
                        decoded.user.email.should.be.equal("test@test.com");
                        token=response.token;
                        done();
                    }catch(e){
                        done(e);
                    }
                }).catch(function(err){
                        done(err)
                });
        });
    })
    describe('renew',function(){
        it('user._id and secret same',function(done){
            var req={
                method:'POST',
                url:'/api/v1/users/create',
                user:{_id:"55ef3d8f7a4b2a831b37db8b"},
                body:{secret:"55ef3d8f7a4b2a831b37db8b"}
            };
            var res=httpMocks.createExpressResponse();
            usersLogic.renewToken(req,res)
                .then(function(response){
                    try {
                        done();
                    }catch(e){
                        done(e);
                    }
                }).catch(function(err){
                    done(err)
                });
        });
        it('user._id and secret different',function(done){
            var req={
                method:'POST',
                url:'/api/v1/users/create',
                user:{_id:"55ef3d8f7a4b2a831b37db8b"},
                body:{secret:"55ef3d8f7a4b2a831b37db8b"}
            };
            var res=httpMocks.createExpressResponse();
            usersLogic.renewToken(req,res)
                .then(function(){
                        done();
                }).catch(function(err){
                    try{
                        err.status.should.equal(401)
                        done();
                    }catch(e){
                        done(e)
                    }
                });
        });
    })
    describe('authentication',function(){
        it('call without protected in name',function(done){
            var req={
                method:'POST',
                url:'/api/v1/users/create',
                originalUrl:'/api/v1/users/create',
                body:{blahblah:"blahblah"}
            };
            var res=httpMocks.createExpressResponse();
            auth(req,res)
                .then(function(response){
                    if(!response){
                        done();
                    }else{
                        done(new Error());
                    }
                }).catch(function(err){
                    done(err)
                });
        });
        it('call without authorization headers',function(done){
            var req={
                method:'POST',
                url:'/api/v1/users/create',
                originalUrl:'/api/v1/users/protected/create',
                headers:{},
                body:{blahblah:"blahblah"}
            };
            var res=httpMocks.createExpressResponse();
            auth(req,res)
                .then(function(response){
                        done(new Error());
                }).catch(function(err){
                    try{
                        err.status.should.equal(401);
                        done()
                    }catch(e){
                        done(e);
                    }
                });
        });
        it('call with authorization headers but wrong token',function(done){
            var req={
                method:'POST',
                url:'/api/v1/users/create',
                originalUrl:'/api/v1/users/protected/create',
                headers:{authorization:"blah"},
                body:{blahblah:"blahblah"}
            };
            var res=httpMocks.createExpressResponse();
            auth(req,res)
                .then(function(response){
                    done(new Error());
                }).catch(function(err){
                    try{
                        err.status.should.equal(401);
                        done()
                    }catch(e){
                        done(e);
                    }
                });
        });
        it('call with right token',function(done){
            var req={
                method:'POST',
                url:'/api/v1/users/create',
                originalUrl:'/api/v1/users/protected/create',
                headers:{authorization:token},
                body:{blahblah:"blahblah"}
            };
            var res=httpMocks.createExpressResponse();
            auth(req,res)
                .then(function(response){
                    try{
                        response.name.should.equal("test");
                        response.email.should.equal("test@test.com");
                        response._id.should.equal("55ef3d8f7a4b2a831b37db8b");
                        done();
                    }catch(e){
                        done(e);
                    }
                }).catch(function(err){
                    done(err);
                });
        });
    })
});