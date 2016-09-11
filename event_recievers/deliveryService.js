var config = require('config');
var events = require('../events');
var request = require('request');
var db = require('../db/DbSchema');
var log = require('tracer').colorConsole(config.get('log'));
var restaurantTable = db.getrestaurantdef;
var orderTable = db.getorderdef;
var max_retry = 6;
var book_at = 'confirmed';

function deliveryOrderCallback(response, body, order, error, service) {
    var data = JSON.parse(body || {});
    data.service = service;
    log.info(data);

    if (service == 'quickli' && response && response.statusCode == 200) {
        if (data.status === 'Success') {
            order.delivery.details = data;
            order.delivery.status = data.order_status;
            order.delivery.log.push({status: JSON.stringify(data), date: new Date()});
            order.status = book_at;
            return order.save();
        } else {
            return resetNSave(order, 'quickli reject- ' + body);
        }
    }

    if (service == 'shadowfax' && response && response.statusCode == 201) {
        if (data.data.status === 'ACCEPTED') {
            order.delivery.details = data;
            order.delivery.status = data.data.status;
            order.delivery.log.push({status: JSON.stringify(data), date: new Date()});
            order.status = book_at;
            return order.save();
        } else {
            return resetNSave(order, 'sfx reject- ' + body);
        }
    }

    var err = service + (error || '').toString() + (response || '').toString() + (body || '').toString();
    return resetNSave(order, 'failed- ' + err);

}
events.emitter.on('process_delivery_queue', function (_id) {
    var query = {
        "status": book_at,
        "delivery.status": "not_ready",
        "delivery.retry_count": {
            $lt: max_retry
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
                    if (order.delivery.retry_count < 3) {
                        var options = {
                            method: 'POST',
                            url: config.quickli.url_new_order,
                            headers: {
                                'content-type': 'application/x-www-form-urlencoded',
                                'postman-token': 'd8eae1aa-d1ec-2b15-829c-5e331400110e',
                                'cache-control': 'no-cache'
                            },
                            form: {
                                partner_id: '2',
                                store_id: restaurant.quickli_store_id,
                                app_id: config.quickli.app_id,
                                access_key: config.quickli.access_key,
                                pickup_from_store: 'Yes',
                                address: 'Yes',
                                destination_address: order.address,
                                destination_location: [order.area, order.locality, order.city].join(' , '),
                                destination_phone: order.customer_number,
                                destination_lng: order.location[0],
                                destination_ltd: order.location[1]
                            }
                        };
                        log.info(options);
                        request(options, function (error, response, body) {
                            deliveryOrderCallback(response, body, order, error, 'quickli');
                        });

                    }
                    var payload = JSON.stringify({
                        "store_code": restaurant.shadowfax_store_code,
                        "callback_url": config.base_url + '/api/v1/order/deliverystatus/' + order._id,
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
                    return;
                    log.info(payload);
                    request({
                        method: 'POST',
                        url: config.shadowfax.url_new_order,
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': config.shadowfax.token
                        },
                        body: payload
                    }, function (error, response, body) {
                        deliveryOrderCallback(response, body, order, error, 'shadowfax');
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
    doc.status = book_at;

    if (err) {
        doc.error.push({status: err, date: new Date()})
    }

    if (doc.delivery.retry_count >= max_retry) {
        doc.delivery.status = 'error';
        console.log("CRITICAL ERROR- DELIVERY SERVICE ORDER FAIL for order_id- ", doc._id);
        sendAdminAlert(doc);
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