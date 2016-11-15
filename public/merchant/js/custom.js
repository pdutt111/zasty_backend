var config = {
    server_url: window.location.origin,
    order_poll_interval: 10,
    after_logout: '/p/login.html',
    root: '/p/'
};
var user, restaurant, context = {};
var order_states = ['awaiting response', 'rejected', 'confirmed', 'prepared', 'dispatched'];
var orderUpdateTimer;

window.onload = function (e) {
    getUser();
    initSignupNLogin();
    initDash();
};

function toggleRestaurant(val) {
    console.log('toggleResturant', val);
    $.ajax({
        url: config.server_url + '/api/v1/res/protected/restaurant/'
        + user.restaurant_name + '/' + (val ? 'open' : 'close'),
        headers: {
            'Authorization': user.token,
            'Content-Type': 'application/json'
        },
        type: 'POST',
        dataType: "json",
        success: function (json) {
            console.log(json);
            if (json.result === 'ok') {
                $('#abc').prop('checked', val);
                window.location.href="/p/";
            } else {
                $('#abc').prop('checked', !val);
            }
        },
        error: function (xhr, _status, errorThrown) {
            console.log("err: ", {status: _status, err: errorThrown, xhr: xhr});
            $('#abc').prop('checked', !val);
        }
    });
}

function initDash() {
    $('#abc').click(function () {
        toggleRestaurant(this.checked);
    });
    try {
        document.getElementById('dateE').valueAsDate = new Date();
        document.getElementById('dateS').valueAsDate = (new Date()).setDate((new Date()).getDate() - 7);
    } catch (e) {
    }
}

function logOut() {
    console.log('logOut');
    Cookies.remove('user');
    window.location.href = config.after_logout;
}

function getUser() {
    console.log('getUser');
    user = Cookies.getJSON('user');

    if (/login|signup/.test(window.location.href)) {
        return false;
    }

    if (user && user.token && (new Date(user.expires) > Date.now())) {
        $.ajax({
            url: config.server_url + '/api/v1/users/protected/info',
            headers: {
                'Authorization': user.token,
                'Content-Type': 'application/json'
            },
            type: 'GET',
            dataType: "json",
            success: function (json) {
                console.log(json);
                if (json.email) {
                    user.email = json.email;
                    user.phonenumber = json.phonenumber || '';
                    user.restaurant_name = json.restaurant_name || null;
                    $('.js-user-email').html(user.email);
                    getRestaurant();
                } else {
                    logOut();
                }
            },
            error: function (xhr, _status, errorThrown) {
                console.log("err: ", {status: _status, err: errorThrown, xhr: xhr});
                $('.js-login-error').toggle(true);
            }
        });
    } else {
        window.location.href = config.after_logout;
    }
}

function getRestaurant() {
    $.ajax({
        url: config.server_url + '/api/v1/res/protected/restaurant/' + user.restaurant_name,
        headers: {
            'Authorization': user.token,
            'Content-Type': 'application/json'
        },
        type: 'GET',
        dataType: "json",
        success: function (json) {
            console.log(json);
            if ((json.name === user.restaurant_name)) {
                restaurant = json;
                $('#abc').prop('checked', restaurant.open_status);
                dishRefresh();
                orderRefresh();
                clearTimeout(orderUpdateTimer);
                orderUpdateTimer = setInterval(orderRefresh, 1000 * config.order_poll_interval);
                // unpaidOrderRefresh();
                // searchTransaction();
                $('.js-r-a').val(restaurant.location.join(','));
                $('.js-r-cp').val(restaurant.contact_number);
                $('.js-r-cn').val(restaurant.contact_name);
                $('.js-r-contact_email').val(restaurant.contact_email);
                $('.js-r-bank_name').val(restaurant.bank_name);
                $('.js-r-bank_account_name').val(restaurant.bank_account_name);
                $('.js-r-bank_account_number').val(restaurant.bank_account_number);
                $('.js-r-ifsc').val(restaurant.ifsc);

                if (!restaurant.dish_add_allowed)
                    $('.js-add-dish').html('');

                if (!restaurant.dish_editable)
                    $('.js-edit-dish').html('');

            } else {
                $('#tabs').html('Your restaurant is not yet ready. Please contact Support.');
            }
        },
        error: function (xhr, _status, errorThrown) {
            console.log("err: ", {status: _status, err: errorThrown, xhr: xhr});
            $('#tabs').html('Your restaurant is not yet ready. Please contact Support.');
        }
    });

}

function initSignupNLogin() {
    console.log('initSignupNLogin');
    $('.error').toggle(false);
    $('.js-signup-btn').prop('disabled', true);
    $('form').submit(function (e) {
        e.preventDefault();
    });
    $(".js-tnc-chkbox").change(function () {
        if (this.checked) {
            $('.js-signup-btn').prop('disabled', false);
        }
    });
}

function doLogin() {
    console.log('doLogin');
    try{
        event.preventDefault();
    }catch(e){}
    var _user = {
        email: $('.js-login-email').val(),
        password: $('.js-login-password').val()
    };
    $.ajax({
        url: config.server_url + '/api/v1/users/signin',
        data: _user,
        type: 'POST',
        dataType: "json",
        success: function (json) {
            console.log(json);
            if (json.token && json.expires) {
                var expire_in_days = parseInt(((new Date(json.expires) - Date.now()) / (1000 * 60 * 60 * 24)), 10);
                Cookies.set('user', json, {expires: expire_in_days});
                window.location.replace(config.root);
            } else {
                $('.error').toggle(true);
            }
        },
        error: function (xhr, _status, errorThrown) {
            console.log("err: ", {status: _status, err: errorThrown, xhr: xhr});
            $('.error').toggle(true);
        }
    });
}

function doSignup() {
    console.log('dosignup');
    event.preventDefault();
    var _user = {
        email: $('.js-signup-email').val(),
        password: $('.js-signup-password').val(),
        phonenumber: $('.js-signup-phonenumber').val()
    };

    $.ajax({
        url: config.server_url + '/api/v1/users/create',
        data: _user,
        type: 'POST',
        dataType: "json",
        success: function (json) {
            console.log(json);
            if (json.token && json.secret && json.expires) {
                var expire_in_days = parseInt(((new Date(json.expires) - Date.now()) / (1000 * 60 * 60 * 24)), 10);
                Cookies.set('user', json, {expires: expire_in_days});
                window.location.replace('/');
            } else {
                $('.error').toggle(true);
            }
        },
        error: function (xhr, _status, errorThrown) {
            console.log("err: ", {status: _status, err: errorThrown, xhr: xhr});
            $('.error').toggle(true);
        }
    });
}

function renderDishTable() {
    var rows = restaurant.dishes.map(function (dish, index) {
        return '<tr><td>' + dish.identifier + '</td><td>' + dish.price + '</td>'
            + '<td><button type="button" class="t' + (dish.availability ? 'green' : 'red') + '" style="min-width: 100%" onclick="toggleDish(' + index + ')">'
            + (dish.availability ? 'YES' : 'NO') + '</button></td>'
            + (restaurant.dish_editable ? '<td><a onclick="dishDetails(' + index + ')">edit</a></td>' : '') + '</tr>';
    });
    var table = '<table align="center" cellpadding="0" cellspacing="0" class="status-tbl col-md-12"><tr class="heading-row"><td>Dish Name</td><td>Value</td><td>Available</td>'
        + (restaurant.dish_editable ? '<td>Details</td>' : '') + '</tr>' + rows.join('') + '</table>';

    $('.js-dish-table').html(table);
}

function dishDetails(i) {
    console.log('editDish', i);
    context.active_dish = i;
    $('.js-edit-dish').toggle(true);
    $('.js-curr-dish-name').html(restaurant.dishes[i].identifier);
    $('.js-curr-dish-value').html(restaurant.dishes[i].price);
}

function toggleDish(i) {
    console.log('toggleDish', i);
    dishShowLoading();
    $.ajax({
        url: config.server_url + '/api/v1/dishes/protected/restaurant/'
        + user.restaurant_name + '/dishes/' + (restaurant.dishes[i].availability ? 'disable' : 'enable'),
        headers: {
            'Authorization': user.token,
            'Content-Type': 'application/json'
        },
        data: JSON.stringify({dish_name: restaurant.dishes[i].identifier}),
        type: 'POST',
        dataType: "json",
        success: function (json) {
            console.log(json);
            dishRefresh();
        },
        error: function (xhr, _status, errorThrown) {
            console.log("err: ", {status: _status, err: errorThrown, xhr: xhr});
            dishRefresh();
        }
    });

}

function dishShowLoading() {
    $('.js-dish-table').html('loading...');
}

function dishRefresh() {
    dishShowLoading();
    $.ajax({
        url: config.server_url + '/api/v1/dishes/protected/restaurant/' + user.restaurant_name + '/dishes',
        headers: {
            'Authorization': user.token,
            'Content-Type': 'application/json'
        },
        type: 'GET',
        dataType: "json",
        success: function (json) {
            console.log(json);
            if (Array.isArray(json)) {
                restaurant.dishes = json;
                renderDishTable();
            } else {
                $('.js-dish-table').html('Dishes not found.');
            }
        },
        error: function (xhr, _status, errorThrown) {
            console.log("err: ", {status: _status, err: errorThrown, xhr: xhr});
            $('.js-dish-table').html('Please reload.');
        }
    });
}

function dishEdit() {
    console.log('dishEdit');
    var _data = {
        dish_name: restaurant.dishes[context.active_dish].identifier,
        price: $('.js-edv').val()
    };
    $.ajax({
        url: config.server_url + '/api/v1/dishes/protected/restaurant/' + user.restaurant_name + '/dishes/update',
        headers: {
            'Authorization': user.token,
            'Content-Type': 'application/json'
        },
        data: JSON.stringify(_data),
        type: 'POST',
        dataType: "json",
        success: function (json) {
            console.log(json);
            $('.js-edv').val('');
            $('.js-edit-dish').toggle(false);
            dishRefresh();
        },
        error: function (xhr, _status, errorThrown) {
            console.log("err: ", {status: _status, err: errorThrown, xhr: xhr});
            dishRefresh();
        }
    });
}

function dishAdd() {
    console.log('dishAdd');
    var _data = {
        dishes: [{
            identifier: $('.js-ndn').val(),
            price: $('.js-ndv').val(),
            availability: true
        }]
    };
    $.ajax({
        url: config.server_url + '/api/v1/dishes/protected/restaurant/' + user.restaurant_name + '/dishes/add',
        headers: {
            'Authorization': user.token,
            'Content-Type': 'application/json'
        },
        data: JSON.stringify(_data),
        type: 'POST',
        dataType: "json",
        success: function (json) {
            console.log(json);
            $('.js-ndn').val('');
            $('.js-ndv').val('');
            dishRefresh();
        },
        error: function (xhr, _status, errorThrown) {
            console.log("err: ", {status: _status, err: errorThrown, xhr: xhr});
            dishRefresh();
        }
    });
}

function renderOrderTable() {
    console.log('renderOrderTable');
    var rows = [];
    restaurant.orders.forEach(function (order, index) {
        var total = 0, dishes = '', dishes_html = '';
        order.dishes_ordered.forEach(function (e) {
            dishes = dishes + e.identifier + ' x ' + e.qty + '<BR/>';
            total = total + (e.price_to_pay * e.qty);
            dishes_html = dishes_html + '<div class="row"> <div class="col-md-6"> <p class="dpblk tgreydark tmicro tleft">' + e.identifier + '</p> </div> <div class="col-md-3"> <p class="dpblk tgreydark tmicro tright">x ' + e.qty + '</p> </div> <div class="col-md-3"> <p class="dpblk tgreydark tmicro tright">' + e.price_to_pay + '</p> </div> </div>';
        });

        order.address_full = order.address + '<BR/> Area: ' + order.area + '<BR/> City: ' + order.city;
        order.date = (new Date(order.created_time)).toString().substr(0, 24) + '<BR/>';
        if (order.log && Array.isArray(order.log)) {
            order.log.forEach(function (e) {
                order.date += '<BR/> ' + e.status + ' in '
                    + parseInt((new Date(e.date) - new Date(order.created_time)) / (1000 * 60), 10) + ' min.';
            });
        }
        order.total = total;
        order.dishes = dishes;
        order.dishes_html = dishes_html;
        order.buttons = '';
        var state_index = order_states.indexOf(order.status);
        var style = '';
        //accept reject buttons
        if (order.status === order_states[0] || order.status === 'error') {
            playSound();
            style = 'class="tr-new""';
            order.buttons = '<button type="button" onclick="changeOrderStatus(' + index + ',' + true + ')">Accept</button> <button type="button" onclick="changeOrderStatus(' + index + ',' + false + ')">Reject</button>';
        }

        //other buttons
        if (state_index > 1 && state_index < order_states.length - 1) {
            order.buttons = '<button type="button" onclick="changeOrderStatus('
                + index + ')">' + order_states[state_index + 1] + '</button>';
        }

        var displayStatus = order.status;
        if (order.delivery && order.delivery.status !== 'not_ready') {
            displayStatus += '<BR/><BR/>Delivery Status: ' + order.delivery.status;
            if (order.delivery_person_alloted) {
                displayStatus += '<BR/><BR/>Pickup name:'+order.delivery_person_alloted+'<BR/>Pickup Contact: ' + order.delivery_person_contact;
            }
        }

        order.status = order.status + (order.issue_raised ? '</BR><b style="color: red">Issue:' + order.issue_reason+"</b>" : '');
        var order_leftover = "<b style='color:blue'> Full Order </b>";
        if (!order.full_order) {
            order_leftover = "<b style='color:red'> Half order</b>";
        }
        if(order.payment_mode=="cod"){
            rows.push('<tr ' + style + '<b style="color: green">'+ order.source.name+'-'+order.source.id +'</b><BR/><BR/>' + order._id + '<BR/><BR/><b>' + order_leftover + '</b><BR/>' + order.address_full + '</td><td>'
                + displayStatus+ (order.issue_raised ? '</BR><b style="color: red">Issue:' + order.issue_reason+"</b>" : '') + '<BR/><BR/>' + order.buttons + '</td><td>'
                + order.date + '</td><td>' + dishes + '</td><td><b style="color: red">COD price to recieve : '+order.delivery_price_recieved+"</b><br>"
                + total + '<BR/>' + order.payment_mode + '<BR/>' + order.payment_status + '</td><td><a onclick="orderDetails(' + index + ')">view</a></td></tr>');
        }else{
            rows.push('<tr ' + style + '><td><b style="color: green">'+ order.source.name+'-'+order.source.id +'</b><BR/><BR/>'  + order._id + '<BR/><BR/><b>' + order_leftover + '</b><BR/>' + order.address_full + '</td><td>'
                + displayStatus+ (order.issue_raised ? '</BR><b style="color: red">Issue:' + order.issue_reason+"</b>" : '') + '<BR/><BR/>' + order.buttons + '</td><td>'
                + order.date + '</td><td>' + dishes + '</td><td>'+
                + total + '<BR/>' + order.payment_mode + '<BR/>' + order.payment_status + '</td><td><a onclick="orderDetails(' + index + ')">view</a></td></tr>');
        }
    });
    var table = '<table align="center" cellpadding="0" cellspacing="0" class="status-tbl col-md-12"> <tr class="heading-row"> <td>OrderID / Address</td> <td>Status</td> <td>Date</td> <td>Dishes</td> <td>Total</td> <td>Details</td> </tr>' + rows.join('') + '</table>';

    $('.js-order-table').html(table);
}

function orderRefresh() {
    var self = this;
    if (self.orderRefreshing)
        return;
    if (!this.orderRefreshing)
        self.orderRefreshing = true;
    console.log('orderRefresh');
    stopSound();
    $.ajax({
        url: config.server_url + '/api/v1/res/protected/restaurant/' + user.restaurant_name + '/orders/live',
        headers: {
            'Authorization': user.token,
            'Content-Type': 'application/json'
        },
        type: 'GET',
        dataType: "json",
        success: function (json) {
            console.log(json);
            if (Array.isArray(json)) {
                restaurant.orders = json.sort(compareState);
                renderOrderTable();
                if(context.active_order){
                    orderDetails(context.active_order);
                }
            }
            self.orderRefreshing = false;
        },
        error: function (xhr, _status, errorThrown) {
            console.log("err: ", {status: _status, err: errorThrown, xhr: xhr});
            //setTimeout(orderRefresh, 1000 * config.order_poll_interval);
            self.orderRefreshing = false;
        }
    });
}

function orderDetails(i) {
    console.log('orderDetails', i);
    context.active_order = i;
    context.active_order_details = restaurant.orders[i];
    var o = context.active_order_details;
    $('.js-od').toggle(true);
    var order_leftover = " <b style='color: blue'>Full order</b>";
    if (!o.full_order) {
        order_leftover = " <b style='color: red'>Half order</b>";
    }
    $('.js-od-id').html(o._id + order_leftover);
    $('.js-od-date').html(o.date);
    $('.js-od-total').html(o.total);
    $('.js-od-status').html(o.status);
    $('.js-od-address').html(o.address_full);
    $('.js-od-dishes').html(o.dishes_html);
}

function changeOrderStatus(i, accept) {
    console.log('changeOrderStatus', i);
    var state = restaurant.orders[i].status.split("<")[0];
    var _id = restaurant.orders[i]._id;
    console.log(state, _id);
    if (order_states.indexOf(state) > 1 && order_states.indexOf(state) < order_states.length - 1) {
        var new_state = order_states[order_states.indexOf(state) + 1];
        console.log('ostate', state, 'nstate', new_state);

        $.ajax({
            url: config.server_url + '/api/v1/res/protected/restaurant/' + user.restaurant_name + '/order/status',
            headers: {
                'Authorization': user.token,
                'Content-Type': 'application/json'
            },
            data: JSON.stringify({order_id: _id, status: new_state}),
            type: 'POST',
            dataType: "json",
            success: function (json) {
                console.log(json);
                orderRefresh();
            },
            error: function (xhr, _status, errorThrown) {
                console.log("err: ", {status: _status, err: errorThrown, xhr: xhr});
                alert('error');
            }
        });
    }
    else if (order_states.indexOf(state) == 0) {
        console.log('ostate', state, accept);
        var reason = '', _data = {order_id: _id};
        if (!accept) {
            reason = prompt("Please enter your reason for Rejection.");
            if (!reason)
                return alert('Cannot cancel order without reason');
            _data.reason = reason;
        }
        $.ajax({
            url: config.server_url + '/api/v1/res/protected/restaurant/'
            + user.restaurant_name + '/order/' + (accept ? 'confirm' : 'reject'),
            headers: {
                'Authorization': user.token,
                'Content-Type': 'application/json'
            },
            data: JSON.stringify(_data),
            type: 'POST',
            dataType: "json",
            success: function (json) {
                console.log(json);
                orderRefresh();
            },
            error: function (xhr, _status, errorThrown) {
                console.log("err: ", {status: _status, err: errorThrown, xhr: xhr});
                alert('error');
            }
        });
    }
    else {
        alert('Cannot change Status. order-id: ' + _id);
        orderRefresh();
    }
}

function compareState(a, b) {
    return order_states.indexOf(a.status) - order_states.indexOf(b.status);
}

var a;
a = new Audio(config.server_url + '/p/audio/alertS.mp3');
a.loop = true;
function playSound() {
    $('a[rel="tab1"]').trigger("click");
    a.play();
}

function stopSound() {
    a.load();
}

function orderIssue() {
    var _id = context.active_order_details._id;
    var reason = prompt("Please describe your Issue:");
    if (!reason)
        return alert('Issue not described.');

    $.ajax({
        url: config.server_url + '/api/v1/res/protected/restaurant/' + user.restaurant_name + '/order/issue',
        headers: {
            'Authorization': user.token,
            'Content-Type': 'application/json'
        },
        data: JSON.stringify({order_id: _id, reason: reason}),
        type: 'POST',
        dataType: "json",
        success: function (json) {
            console.log(json);
            orderRefresh();
        },
        error: function (xhr, _status, errorThrown) {
            console.log("err: ", {status: _status, err: errorThrown, xhr: xhr});
            alert('error');
        }
    });
}

function updateRestaurantDetails() {
    var _data = {
        location: $('.js-r-a').val().split(','),
        contact_number: $('.js-r-cp').val(),
        contact_name: $('.js-r-cn').val(),
        contact_email: $('.js-r-contact_email').val(),
        bank_name: $('.js-r-bank_name').val(),
        bank_account_name: $('.js-r-bank_account_name').val(),
        bank_account_number: $('.js-r-bank_account_number').val(),
        ifsc: $('.js-r-ifsc').val()
    };
    $.ajax({
        url: config.server_url + '/api/v1/res/protected/restaurant/' + user.restaurant_name + '/update',
        headers: {
            'Authorization': user.token,
            'Content-Type': 'application/json'
        },
        type: 'POST',
        data: JSON.stringify(_data),
        dataType: "json",
        success: function (json) {
            console.log(json);
            alert("updated");
            getRestaurant();
        },
        error: function (xhr, _status, errorThrown) {
            console.log("err: ", {status: _status, err: errorThrown, xhr: xhr});
            alert('update restaurant detailed failed.');
        }
    });
}

function renderUnpaidOrderTable() {
    var rows = [];
    var grand_total = 0;
    var grand_total_cod = 0;
    var online_count=0;
    var cod_count=0;
    var grand_total_online = 0;
    var price_recieved_from_cod = 0;
    var balance=0;
    restaurant.unpaid_orders.forEach(function (order, index) {
        var total = 0, dishes = '', dishes_html = '';
        order.dishes_ordered.forEach(function (e) {
            dishes = dishes + e.identifier + ' x ' + e.qty + '<BR/>';
            total = total + (e.price_to_pay * e.qty);
        });
        grand_total += total;
        order.address_full = order.address + '<BR/> Area: ' + order.area + '<BR/> City: ' + order.city;
        order.date = (new Date(order.created_time)).toString().substr(0, 24) + '<BR/>';
        if (order.log && Array.isArray(order.log)) {
            order.log.forEach(function (e) {
                order.date += '<BR/> ' + e.status + ' in '
                    + parseInt((new Date(e.date) - new Date(order.created_time)) / (1000 * 60), 10) + ' min.';
            });
        }
        order.total = total;
        order.dishes = dishes;
        order.status = order.status + (order.issue_raised ? '</BR>Issue:<b style="color: red">' + order.issue_reason +"</b>": '');

        var displayStatus = order.status;
        if (order.delivery && order.delivery.status !== 'not_ready') {
            displayStatus += '<BR/><BR/>Delivery Status: ' + order.delivery.status;
            if (order.delivery.details.service === "shadowfax" && order.delivery.details.data.pickup_contact_number) {
                displayStatus += '<BR/><BR/>Pickup Contact: ' + order.delivery.details.data.pickup_contact_number;
            }
        }
        if(order.payment_mode=='cod'){
            price_recieved_from_cod += order.delivery_price_recieved;
            grand_total_cod += total;
            cod_count++;
            rows.push('<tr><td>' + order.combined_id+"<BR/>"+order._id + '<BR/>' + order.address_full + '</td><td>'
                + order.status + '</td><td>'
                + order.date + '</td><td>' + dishes + '</td><td>received:'+order.delivery_price_recieved+"<BR/>"
                + total + '<BR/><BR/>' + order.payment_mode + '<BR/><BR/>' + order.payment_status + '</td></tr>');
        }else{
            grand_total_online += total;
            online_count++;
            rows.push('<tr><td>combined id:' +order.combined_id+"<BR/> restaurant id:"+ order._id + '<BR/>' + order.address_full + '</td><td>'
                + order.status + '</td><td>'
                + order.date + '</td><td>' + dishes + '</td><td>'
                + total + '<BR/><BR/>' + order.payment_mode + '<BR/><BR/>' + order.payment_status + '</td></tr>');
        }
    });
    balance=grand_total-price_recieved_from_cod;
    var table = '<table align="center" cellpadding="0" cellspacing="0" class="status-tbl col-md-12"> <tr class="heading-row"> <td>OrderID / Address</td> <td>Status</td> <td>Date</td> <td>Dishes</td> <td>Total</td> </tr>' + rows.join('') + '</table>';

    $('.js-current-transaction-table').html(table);
    $('#total_amount').html(grand_total);
    $('#total_number').html(restaurant.unpaid_orders.length);
    $('#online_number').html(online_count);
    $('#online_amount').html(grand_total_online);
    $('#cod_number').html(cod_count);
    $('#cod_amount_payout').html(grand_total_cod);
    $('#cod_amount').html(price_recieved_from_cod);
    $('#balance').html(balance);
}

function unpaidOrderRefresh() {
    console.log('unpaidOrderRefresh');
    $.ajax({
        url: config.server_url + '/api/v1/res/protected/restaurant/' + user.restaurant_name + '/orders/unpaid',
        headers: {
            'Authorization': user.token,
            'Content-Type': 'application/json'
        },
        type: 'GET',
        dataType: "json",
        success: function (json) {
            console.log(json);
            if (Array.isArray(json)) {
                restaurant.unpaid_orders = json;
                renderUnpaidOrderTable();
            }
        },
        error: function (xhr, _status, errorThrown) {
            console.log("err: ", {status: _status, err: errorThrown, xhr: xhr});
        }
    });
}

function searchTransaction(i) {
    var query = '?offset=' + ( i || 0);
    var start = $('.js-s-start').val() ? Date.parse($('.js-s-start').val()) : '';
    var end = $('.js-s-end').val() ? Date.parse($('.js-s-end').val()) : '';
    var search = $('.js-s-search').val();

    if (start) {
        start = new Date(start);
        query += '&start_date=' + start.toISOString();
    }
    if (end) {
        end = new Date(end);
        end = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59);
        query += '&end_date=' + end.toISOString();
    }
    if (search)
        query += '&search=' + search.toString();

    $.ajax({
        url: config.server_url + '/api/v1/res/protected/restaurant/' + user.restaurant_name + '/orders' + query,
        headers: {
            'Authorization': user.token,
            'Content-Type': 'application/json'
        },
        type: 'GET',
        dataType: "json",
        success: function (json) {
            console.log(json);
            if (Array.isArray(json)) {
                if (i)
                    context.search_results = context.search_results.concat(json);
                else
                    context.search_results = json;
                renderSearchTable();
                console.log('result & search result count', json.length, context.search_results.length);
            }
        },
        error: function (xhr, _status, errorThrown) {
            console.log("err: ", {status: _status, err: errorThrown, xhr: xhr});
        }
    });
}

function loadMoreSearch() {
    searchTransaction(context.search_results.length);
}

function renderSearchTable() {
    var rows = [];
    context.search_results.forEach(function (order, index) {
        var total = 0, dishes = '';

        order.dishes_ordered.forEach(function (e) {
            dishes = dishes + e.identifier + ' x ' + e.qty + '<BR/>';
            total = total + (e.price_to_pay * e.qty);
        });

        order.address_full = order.customer_name + '(' + order.customer_number + ')<BR/>' + order.address + '<BR/> Locality: ' + order.locality + '<BR/> Area: ' + order.area + '<BR/> City: ' + order.city;
        order.date = (new Date(order.created_time)).toString().substr(0, 24) + '<BR/>';
        if (order.log && Array.isArray(order.log)) {
            order.log.forEach(function (e) {
                order.date += '<BR/> ' + e.status + ' in '
                    + parseInt((new Date(e.date) - new Date(order.created_time)) / (1000 * 60), 10) + ' min.';
            });
        }
        order.total = total;
        order.dishes = dishes;
        order.status = order.status + (order.issue_raised ? '</BR><b style="color: red">Issue:' + order.issue_reason+"</b>" : '');

        rows.push('<tr><td>combined id:' +order.combined_id+"<BR/> restaurant id:" + order._id + '<BR/>' + order.address_full + '</td><td>'
            + order.status + '</td><td>'
            + order.date + '</td><td>' + dishes + '</td><td>'
            + total + '</td></tr>');
    });
    var table = '<table align="center" cellpadding="0" cellspacing="0" class="status-tbl col-md-12">' + rows.join('') + '</table>';

    $('.js-search-table').html(table);
}
