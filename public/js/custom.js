var config = {
  server_url: window.location.origin
};
var user, restaurant, context = {};

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
        renderDishTable(restaurant.dishes);
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

function doSignup(e) {
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
  var table = '<table align="center" cellpadding="0" cellspacing="0" class="status-tbl col-md-12"><tr class="heading-row"><td>Dish Name</td><td>Value</td><td>Available</td><td>Details</td></tr>' + rows + '</table>';

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