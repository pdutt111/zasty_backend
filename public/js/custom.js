var config = {
  server_url: 'http://127.0.0.1:3000'
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

  if (window.location.href.indexOf('login') != -1) {
    return false;
  }
  console.log('getUser2');
  if (user.token && (new Date(user.expires) > Date.now())) {
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

function renderDishTable(dishes) {
  var rows = dishes.map(function (dish, index) {
    return '<tr> <td>' + dish.identifier + '</td> <td>' + dish.price + '</td> <td><a onclick="editDish(' + index + ')">edit</a></td></tr>';
  });
  var table = '<table align="center" cellpadding="0" cellspacing="0" class="status-tbl col-md-12"><tr class="heading-row"><td>Dish Name</td><td>Value</td><td>Details</td></tr>' + rows + '</table>';

  $('.js-dish-table').html(table);
}

function editDish(i) {
  console.log('editDish', i);
  context.active_dish = i;
  $('.js-curr-dish-name').html(restaurant.dishes[i].identifier);
  $('.js-curr-dish-value').html(restaurant.dishes[i].price);
}