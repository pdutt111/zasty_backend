/**
 * Created by pariskshitdutt on 27/08/16.
 */
var config = require('config');
var events = require('../events');
var ses = require('node-ses')
    , client = ses.createClient({key: config.get('amazonses.key'), secret: config.get('amazonses.secret'),amazon:"https://email.us-west-2.amazonaws.com"});
var helper = require('sendgrid').mail;
var db = require('../db/DbSchema');
var userTable = db.getuserdef;
var orderTable = db.getorderdef;
var schedule = require('node-schedule');

// for the admin email everyday :
var j = schedule.scheduleJob('0 3 * * *', function () {
    console.log('The answer to life, the universe, and everything! - MOD MAIL');
    sendDailyAdminEmail();
});

// Give SES the details and let it construct the message for you.
events.emitter.on('mail', function (data) {
    // client.sendEmail({
    //     to: "pdutt111@gmail.com",
    //     from: "ashit@zasty.co",
    //     subject: data.subject,
    //     message: data.message,
    //     altText: data.plainText
    // }, function (err, data, res) {
    //     console.log('M', err, data, res);
    // });
    var from_email = new helper.Email(config.get('amazonses.fromEmail'));
    var to_email = new helper.Email(data.toEmail);
    var subject = data.subject
    var content = new helper.Content('text/html', data.message);
    var mail = new helper.Mail(from_email, subject, to_email, content);

    var sg = require('sendgrid')(config.get('sendgrid_key'));
    var request = sg.emptyRequest({
        method: 'POST',
        path: '/v3/mail/send',
        body: mail.toJSON(),
    });

    sg.API(request, function(error, response) {
        console.log("sent mail");
    });
});

// test
//events.emitter.emit("mail", {
//    toEmail: 'rahulroy9202@gmail.com',
//    subject: 'test',
//    message: 'test123',
//    plainText: 'test123'
//});

events.emitter.on('mail_admin', function (data) {
    userTable.findOne({is_admin: true}, function (err, user) {
        if(user.email){
            events.emitter.emit("mail", {
                subject: data.subject,
                message: data.message,
                altText: data.plainText,
                toEmail: user.email
            });
        }

    });
});

function sendDailyAdminEmail() {
    var end_date = new Date();
    var start_date = new Date();
    start_date.setDate(start_date.getDate() - 1);

    orderTable.find({
            created_time: {
                $gte: start_date, $lte: end_date
            }
        })
        .sort({restaurant_assigned: -1})
        .exec(function (err, rows) {
            var res_details = {};
            rows.forEach(function (o) {

                if (!res_details[o.restaurant_assigned])
                    res_details[o.restaurant_assigned] = {
                        orders: []
                    };

                res_details[o.restaurant_assigned].total_price_recieved =
                    (res_details[o.restaurant_assigned].total_price_recieved || 0) + o.total_price_recieved;

                res_details[o.restaurant_assigned].total_price_to_pay =
                    (res_details[o.restaurant_assigned].total_price_to_pay || 0) + o.total_price_to_pay;

                res_details[o.restaurant_assigned].orders.push(o);

            });

            var text = "this is just for your information - \n" + JSON.stringify(res_details, null, '\t');

            var email = {
                subject: "Last 24Hrs Order Details",
                message: text,
                plaintext: text
            };

            events.emitter.emit("mail_admin", email);
        })
}