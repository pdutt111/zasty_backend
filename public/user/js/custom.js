var config = {
    server_url: window.location.origin,
    location_url: 'https://runkit.io/rahulroy9202/57de3489e057cd14001ba5e3/branches/master',
    afterLogin: 'location.html'
};
var user, restaurant, location, context = {};

window.onload = function (e) {
    getUser();
    initSignupNLogin();
    init();
};

function init() {
    switch (window.zasty_page) {
        case 'location':
            initLocation();
            break;
        case 'menu':
            initMenu();
            break;
        case 'checkout':
            break;
    }
}

function initLocation() {
    var select = $(".js-location-select");
    select.select2({});
    select.prop("disabled", true);
    $.ajax({
        url: config.location_url,
        type: 'GET',
        dataType: "json",
        success: function (json) {
            console.log(json);
            var loc = [];
            json.forEach(function (e, i) {
                loc.push({id: i, text: e});
            });

            select.select2({
                data: loc
            });

            select.prop("disabled", false);
            select.on("select2:select", function (e) {
                console.log("change", e.params.data.text);
                Cookies.set('location', e.params.data.text);
                window.location = '/menu.html';
            });
        },
        error: function (xhr, _status, errorThrown) {
            console.log("err: ", {status: _status, err: errorThrown, xhr: xhr});
            $('.error').toggle(true);
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

function logOut() {
    console.log('logOut');
    Cookies.remove('user');
    Cookies.remove('location');
    window.location.href = '/login.html';
}

function getUser() {
    console.log('getUser');
    user = Cookies.getJSON('user');
    //if (/login|signup/.test(window.location.href || window.zasty_page === 'location')) {
    //    return false;
    //}
    //if (user && user.token && (new Date(user.expires) > Date.now())) {
    //    $.ajax({
    //        url: config.server_url + '/api/v1/users/protected/info',
    //        headers: {
    //            'Authorization': user.token,
    //            'Content-Type': 'application/json'
    //        },
    //        type: 'GET',
    //        dataType: "json",
    //        success: function (json) {
    //            console.log(json);
    //            if (json.email) {
    //                user.email = json.email;
    //                user.phonenumber = json.phonenumber || '';
    //                user.restaurant_name = json.restaurant_name || null;
    //                $('.js-user-email').html(user.email);
    //
    //                afterLogin
    //                    ? afterLogin()
    //                    : '';
    //
    //            } else {
    //                logOut();
    //            }
    //        },
    //        error: function (xhr, _status, errorThrown) {
    //            console.log("err: ", {status: _status, err: errorThrown, xhr: xhr});
    //            $('.js-login-error').toggle(true);
    //        }
    //    });
    //} else {
    //    window.location.href = '/login.html';
    //}
}

function initMenu() {
    $.ajax({
        url: 'https://runkit.io/rahulroy9202/57e6169b900b9c13004e5083/branches/master',
        headers: {
            'Content-Type': 'application/json'
        },
        type: 'GET',
        dataType: "json",
        success: function (json) {
            console.log(json);
            restaurant = json;
            restaurant.dishes_active = restaurant.dishes.slice();
            renderMenu();
        },
        error: function (xhr, _status, errorThrown) {
            console.log("err: ", {status: _status, err: errorThrown, xhr: xhr});
        }
    });

}

function renderMenu() {
    var categories = [];
    restaurant.dishes_active.forEach(function (e) {
        var c = e.details.category[0];
        if (categories.indexOf(c) == -1) {
            categories.push(c);
        }
    });
    restaurant.dishes_active.forEach(function (e) {
        e.details.category.forEach(function (c) {
            if (categories.indexOf(c) == -1) {
                categories.push(c);
            }
        })
    });

    var categoryMenu = [];
    var categoryMenuHtml = '';
    var categoryList = '';
    categories.forEach(function (e, i) {
        restaurant.dishes_active.forEach(function (d) {
            if (d.details.category.indexOf(e) !== -1) {
                if (!Array.isArray(categoryMenu[i]))
                    categoryMenu[i] = [];
                categoryMenu[i].push(d);
            }
        });
        var categoryDishesHtml = categoryMenu[i].map(function (dish) {

            var dishVar="";
            dishVar += "<div class=\"food-item\">";
            dishVar += "                    <div class=\"item-image\">";
            dishVar += "                        <img src=\" " + dish.details.image + "\" alt=\"\">";
            dishVar += "                        <div class=\"item-summary-wrpr\">";
            dishVar += "                            <div>";
            dishVar += "                                <div class=\"item-summary\">";
            dishVar += dish.details.description;
            dishVar += "                                    <div class=\"clear20\"><\/div>";
            dishVar += "                                    <span class=\"action-btn dpInblk knowmore\">Know More<\/span>";
            dishVar += "                                <\/div>";
            dishVar += "                            <\/div>";
            dishVar += "                        <\/div>";
            dishVar += "                    <\/div>";
            dishVar += "                    <div class=\"item-info\">";
            dishVar += "                        <h5 class=\"tgreydark\">" + dish.identifier + "<\/h5>";
            dishVar += "                        <div>";
            dishVar += "                            <div class=\"veg-type fL dpInblk\">";
            dishVar += "                                <span class=\""
            + (dish.details.type=='veg'
                ? 'veg'
                : 'non-veg')
                + " dpInblk\"><\/span>";
            dishVar += "                                <font class=\"item-cat dpInblk tgreyteel\">"
                + dish.details.category.join(', ') + "<\/font>";
            dishVar += "                            <\/div>";
            dishVar += "                            <div class=\"avail-time fR dpInblk\">";
            dishVar += "                                <small><\/small>";
            dishVar += "                            <\/div>";
            dishVar += "                            <div class=\"clear fN\"><\/div>";
            dishVar += "                        <\/div>";
            dishVar += "                        <div class=\"clear10\"><\/div>";
            dishVar += "                        <div>";
            dishVar += "                            <div class=\"price fL dpInblk t16\"> &#8377; <span>550<\/span><\/div>";
            dishVar += "                            <div class=\"addtocart-btn fR dpInblk\"><span class=\"dpInblk action-btn\">Add to Cart<\/span>";
            dishVar += "                            <\/div>";
            dishVar += "                            <div class=\"clear fN\"><\/div>";
            dishVar += "                        <\/div>";
            dishVar += "                    <\/div>";
            dishVar += "                <\/div>";


            return dishVar;
        }).join('');

        categoryMenuHtml += '<div class="food-rslt" id="'+e.replace(/\s+/, "")+'">'
            + categoryDishesHtml
            + '<div class="clear fN"></div> </div>';

        categoryList += '<li><a href="#' + e.replace(/\s+/, "") + '">' + e + '</a></li>';
    });

    var strVar = "";
    strVar += "<div id=\"tabs1\">";
    strVar += "        <div class=\"container tcenter posrel cat-type\">";
    strVar += "            <div class=\"fltr-wrpr\">";
    strVar += "                <div class=\"fltr-btn pad15\">";
    strVar += "                    <i class=\"fa fa-filter\"><\/i>";
    strVar += "                <\/div>";
    strVar += "                <div class=\"foodcat-wrpr tleft\">";
    strVar += "                    <p class=\"fltr-blk\">";
    strVar += "                        <span onclick=\"filterMenu('all')\" class=\"active\">All Dishes<\/span>";
    strVar += "                        <span onclick=\"filterMenu('egg')\">Eggetarian<\/span>";
    strVar += "                        <span onclick=\"filterMenu('veg')\">Vegetarian<\/span>";
    strVar += "                    <\/p>";
    strVar += "                <\/div>";
    strVar += "            <\/div>";
    strVar += "            <ul class=\"dpBlk w100 dish-menu\">";

    strVar += categoryList;

    strVar += "";
    strVar += "            <\/ul>";
    strVar += "            <div class=\"cart-wrpr\">";
    strVar += "                <div class=\"cart-btn pad15\">";
    strVar += "                    <i class=\"fa fa-shopping-cart\"><\/i>";
    strVar += "                    <span>2<\/span>";
    strVar += "                <\/div>";
    strVar += "            <\/div>";
    strVar += "        <\/div>";
    strVar += "        <div class=\"container food-rslt-cntnr\">";

    strVar += categoryMenuHtml;

    strVar += "        <\/div>";
    strVar += "    <\/div>";

    //console.log(categoryList, categoryMenu);
    $('.foodrslt-wrpr').html(strVar);

    $(function () {
        $("#tabs1, #tabs2").tabs();
        $( "#tabs" ).tabs({ active: 1 });
        $(".popup-trig").click(function () {
            $(".pop-cntnt").css('display', 'table');
        });
        $(".pop-cntnt li").click(function () {
            $('.pop-cntnt').css('display', 'none');
        });

        $(".knowmore").click(function () {
            $(".knowmore-wrpr").css('display', 'table');
        });
        $(".knowmore-close").click(function () {
            $('.knowmore-wrpr').css('display', 'none');
        });

        $(".fltr-wrpr").click(function () {
            $(".foodcat-wrpr").slideToggle();
        });

        $(".cart-wrpr").click(function () {
            $('.cartslide-wrpr').css('display', 'block')
            $('.cartslide-wrpr .cntnt').css('right', '0px');
        });
        $(".rightslide").click(function () {
            $(".cartslide-wrpr").css('display', 'none');
        });
        $(".cartslide-wrpr .cntnt").click(function (e) {
            e.stopPropagation();
            return false;
        });
    });
}

function filterMenu(type) {
    if (type == 'all')
        restaurant.dishes_active = restaurant.dishes.slice();
    else {
        restaurant.dishes_active = restaurant.dishes.filter(function (e) {
            if (e.details.type == type)
                return true;
        });
    }
    renderMenu();
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