var config = {
    server_url: window.location.origin,
    // server_url: 'http://zasty.co:3000',
    location_url: '/api/v1/order/area?city=gurgaon&locality=gurgaon',
    restaurant_url: '/api/v1/order/servicingRestaurant?city=gurgaon&area=',
    afterLogin: 'location.html'
};

var user, restaurant, location, context = {}, cart = {};

window.onload = function (e) {
    initSignupNLogin();
    init();
};

function init() {
    //$('.popup-genric').toggle(false);
    $('.js-location').html(Cookies.get('location') || '');
    $('.js-location').val(Cookies.get('location') || '');

    switch (window.zasty_page) {
        case 'location':
            getUser();
            initLocation();
            break;
        case 'menu':
            getUser();
            initMenu();
            initLocation('alt');
            break;
        case 'checkout':
            getUser('hard');
            initCheckout();
            break;
    }
}
function resend(){
    if($('.js-user-phonenumber').val()==""){
        alertify.alert('please enter phonenumber');
        return;
    }
    $.ajax({
        url: config.server_url + '/api/v1/order/protected/phonenumber/code',
        headers: {
            'Authorization': user.token,
            'Content-Type': 'application/json'
        },
        type: 'POST',
        data: JSON.stringify({phonenumber:$('.js-user-phonenumber').val()}),
        dataType: "json",
        success: function (json) {
            $(".otp-lyr").css('display','table');
            // placeOrderType=type;
        },
        error: function (xhr, _status, errorThrown) {
            alertify.alert("Error Occurred");
            console.log("err: ", {status: _status, err: errorThrown, xhr: xhr});
        }
    });
    return;
}
var confirm_code;
var placeOrderType
function setCode(){
    if($('#confirm_code').val()!=""){
        confirm_code=$('#confirm_code').val();
        $(".otp-lyr").css('display','none');
        placeOrder(placeOrderType);

    }else{
        alertify.alert("please enter pin");
    }
}
function placeOrder(type) {
    console.log(type);
    var dishes = {};
    Object.keys(cart).forEach(function (key) {
        dishes[restaurant.dishes[key].identifier] = {
            "qty": cart[key],
            "price": restaurant.dishes[key].price_to_consumer
        }
    });

    var payload = {
        "city": "gurgaon",
        "locality": 'gurgaon',
        "area": Cookies.get('location'),
        "address": $('.js-address').val(),
        "dishes_ordered": dishes,
        "customer_name": $('.js-user-name').val(),
        "customer_email": $('.js-user-email').val(),
        "customer_number": $('.js-user-phonenumber').val(),
        "coupon": $('.js-coupon').val(),
        "restaurant_name": "zasty"
    };
    for (var i in payload) {
        if (!payload[i] && i !== 'coupon'){
            console.log(i);
            return alertify.alert('Incomplete Details');
        }
        if (i === 'customer_number' && (payload[i].length < 10 || isNaN(parseInt(payload[i]))))
            return alertify.alert('Incorrect Phone Number');
        if (i === 'customer_name' && payload[i].length < 4)
            return alertify.alert('Incomplete Name');
    }

    if (!payload.address) {
        return alertify.alert('Enter Address');
    }

    if (type === 'cod') {
        payload.payment_mode = 'cod';
        payload.payment_status = 'confirmed';
    } else {
        payload.payment_mode = 'payu';
        payload.payment_status = 'pending';
    }
    if(!confirm_code){
        if($('.js-user-phonenumber').val()==""){
            alertify.alert('please enter phonenumber');
            return;
        }
        $.ajax({
            url: config.server_url + '/api/v1/order/protected/phonenumber/code',
            headers: {
                'Authorization': user.token,
                'Content-Type': 'application/json'
            },
            type: 'POST',
            data: JSON.stringify({phonenumber:$('.js-user-phonenumber').val()}),
            dataType: "json",
            success: function (json) {
                $(".otp-lyr").css('display','table');
                placeOrderType=type;
            },
            error: function (xhr, _status, errorThrown) {
                alertify.alert("Error Occurred");
                console.log("err: ", {status: _status, err: errorThrown, xhr: xhr});
            }
        });
        return;
    }
    payload.code=confirm_code;
    confirm_code=null;
    console.log('placeOrder', type);
    console.log(payload);

    $.ajax({
        url: config.server_url + '/api/v1/order/order',
        headers: {
            'Authorization': user.token,
            'Content-Type': 'application/json'
        },
        type: 'POST',
        data: JSON.stringify(payload),
        dataType: "json",
        success: function (json) {
            console.log(json);
            // Cookies.remove('cart');
            // cart = {};
            window.setTimeout(function () {
                //$('.popup-genric').toggle(false);
            }, 1000 * 5);

            if (json.id && payload.payment_mode == 'cod') {
                window.location='/track.html?orderid='+json.id
                // $('.js-order-id').html(
                //     'Your order has been placed successfully. Order ID: ' + json.id
                //     + '<BR>Order details have been emailed to you.<BR>Thank You.'
                // );
                // $('.popup').toggle(true);
            } else {
                $('.js-order-id').html(
                    'Your payment is being processed. Order ID: ' + json.id
                    + '<BR>Order details will be emailed to you.<BR>Thank You.'
                );

                $('.popup').toggle(true);

                payU(json);
            }
            placeOrderType=null;
        },
        error: function (xhr, _status, errorThrown) {
            console.log("err: ", {status: _status, err: errorThrown, xhr: xhr});
            alertify.alert("Wrong pin entered");
        }
    });
}

function payU(order) {
    var form = document.getElementById("payuForm");
    console.log(order);

    form.elements["key"].value = order.key;
    form.elements["hash"].value = order.hash;
    form.elements["txnid"].value = order.txnid;
    form.elements["firstname"].value = order.firstname;
    form.elements["email"].value = order.email;
    form.elements["phone"].value = order.phone;
    form.elements["furl"].value = order.furl;
    form.elements["surl"].value = order.surl;
    form.elements["amount"].value = parseFloat(parseFloat(order.price).toFixed(2));

    form.action = order.payu_url;
    form.submit();
}

function checkCoupon() {
    var coupon = $('.js-coupon').val();
    $.ajax({
        url: config.server_url + '/api/v1/order/coupon?code=' + coupon,
        type: 'GET',
        dataType: "json",
        success: function (json) {
            if (json && json.off && !isNaN(parseFloat(json.off))) {
                context.off = parseInt(json.off);
                renderCart();
            } else {
                alertify.alert("Coupon Failed");
            }
        },
        error: function (xhr, _status, errorThrown) {
            console.log("err: ", {status: _status, err: errorThrown, xhr: xhr});
            $('.error').toggle(true);
        }
    });
}

function initLocation(alt) {
    var select = $(".js-location-select");
    select.select2({maximumSelectionSize: 1,placeholder:"Select Location"});
    select.prop("disabled", true);
    $.ajax({
        url: config.server_url + config.location_url,
        type: 'GET',
        dataType: "json",
        success: function (json) {
            console.log(json);
            if (!alt) {
                var loc = [{id: -1, text: 'Select Location'}];
                $('.popup-genric').toggle(false);
            } else{
                var loc = [{id: -1, text: Cookies.get('location')}];
            }

            json.forEach(function (e, i) {
                loc.push({id: i, text: e});
            });
            var placeholder="Search Location";

            if(window.location.pathname=="/menu.html"){
                placeholder=Cookies.get('location');
            }
            select.select2({
                data: loc,
                placeholder:placeholder,
                maximumSelectionSize: 1,
                allowClear: true
            });

            select.prop("disabled", false);
            select.on("select2:select", function (e) {
                console.log("change", e.params.data.text);
                Cookies.set('location', e.params.data.text);
                if (alt) {
                    Cookies.remove('cart');
                }
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
    window.location.href = '/';
}

function clearState() {
    console.log('clearState');
    Cookies.remove('user');
    Cookies.remove('cart');
    Cookies.remove('location');
    localStorage.removeItem('restaurant');
    window.location.href = '/';
}

function getUser(hard) {
    console.log('getUser');
    user = Cookies.getJSON('user');
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

                    if (hard) {
                        $('.popup-genric').toggle(false);
                    }

                    user.email = json.email;
                    user.phonenumber = json.phonenumber || '';
                    $('.js-user-name').html(json.name || '');
                    $('.js-user-name').val(json.name || '');
                    $('.js-user-email').html(json.email || '');
                    $('.js-user-email').val(json.email || '');
                    $('.js-user-phonenumber').html(json.phonenumber || '');
                    $('.js-user-phonenumber').val(json.phonenumber || '');

                    $(".js-dang").addClass("login");


                    $('.js-user-widget').html('<li class="brdrght lh">Hi ' + (json.name || json.email) + '</li>'
                        + '<li class="lh"><a href="javascript:logOut()">LogOut</a></li>');
                }
            },
            error: function (xhr, _status, errorThrown) {
                console.log("err: ", {status: _status, err: errorThrown, xhr: xhr});
                $('.js-login-error').toggle(true);
                if (hard)
                    window.location.href = '/login.html';
            }
        });
    } else {
        if (hard)
            window.location.href = '/login.html';
    }
}

function initCheckout() {
    restaurant = JSON.parse(localStorage['restaurant'] || '[]');
    cart = Cookies.getJSON('cart') || {};
    renderCart();
}

function goToCheckout(hard) {
    var queryDict = {}
        window.location.search.substr(1).split("&").forEach(function(item) {queryDict[item.split("=")[0]] = item.split("=")[1]});
    cart = Cookies.getJSON('cart') || {};
    if (!Object.keys(cart).length) {
        if (hard)
            alertify.alert('Please add items to Cart');
        else{
            if(queryDict.src&&queryDict.src=="index"){
                window.location = '/index.html';
            }else{
                window.location = '/menu.html';
            }
        }
    } else {
        window.location = '/checkout.html';
    }
}

function initMenu() {
    var search = $(".js-dish-search");
    search.select2({placeholder: "Search Menu",
        maximumSelectionSize: 1,
        allowClear: true});
    search.prop("disabled", true);
    if (!Cookies.get('location'))
        window.location = '/';
    $.ajax({
        url: config.server_url + config.restaurant_url + Cookies.get('location'),
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
                e.details.image = e.details.image.replace(/-/g, "").replace(/HF/g, "")
            });
            restaurant.dishes_active = restaurant.dishes.slice();

            var oldRes = JSON.parse(localStorage['restaurant'] || '[]');

            if (JSON.stringify(oldRes) !== JSON.stringify(restaurant)) {
                Cookies.remove('restaurant');
                Cookies.remove('cart');
            }

            cart = Cookies.getJSON('cart') || {};
            localStorage.setItem('restaurant', JSON.stringify(restaurant));

            renderMenu();
            renderCart();
            $('.popup-genric').toggle(false);

            search.select2({
                data: restaurant.dishes,
                placeholder: 'Search Menu',
                maximumSelectionSize: 1,
                allowClear: true
            });
            search.prop("disabled", false);

            search.on("select2:select", function (e) {
                console.log("change", e.params.data.id);
                restaurant.dishes_active = [restaurant.dishes[e.params.data.id]];
                renderMenu();
                // search.select2().select2("val", {text: restaurant.dishes_active});
                console.log(restaurant.dishes_active[0].identifier);
                // search.select2({placeholder:restaurant.dishes_active[0].identifier});
                search.select2({
                    data: restaurant.dishes,
                    placeholder: restaurant.dishes_active[0].identifier,
                    maximumSelectionSize: 1,
                    allowClear: true
                });
                search.val('').trigger('change')
            });

        },
        error: function (xhr, _status, errorThrown) {
            console.log("err: ", {status: _status, err: errorThrown, xhr: xhr});
            alertify.alert("The Restaurant is Closed. Sorry for the Inconvenience",function(err){
                window.location='/';
            });
        }
    });

}

function renderMenu() {
    var categories = [];
    var sorted_categories=[
        'Trending',
        'Signature',
        'Sides',
        'Meals',
        'Mains'
    ];
    // restaurant.dishes_active.forEach(function (e) {
    //     var c = e.details.categories[0];
    //     if (categories.indexOf(c) == -1) {
    //         categories.push(c);
    //     }
    // });
    restaurant.dishes_active.forEach(function (e) {
        e.details.categories.forEach(function (c) {
            if (categories.indexOf(c) == -1) {
                categories.push(c);
            }
        })
    });
    var final_categories=[];
    sorted_categories.forEach(function(category){
        console.log(categories.indexOf(category));
       if(categories.indexOf(category)!=-1){
           // console.log("removing",category)
           final_categories.push(category);
           // sorted_categories.splice(sorted_categories.indexOf(category),1);
       }
    });
    // console.log(categories,sorted_categories);
    categories=final_categories;
    var categoryMenu = [];
    var categoryMenuHtml = '';
    var categoryList = '';
    categories.forEach(function (e, i) {
        restaurant.dishes_active.forEach(function (d) {
            if (d.details.categories.indexOf(e) !== -1) {
                if (!Array.isArray(categoryMenu[i])){
                    categoryMenu[i] = [];
                }
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
            dishVar += "                        <img src=\"/images/" + dish.details.image.replace(/-/g, "").replace(/HF/g, "") + "\" alt=\"\" onerror='this.src=\"/images/ZOVR02.png\"'>";
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
            dishVar += "                        <h5 class=\"tgreydark\">" + dish.details.identifier + "<\/h5>";
            dishVar += "                        <div>";
            dishVar += "                            <div class=\"veg-type fL dpInblk\">";
            dishVar += "                                <span class=\""
                + (dish.details.type == 'Vegetarian'
                    ? 'veg'
                    : 'non-veg')
                + " dpInblk\"><\/span>";
            dishVar += "                                <font class=\"item-cat dpInblk tgreyteel\">"
                + dish.details.categories.join(', ') + "<\/font>";
            dishVar += "                            <\/div>";
            dishVar += "                            <div class=\"avail-time fR dpInblk\">";
            dishVar += "                                <small><\/small>";
            dishVar += "                            <\/div>";
            dishVar += "                            <div class=\"clear fN\"><\/div>";
            dishVar += "                        <\/div>";
            dishVar += "                        <div class=\"clear10\"><\/div>";
            dishVar += "                        <div>";
            dishVar += "                            <div class=\"price fL dpInblk t16\"> &#8377; <span>" + dish.price_to_consumer + "<\/span><\/div>";
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

        categoryMenuHtml +=
            '<div class="food-rslt" id="' + e.split(' ').join('') + '">'
            + categoryDishesHtml
            + '<div class="clear fN"></div> </div>';

        categoryList += '<li><a href="#' + e.split(' ').join('') + '"><img src="images/' + e.toLowerCase().split(' ').join('') + '.png" alt="">' + "<span>" + e + "<\/span>" + '</a></li>';
    });

    var strVar = "";
    strVar += "<div id=\"tabs1\">";
    strVar += "        <div class=\"container tcenter posrel cat-type sticky\">";
    strVar += "            <div class=\"fltr-wrpr\">";
    strVar += "                <div class=\"fltr-btn pad15\">";
    strVar += "                    <i><img src=\"images\/filter-ico.png\" alt=\"\"><\/i>";
    strVar += "                <\/div>";
    strVar += "                <div class=\"foodcat-wrpr tleft\">";
    strVar += "                    <p class=\"fltr-blk\">";
    strVar += "                        <span id=\"all\" onclick=\"filterMenu('all')\">All Dishes<\/span>";
    strVar += "                        <span id=\"Vegetarian\" onclick=\"filterMenu('Vegetarian')\">Vegetarian<\/span>";
    strVar += "                        <span id=\"Non-Vegetarian\" onclick=\"filterMenu('Non-Vegetarian')\">Non-Vegetarian<\/span>";
    strVar += "                    <\/p>";
    strVar += "                <\/div>";
    strVar += "            <\/div>";
    strVar += "            <ul class=\"dpBlk w100 dish-menu\">";

    strVar += categoryList;

    strVar += "";
    strVar += "            <\/ul>";
    strVar += "            <div class=\"cart-wrpr\">";
    strVar += "                <div class=\"cart-btn pad15\">";
    strVar += "                    <i><img src=\"images\/cart-ico.png\" alt=\"\"><\/i>";
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

    $('#all').removeClass('active');
    $('#Vegetarian').removeClass('active');
    $('#Non-Vegetarian').removeClass('active');

    $('#' + (context.type || 'all')).addClass('active');
}

function filterMenu(type) {
    context.type = type;


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
    html += "            <div class=\"lft-pane\" style='background-image: url(\"" + '/images/' + d.details.image + "\")'><\/div>";
    html += "            <div class=\"rght-pane\">";
    html += "                <div class=\"item-info\">";
    html += "                    <h5 class=\"tgreyteel t20 nomargin uppercase\">" + d.details.identifier + "<\/h5>";
    // html += "                    <p class=\"tgreylight t12\">" + d.description + "<\/p>";
    html += "                    <div class=\"clear10\"><\/div>";
    html += "                    <span class=\"dpBlk t16 \">₹ " + d.price_to_consumer + "<\/span>";
    html += "                    <div class=\"clear10\"><\/div>";
    html += "                    <font class=\"dpInblk action-btn\" onclick='addToCart(" + d.id + ")'><i class=\"fa fa-plus\"><\/i> Add to Cart<\/font>";
    html += "                    <div class=\"clear20\"><\/div>";
    html += "                    <div id=\"tabs2\" class=\"item-detail-tab\">";
    html += "                        <div class=\"navbar\">";
    html += "                            <ul>";
    html += "                                <li><a href=\"#details\">details<\/a><\/li>";
    //html += "                                <li><a href=\"#prep\">prep<\/a><\/li>";
    html += "                                <li><a href=\"#ingredients\">ingredients<\/a><\/li>";
    //html += "                                <li><a href=\"#nutrition\">nutrition<\/a><\/li>";
    html += "                            <\/ul>";
    html += "                        <\/div>";
    html += "                        <div class=\"navbar-info\">";
    html += "                            <div id=\"details\" class=\"details t12 pad15\">"
        + (d.details.details || '') + "<\/div>";
    //html += "                            <div id=\"prep\" class=\"prep pad15 t12\">"
    +(d.details.prep || '') + "<\/div>";
    html += "                            <div id=\"ingredients\" class=\"ingredients t12\">"
        + (d.details.ingredients || '') + "<\/div>";
    //html += "                            <div id=\"nutrition\" class=\"nutrition pad15 t12\">"
    +(d.details.nutrition || '') + "<\/div>";
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
    //else
    //    cart[id] = cart[id] + 1;
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
    Cookies.set('cart', cart);
    var total = 0;
    var c = Object.keys(cart).length;
    console.log('c', c);
    $('.js-cart-count').html(c);
    $(".js-dang2").removeClass("empty").addClass('fill');
    if (!c) {
        $(".js-dang2").addClass("empty").removeClass('fill');
        return;
    }
    var cartHtml = "";

    if (Object.keys(cart).length) {
        cartHtml = "";
        for (var i in cart) {
            var d = restaurant.dishes[i];
            total = total + d.price_to_consumer * cart[i];
            var selectOpt = '';
            for (var j = 1; j < (6 >= cart[i] ? 6 : cart[i]); j++) {
                if (j == cart[i])
                    selectOpt += '<option selected="selected">' + j + '<\/option>';
                else
                    selectOpt += '<option>' + j + '<\/option>';
            }

            var cartItem = "";
            cartItem += "<div class=\"item\">";
            cartItem += "<div class=\"lft-pane\" style='background-image: url(\"" + '/images/' + d.details.image + "\")'> <\/div > ";
            cartItem += "<div class=\"rght-pane\">";
            cartItem += "    <div class=\"item-info\">";
            cartItem += "        <h4>" + d.details.identifier + "<\/h4>";
            cartItem += "        <font class=\"dpBlk\">";
            cartItem += "            <select onchange=\"changeQuantity(" + d.id + ",this.value);\" class=\"fL dpInblk vab\">";
            cartItem += selectOpt;

            cartItem += "            <\/select>";
            cartItem += "            <span class=\"fR dpInblk vab\">₹ " + d.price_to_consumer + "<\/span>";
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
    context.total = total;
    context.final = total;
    if (context.off) {
        context.final -= (context.final * context.off / 100)
    }
    $(".js-total-tax").html(Math.round(context.final * 13.13 / 100));
        context.final += Math.round(context.final * 13.13 / 100)
    $(".js-total").html(context.final);
}

function doLogin() {
    console.log('doLogin');
    event.preventDefault();
    var _user = {
        email: $('.js-login-email').val(),
        password: $('.js-login-password').val()
    };
    $('.popup-genric').toggle(true);
    $.ajax({
        url: config.server_url + '/api/v1/users/signin',
        data: _user,
        type: 'POST',
        dataType: "json",
        success: function (json) {
            console.log(json);
            if (json.token && json.expires) {
                var expire_in_days = parseInt(((new Date(json.expires) - Date.now()) / (1000 * 60 * 60 * 24)), 10);
                Cookies.set('user', json, {expires: expire_in_days - 1});
                $('.popup-genric').toggle(false);
                goToCheckout();
            } else {
                $('.error').toggle(true);
            }
        },
        error: function (xhr, _status, errorThrown) {
            console.log("err: ", {status: _status, err: errorThrown, xhr: xhr});
            $('.popup-genric').toggle(false);
            $('.error').toggle(true);
        }
    });
}

function doSignup() {
    console.log('dosignup');
    event.preventDefault();
    var _user = {
        email: $('.js-signup-email').val(),
        name: $('.js-signup-name').val(),
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
                goToCheckout();
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


