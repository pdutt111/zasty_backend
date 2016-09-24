var config = {
    server_url: window.location.origin,
    location_url: 'https://runkit.io/rahulroy9202/57de3489e057cd14001ba5e3/branches/master',
    afterLogin: 'location.html'
};
var user, restaurant, location, context = {}, cart = {};

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
    var search = $(".js-dish-search");
    search.select2({placeholder: "search the menu"});
    search.prop("disabled", true);
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
            restaurant.dishes.forEach(function (e, i) {
                if (!e.id)
                    e.id = i;
                e.text = e.identifier;
            });
            restaurant.dishes_active = restaurant.dishes.slice();
            renderMenu();
            renderCart();

            search.select2({
                data: restaurant.dishes,
                placeholder: "search the menu",
                allowClear: true
            });
            search.prop("disabled", false);
            search.select2().select2("val", {text: 'search the menu'});

            search.on("select2:select", function (e) {

                console.log("change", e.params.data.id);
                restaurant.dishes_active = [restaurant.dishes[e.params.data.id]];
                renderMenu();
                search.select2().select2("val", {text: 'search the menu'});
            });

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

            var cartButtonText = 'Add to Cart';
            if (cart[dish.id])
                cartButtonText = 'In Cart';

            var dishVar = "";
            dishVar += "<div class=\"food-item\">";
            dishVar += "                    <div class=\"item-image\">";
            dishVar += "                        <img src=\" " + dish.details.image + "\" alt=\"\">";
            dishVar += "                        <div class=\"item-summary-wrpr\">";
            dishVar += "                            <div>";
            dishVar += "                                <div class=\"item-summary\">";
            dishVar += dish.details.description;
            dishVar += "                                    <div class=\"clear20\"><\/div>";
            dishVar += "                                    <span class=\"action-btn dpInblk knowmore\""
                + "onclick=knowMore(" + dish.id + ")"
                + ">Know More<\/span>";
            dishVar += "                                <\/div>";
            dishVar += "                            <\/div>";
            dishVar += "                        <\/div>";
            dishVar += "                    <\/div>";
            dishVar += "                    <div class=\"item-info\">";
            dishVar += "                        <h5 class=\"tgreydark\">" + dish.identifier + "<\/h5>";
            dishVar += "                        <div>";
            dishVar += "                            <div class=\"veg-type fL dpInblk\">";
            dishVar += "                                <span class=\""
                + (dish.details.type == 'veg'
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
            dishVar += "                            <div class=\"price fL dpInblk t16\"> &#8377; <span>" + dish.price + "<\/span><\/div>";
            dishVar += "                            <div class=\"addtocart-btn fR dpInblk\""
                + "onclick=addToCart(" + dish.id + ")"
                + "><span class=\"dpInblk action-btn js-menu-id-" + dish.id + "\">" + cartButtonText + "<\/span>";
            dishVar += "                            <\/div>";
            dishVar += "                            <div class=\"clear fN\"><\/div>";
            dishVar += "                        <\/div>";
            dishVar += "                    <\/div>";
            dishVar += "                <\/div>";


            return dishVar;
        }).join('');

        categoryMenuHtml += '<div class="food-rslt" id="' + e.replace(/\s+/, "") + '">'
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
    strVar += "                        <span onclick=\"filterMenu('all')\">All Dishes<\/span>";
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
    strVar += "                    <span class=\"js-cart-count\">" + Object.keys(cart).length + "<\/span>";
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
        $("#tabs").tabs({active: 1});
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

function knowMore(id) {
    console.log('knowMore', id, restaurant.dishes[id]);
    var d = restaurant.dishes[id];
    var html = "";
    html += "<div class=\"overlay\"><\/div>";
    html += "    <div class=\"cntnt\">";
    html += "        <div>";
    html += "            <div class=\"lft-pane\" style='background-image: url(\"" + d.details.image + "\")'><\/div>";
    html += "            <div class=\"rght-pane\">";
    html += "                <div class=\"item-info\">";
    html += "                    <h5 class=\"tgreyteel t20 nomargin uppercase\">" + d.identifier + "<\/h5>";
    html += "                    <p class=\"tgreylight t12\">" + d.description + "<\/p>";
    html += "                    <div class=\"clear10\"><\/div>";
    html += "                    <span class=\"dpBlk t16 \">₹ " + d.price + "<\/span>";
    html += "                    <div class=\"clear10\"><\/div>";
    html += "                    <font class=\"dpInblk action-btn\" onclick='addToCart(" + d.id + ")'><i class=\"fa fa-plus\"><\/i> Add to Cart<\/font>";
    html += "                    <div class=\"clear20\"><\/div>";
    html += "                    <div id=\"tabs2\" class=\"item-detail-tab\">";
    html += "                        <div class=\"navbar\">";
    html += "                            <ul>";
    html += "                                <li><a href=\"#details\">details<\/a><\/li>";
    html += "                                <li><a href=\"#prep\">prep<\/a><\/li>";
    html += "                                <li><a href=\"#ingredients\">ingredients<\/a><\/li>";
    html += "                                <li><a href=\"#nutrition\">nutrition<\/a><\/li>";
    html += "                            <\/ul>";
    html += "                        <\/div>";
    html += "                        <div class=\"navbar-info\">";
    html += "                            <div id=\"details\" class=\"details t12 pad15\">"
        + (d.details.details || '') + "<\/div>";
    html += "                            <div id=\"prep\" class=\"prep pad15 t12\">"
        + (d.details.prep || '') + "<\/div>";
    html += "                            <div id=\"ingredients\" class=\"ingredients t12\">"
        + (d.details.ingredients || '') + "<\/div>";
    html += "                            <div id=\"nutrition\" class=\"nutrition t12\">"
        + (d.details.nutrition || '') + "<\/div>";
    html += "                        <\/div>";
    html += "                    <\/div>";
    html += "                <\/div>";
    html += "            <\/div>";
    html += "            <span class=\"fa fa-close knowmore-close\"><\/span>";
    html += "        <\/div>";
    html += "    <\/div>";


    $(".knowmore-wrpr").html(html);
    $("#tabs2").tabs();
    $(".knowmore-wrpr").css('display', 'table');
    $(function () {
        $(".knowmore-close").click(function () {
            $('.knowmore-wrpr').css('display', 'none');
        });
    });
}

function addToCart(id) {
    console.log('addToCart', id, restaurant.dishes[id]);
    if (!cart[id])
        cart[id] = 1;
    else
        cart[id] = cart[id] + 1;
    renderCart();
    // creates jump to first tab.
    //renderMenu();

    $('.js-menu-id-' + id).html('In Cart');
}

function removeFromCart(id) {
    console.log('removeFromCart', id, restaurant.dishes[id]);
    delete cart[id];
    renderCart();
    $('.js-menu-id-' + id).html('Add to Cart');
}

function changeQuantity(id, quantity) {
    console.log('chnageQuantity', id, quantity, restaurant.dishes[id]);
    cart[id] = parseInt(quantity, 10);
    renderCart();
}

function renderCart() {
    var total = 0;

    $('.js-cart-count').html(Object.keys(cart).length);
    var cartHtml = "";
    cartHtml += "<div class=\"item\">";
    cartHtml += "<div class=\"tgreylight\">";
    cartHtml += "<img src=\"images\/smiley.png\" alt=\"\">";
    cartHtml += "<p class=\"t20\">Awww shucks!<\/p>";
    cartHtml += "<p>Your cart is empty<\/p>";
    cartHtml += "<div class=\"clear10\"><\/div>";
    cartHtml += "<\/div>";
    cartHtml += "<\/div>";

    if (Object.keys(cart).length) {
        cartHtml = "";
        for (var i in cart) {
            var d = restaurant.dishes[i];
            total = total + d.price * cart[i];
            var selectOpt = '';
            for (var j = 1; j < (5 >= cart[i] ? 5 : cart[i]); j++) {
                if (j == cart[i])
                    selectOpt += '<option selected="selected">' + j + '<\/option>';
                else
                    selectOpt += '<option>' + j + '<\/option>';
            }

            var cartItem = "";
            cartItem += "<div class=\"item\">";
            cartItem += "<div class=\"lft-pane\" style='background-image: url(\"" + d.details.image + "\")'><\/div>";
            cartItem += "<div class=\"rght-pane\">";
            cartItem += "    <div class=\"item-info\">";
            cartItem += "        <h4>" + d.identifier + "<\/h4>";
            cartItem += "        <font class=\"dpBlk\">";
            cartItem += "            <select onchange=\"changeQuantity(" + d.id + ",this.value);\" class=\"fL dpInblk vab\">";
            cartItem += selectOpt;

            cartItem += "            <\/select>";
            cartItem += "            <span class=\"fR dpInblk vab\">₹ " + d.price + "<\/span>";
            cartItem += "            <div class=\"clear fN\"><\/div>";
            cartItem += "        <\/font>";
            cartItem += "        <span onclick='removeFromCart(" + d.id + ")' class=\"dpInblk close fa fa-close\"><\/span>";
            cartItem += "    <\/div>";
            cartItem += "<\/div>";
            cartItem += "<\/div>";
            cartItem += "";

            cartHtml += cartItem;
        }
    }
    $(".cartlist").html(cartHtml);


    $(".js-total-price").html(total);

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