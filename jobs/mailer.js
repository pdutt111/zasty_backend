/**
 * Created by rohit on 29/12/15.
 */

var emailer  = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
var emailTemplates = require('email-templates');
var config= require('config');
var events = require('../events');
var log = require('tracer').colorConsole(config.get('log'));
var mailer = config.get('mailer')

var generator = require('xoauth2').createXOAuth2Generator({
    user: mailer.auth.user,
    clientId: mailer.auth.clientId,
    clientSecret: mailer.auth.clientSecret,
    refreshToken: mailer.auth.refreshToken
});

var defaultTransport = emailer.createTransport((smtpTransport({
    service: mailer.service,
    auth: {
        pass: mailer.auth.pass,
        xoauth2: generator
    }
})));

events.emitter.on("mail", function(data) {
    var from = "";
    var to = ""
    if (!data.to) {
        to = mailer.adminAddress;
    } else {
        to = data.to;
    }

    if (!data.from) {
        from = mailer.defaultFromAddress;
    } else {
        from = data.from;
    }

    defaultTransport.sendMail({
        from: from,
        to: to,
        subject: data.subject,
        text: data.text,
    }, function(error, info) {
        if(error){
            return console.log(error);
        }
        console.log('Message sent: ' + info.response);
    })
});