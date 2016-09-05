var config = require('config');
var events = require('../events');
var request = require('request');
var db = require('../db/DbSchema');
var log = require('tracer').colorConsole(config.get('log'));
var restaurantTable = db.getrestaurantdef;
var orderTable = db.getorderdef;

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
        }
        if (!err && order) {
            restaurantTable.findOne({name: order.restaurant_assigned}, function (err, restaurant) {
                if (err || !restaurant) {
                    console.log('error process_delivery_queue - ', order, restaurant, err);
                    resetNSave(order, 'restaurant not found');
                }
                if (restaurant) {
                    var payload = JSON.stringify({
                        "store_code": restaurant.shadowfax_store_code,
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
                    log.info(payload);
                    request({
                        method: 'POST',
                        url: 'http://api.shadowfax.in/api/v1/stores/orders/',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': config.shadowfax.token
                        },
                        body: payload
                    }, function (error, response, body) {
                        if (response && response.statusCode == 201) {
                            var data = JSON.parse(body);
                            console.log(data);
                            if (data.data.status === 'ACCEPTED') {
                                order.delivery.details = data;
                                order.delivery.status = data.data.status;
                                order.delivery.log.push({status: data.status, date: new Date()});
                                order.status = "prepared";
                                order.save();
                            } else {
                                resetNSave(order, 'sfx reject- ' + body);
                                //TODO: try fallback service
                            }
                        } else {
                            var err = (error || '').toString() + (response || '').toString() + (body || '').toString();
                            resetNSave(order, 'sfx failed- ' + err);
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

function resetNSave(doc, err) {
    doc.delivery.retry_count++;
    if (doc.delivery.retry_count > 4) {
        console.log("CRITICAL ERROR- DELIVERY SERVICE ORDER FAIL for order_id- ", doc._id);
        sendAdminAlert(doc);
    }
    doc.status = 'prepared';

    if (err) {
        doc.error.push({status: err, date: new Date()})
    }
    doc.save();
}

function sendAdminAlert(doc) {
    events.emitter.emit("mail_admin", {
        subject: "Delivery Order Issue",
        message: "order delivery service issue for order id-" + doc._id,
        plaintext: "order delivery service issue for order id-" + doc._id
    });
}