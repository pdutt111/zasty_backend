var config = {
  server_url: window.location.origin,
  order_poll_interval: 45
};
var user, restaurant, context = {};
var order_states = ['awaiting response', 'rejected', 'confirmed', 'prepared', 'dispatched'];

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
}

function logOut() {
  console.log('logOut');
  Cookies.remove('user');
  window.location.href = '/login.html';
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
    window.location.href = '/login.html';
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
        unpaidOrderRefresh();
        $('.js-r-a').val(restaurant.location.join(','));
        $('.js-r-cp').val(restaurant.contact_number);
        $('.js-r-cn').val(restaurant.contact_name);

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
  event.preventDefault();
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
    return '<tr><td>' + dish.identifier + '</td> <td>' + dish.price + '</td>'
      + '<td><input type="checkbox"' + (dish.availability ? (' checked="' + dish.availability) : '') + '" onclick="toggleDish(' + index + ');" ></td>'
      + '<td><a onclick="dishDetails(' + index + ')">edit</a></td></tr>';
  });
  var table = '<table align="center" cellpadding="0" cellspacing="0" class="status-tbl col-md-12"><tr class="heading-row"><td>Dish Name</td><td>Value</td><td>Available</td><td>Details</td></tr>' + rows.join('') + '</table>';

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
    order.date = (new Date(order.created_time)).toString().substr(0, 24);
    order.total = total;
    order.dishes = dishes;
    order.dishes_html = dishes_html;
    order.buttons = '';
    var state_index = order_states.indexOf(order.status);
    var style = '';
    //accept reject buttons
    if (order.status === order_states[0]) {
      playSound();
      style = 'class="tr-new""';
      order.buttons = '<button type="button" onclick="changeOrderStatus(' + index + ',' + true + ')">Accept</button> <button type="button" onclick="changeOrderStatus(' + index + ',' + false + ')">Reject</button>';
    }

    //other buttons
    if (state_index > 1 && state_index < order_states.length - 1) {
      order.buttons = '<button type="button" onclick="changeOrderStatus('
        + index + ')">' + order_states[state_index + 1] + '</button>';
    }

    rows.push('<tr ' + style + '><td>' + order._id + '<BR/>' + order.address_full + '</td><td>'
      + order.status + '<BR/>' + order.buttons + '</td><td>'
      + order.date + '</td><td>' + dishes + '</td><td>'
      + total + '</td><td><a onclick="orderDetails(' + index + ')">view</a></td></tr>');
  });
  var table = '<table align="center" cellpadding="0" cellspacing="0" class="status-tbl col-md-12"> <tr class="heading-row"> <td>OrderID / Address</td> <td>Status</td> <td>Date</td> <td>Dishes</td> <td>Total</td> <td>Details</td> </tr>' + rows.join('') + '</table>';

  $('.js-order-table').html(table);
  setTimeout(orderRefresh, 1000 * config.order_poll_interval);
}

function orderRefresh() {
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
      }
    },
    error: function (xhr, _status, errorThrown) {
      console.log("err: ", {status: _status, err: errorThrown, xhr: xhr});
      orderRefresh();
    }
  });
}

function orderDetails(i) {
  console.log('orderDetails', i);
  context.active_order = i;
  context.active_order_details = restaurant.orders[i];

  var o = context.active_order_details;
  $('.js-od').toggle(true);
  $('.js-od-id').html(o._id);
  $('.js-od-date').html(o.date);
  $('.js-od-total').html(o.total);
  $('.js-od-status').html(o.status);
  $('.js-od-address').html(o.address_full);
  $('.js-od-dishes').html(o.dishes_html);
}

function changeOrderStatus(i, accept) {
  console.log('changeOrderStatus', i);
  var state = restaurant.orders[i].status;
  var _id = restaurant.orders[i]._id;
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
a = new Audio(config.server_url + '/audio/alertS.mp3');
a.loop = true;
function playSound() {
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
    contact_name: $('.js-r-cn').val()
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
      getRestaurant();
    },
    error: function (xhr, _status, errorThrown) {
      console.log("err: ", {status: _status, err: errorThrown, xhr: xhr});
      alert('update restaurant detailed failed.');
    }
  });
}

function renderUnpaidOrderTable() {
  console.log('renderOrderTable');
  var rows = [];
  var grand_total = 0;
  restaurant.unpaid_orders.forEach(function (order, index) {
    var total = 0, dishes = '', dishes_html = '';

    order.dishes_ordered.forEach(function (e) {
      dishes = dishes + e.identifier + ' x ' + e.qty + '<BR/>';
      total = total + (e.price_to_pay * e.qty);
    });
    grand_total += total;
    order.address_full = order.address + '<BR/> Area: ' + order.area + '<BR/> City: ' + order.city;
    order.date = (new Date(order.created_time)).toString().substr(0, 24);
    order.total = total;
    order.dishes = dishes;

    rows.push('<tr><td>' + order._id + '<BR/>' + order.address_full + '</td><td>'
      + order.status + '</td><td>'
      + order.date + '</td><td>' + dishes + '</td><td>'
      + total + '</td></tr>');
  });
  var table = '<table align="center" cellpadding="0" cellspacing="0" class="status-tbl col-md-12"> <tr class="heading-row"> <td>OrderID / Address</td> <td>Status</td> <td>Date</td> <td>Dishes</td> <td>Total</td> </tr>' + rows.join('') + '</table>';

  $('.js-current-transaction-table').html(table);
  $('.js-ct-total').html(grand_total);
  $('.js-ct-count').html(restaurant.unpaid_orders.length);
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