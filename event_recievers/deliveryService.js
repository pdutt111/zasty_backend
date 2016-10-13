var config = require('config');
var events = require('../events');
var request = require('request');
var db = require('../db/DbSchema');
var urlencode=require('urlencode');
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
            data.pooled_at = new Date();
            data.pooling = false;
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
        "delivery_enabled":true,
        "delivery.retry_count": {
            $lt: max_retry
        }
    };

    if (_id) {
        query.combined_id = _id;
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

                    // Quickli
                    if (order.delivery.retry_count <= 3) {
                        request('https://maps.googleapis.com/maps/api/geocode/j' +
                            'son?address='+urlencode(order.area)+','+order.city+'&key=' +
                            'AIzaSyBsp-wl6rpRBFQmwBUVJrmXij_PHvzi0ck',function(err,response,body){
                            log.info("placing delivery request quickli");
                            try{
                                body=JSON.parse(body);
                            }catch(e){}
                            if(body.status=="OK"&&body.results.length>0){
                                var lat=body.results[0].geometry.location.lat
                                var lon=body.results[0].geometry.location.lng
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
                                        cod: order.payment_mode == 'cod' ? order.delivery_price_recieved : '0',
                                        store_id: restaurant.quickli_store_id,
                                        // store_id: 8,
                                        app_id: config.quickli.app_id,
                                        access_key: config.quickli.access_key,
                                        pickup_from_store: 'Yes',
                                        address: 'Yes',
                                        destination_address: order.address,
                                        destination_location: [order.area, order.locality, order.city].join(' , '),
                                        destination_phone: order.customer_number,
                                        destination_ltd:lat,
                                        destination_lng:lon
                                    }
                                };
                                log.info(options);
                                request(options, function (error, response, body) {
                                    deliveryOrderCallback(response, body, order, error, 'quickli');
                                });
                            }else{
                                resetNSave(order,"location not found");
                            }
                        })

                    }else{
                        log.info("placing delivery request shadowfax");
                        var payload = JSON.stringify({
                            "store_code": restaurant.shadowfax_store_code,
                            "store_code": "zesty_test",
                            "callback_url": config.base_url + '/api/v1/order/deliverystatus/' + order._id,
                            "pickup_contact_number": restaurant.contact_number,
                            "order_details": {
                                "client_order_id": order._id,
                                "order_value": order.delivery_price_recieved,
                                "paid": order.payment_mode !== 'cod',
                                "preparation_time": config.preparation_time
                            },
                            "customer_details": {
                                "name": order.customer_name,
                                "contact_number": order.customer_number,
                                "address_line_1": order.address,
                                "address_line_2": order.area +", "+ order.locality,
                                "city": order.city
                            }
                        });

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
                }
            });
        }
    });
});

setInterval(function () {
    events.emitter.emit("process_delivery_queue");
}, config.deliveryServiceInterval);

setInterval(function () {
    events.emitter.emit("process_quickli");
}, config.quickliServiceInterval);

function resetNSave(doc, err) {
    doc.delivery.retry_count++;
    doc.status = book_at;

    if (err) {
        doc.error.push({status: err, date: new Date()})
    }

    if (doc.delivery.retry_count >= max_retry) {
        doc.delivery.status = 'error';
        doc.status='processing_delivery_request';
        console.log("CRITICAL ERROR- DELIVERY SERVICE ORDER FAIL for order_id- ", doc._id);
        sendAdminAlert(doc);
    }

    doc.save(function(err,info){
        log.info(err,info);
    });
}

function sendAdminAlert(doc) {
    events.emitter.emit("mail_admin", {
        subject: "Delivery Order Issue",
        message: "order delivery service issue for order id-" + doc._id,
        plaintext: "order delivery service issue for order id-" + doc._id
    });
}

var validQuickliStates = ['Processing', 'Accepted', 'Picked', 'In Transit'];

events.emitter.on('process_quickli', function () {
    var query = {
        "delivery.details.pooling": false,
        "delivery.retry_count": {$lt: max_retry},
        "delivery.details.service": "quickli",
        "delivery.status": {$in: validQuickliStates}
    };

    orderTable.findOneAndUpdate(query, {
        $set: {"delivery.details.pooling": true}
    }, {
        new: true,
        sort: {'delivery.details.pooled_at': 1}
    }, function (err, order) {
        if (err) {
            console.log('error process_quickli - ', err);
        }
        if (!err && order) {
            restaurantTable.findOne({name: order.restaurant_assigned}, function (err, restaurant) {
                if (err || !restaurant) {
                    console.log('error process_quickli - ', order, restaurant, err);
                }
                if (restaurant) {
                    if (order.delivery.details.order_id) {
                        var options = {
                            method: 'POST',
                            url: config.quickli.url_track,
                            headers: {
                                'content-type': 'application/x-www-form-urlencoded',
                                'postman-token': 'd8eae1aa-d1ec-2b15-829c-5e331400110e',
                                'cache-control': 'no-cache'
                            },
                            form: {
                                partner_id: '2',
                                // store_id: restaurant.quickli_store_id,
                                store_id: 8,
                                app_id: config.quickli.app_id,
                                access_key: config.quickli.access_key,
                                order_id: order.delivery.details.order_id
                            }
                        };
                        request(options, function (error, response, body) {
                            if (response && response.statusCode == 200) {
                                var data = JSON.parse(body);
                                console.log(data);
                                if (Array.isArray(data) && data.length == 1) {
                                    data = data[0];
                                    if (order.delivery.log[0] && order.delivery.log[0].status != JSON.stringify(data)) {
                                        order.delivery.log.unshift({status: JSON.stringify(data), date: new Date()});
                                    }
                                    if (!order.delivery.log[0]) {
                                        order.delivery.log.unshift({status: JSON.stringify(data), date: new Date()});
                                    }
                                    if (validQuickliStates.indexOf(data.status) == -1 && data.status != 'Delivered') {
                                        sendAdminAlert(order);
                                    }
                                    order.delivery.status = data.status;
                                }
                                orderTable.update({combined_id:order.combined_id},
                                    {$set:{delivery_person_alloted:data.deliveryboy_name,
                                        delivery_person_contact:data.deliveryboy_phone}},{multi:true},
                                    function(err,info){

                                    })
                            }
                            order.delivery.details.pooling = false;
                            order.delivery.details.pooled_at = new Date();
                            order.markModified('delivery.details');
                            return order.save();
                        });
                    }

                }
            });
        }

    });
});