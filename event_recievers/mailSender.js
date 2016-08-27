/**
 * Created by pariskshitdutt on 27/08/16.
 */
var config= require('config');
var events = require('../events');
var ses = require('node-ses')
    , client = ses.createClient({ key: config.get('amazonses.key'), secret: config.get('amazonses.secret') });

// Give SES the details and let it construct the message for you.
events.emitter.on('mail',function(data){

    //client.sendEmail({
    //    to: data.toEmail,
    //    from: config.get('amazonses.fromEmail'),
    //    subject: data.subject,
    //    message: data.message,
    //    altText: data.plainText
    //}, function (err, data, res) {
    //});
});