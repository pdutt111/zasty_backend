var config = require('config');
var events = require('../events');
var request = require('request');
var db = require('../db/DbSchema');
var restaurantTable = db.getrestaurantdef;
var orderTable = db.getorderdef;
var userTable = db.getuserdef;

events.emitter.on('process_delivery_queue', function (_id) {
    var query = {
        "status": "prepared",
        "delivery.status": "not_ready",
        "delivery.retry_count": {
            $lt: 5
        }
    };

    if (_id) {
        query._id = _id;
    }

    orderTable.findOneAndUpdate(query, {
        $set: {status: 'processing_delivery_request'}
    }, {
        new: true,
        sort: {created_time: -1}
    }, function (err, order) {
        if (err) {
            console.log('error process_delivery_queue - ', order, err);
            resetNSave(order);
        }
        if (!err && order) {
            restaurantTable.findOne({name: order.restaurant_assigned}, function (err, restaurant) {
                if (err || !restaurant) {
                    console.log('error process_delivery_queue - ', order, restaurant, err);
                    resetNSave(order);
                }
                if (restaurant) {
                    console.log('process_delivery_queue SUCC - ', order, restaurant);

                    var payload = JSON.stringify({
                        "store_code": 2,
                        "callback_url": config.base_url + '/api/deliverystatus/' + order._id,
                        "pickup_contact_number": restaurant.contact_number,
                        "order_details": {
                            "client_order_id": order._id,
                            "order_value": order.value || 300,
                            "paid": order.paid || true
                        },
                        "customer_details": {
                            "name": order.customer_name,
                            "contact_number": order.customer_number,
                            "address_line_1": order.address,
                            "address_line_2": order.area + order.locality,
                            "city": order.city,
                            "longitude": order.location[0],
                            "latitude": order.location[1]
                        }
                    });

                    request({
                        method: 'POST',
                        url: 'http://api.shadowfax.in/api/v1/stores/orders/',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': config.shadowfax.token
                        },
                        body: payload
                    }, function (error, response, body) {
                        console.log('Status:', response.statusCode);
                        console.log('Headers:', JSON.stringify(response.headers));
                        console.log('Response:', body);
                        if (response.statusCode == 201) {
                            var data = JSON.parse(body);
                            order.delivery.details = data;
                            order.save();
                        } else {
                            resetNSave(order);
                        }
                    });
                }
            });
        }
    });
});

setInterval(function () {
    events.emitter.emit("process_delivery_queue");
}, config.deliveryServiceInterval);

function resetNSave(doc) {
    doc.delivery.retry_count++;
    if (doc.delivery.retry_count > 4) {
        console.log("CRITICAL ERROR- DELIVERY SERVICE ORDER FAIL for order_id- ", doc._id);
        sendAdminAlert(doc);
    }
    doc.status = 'prepared';
    doc.save();
}

function sendAdminAlert(doc) {
    userTable.findOne({is_admin: true}, function (err, user) {
        events.emitter.emit("mail", {
            subject: "Delivery Order Issue",
            message: "order delivery service issue for order id-" + doc._id,
            plaintext: "order delivery service issue for order id-" + doc._id,
            toEmail: user.email
        });
    });
}