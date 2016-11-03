/**
 * Created by pariskshitdutt on 09/06/15.
 */
var mongoose = require('mongoose');
//var mockgoose=require('mockgoose');
var config = require('config');
var events = require('../events');
var log = require('tracer').colorConsole(config.get('log'));
var ObjectId = require('mongoose').Schema.Types.ObjectId;
var validate = require('mongoose-validator');
var autoIncrement = require('mongoose-auto-increment');

var nameValidator = [
    validate({
        validator: 'isLength',
        arguments: [3, 50],
        message: 'Name should be between 3 and 50 characters'
    })
];
var emailValidator = [
    validate({
        validator: 'isEmail',
        message: "not a valid email"
    })
];
var phoneValidator = [
    validate({
        validator: 'isLength',
        arguments: [10, 10],
        message: 'phonenumber should be 10 digits'
    })
];

mongoose.Promise = global.Promise;
mongoose.connect(config.get('mongo.location'));
var db = mongoose.connection;
autoIncrement.initialize(db);

var Schema = mongoose.Schema;
mongoose.set('debug', config.get('mongo.debug'));
/**
 * user schema stores the user data the password is hashed
 * @type {Schema}
 */
var userSchema = new Schema({
    email: {type: String, validate: emailValidator, unique: true, dropDups: true},
    phonenumber: {type: String, validate: phoneValidator},
    password: {type: String},
    token_validity_code:String,
    name: {type: String},
    device: {service: String, reg_id: String, active: {type: Boolean, default: true}},
    address:[{
        _id:false,
        address: String,
        area: String,
        locality: String,
        city: String,
    }],
    fb_token:String,
    fb_user_id:String,
    pin:String,
    is_res_owner: {type: Boolean, default: false},
    restaurant_name: String,
    is_admin: {type: Boolean, default: false},
    is_verified: {type: Boolean, default: false},
    created_time: {type: Date, default: Date.now},
    modified_time: {type: Date, default: Date.now}
});

var pinschema = new Schema({
    phonenumber: {type: String},
    pin: Number,
    used: {type: Boolean, default: false}
});

var paymentschema = new Schema({
    params: Schema.Types.Mixed,
    body: Schema.Types.Mixed,
    order_id: {type: String, required: true},
    status: {type: String, required: true}
});

var orderSchema = new Schema({
    address: String,
    payment_mode: String,
    payment_id: String,
    payment_mihpayid: String,
    payment_status: String,
    area: String,
    locality: String,
    city: String,
    full_order:{type:Boolean,default:true},
    location: {type: [Number], index: "2dsphere"},
    dishes_ordered: [{
        identifier: String,
        price_recieved: Number,
        price_to_pay: Number,
        qty: {type: Number, default: 1},
        _id: false
    }],
    coupon:{
        name:String,
        off:Number
    },
    total_price_recieved: Number,
    total_price_to_pay: Number,
    restaurant_assigned: String,
    status: String,
    paid_status_to_restaurant: {type: Boolean, default: false},
    issue_raised: {type: Boolean, default: false},
    issue_reason: String,
    log: [{status: String, _id: false, date: {type: Date, default: Date.now}}],
    customer_number: String,
    customer_name: String,
    customer_email: String,
    delivery_enabled:{type:Boolean,default:true},
    delivery: {
        details: Schema.Types.Mixed,
        retry_count: {type: Number, default: 0},
        log: [{status: String, _id: false, date: {type: Date, default: Date.now}}],
        status: {type: String, default: 'not_ready'},
        enabled:{type:Boolean,default:true}
    },
    delivery_person_alloted: String,
    delivery_person_contact: String,
    delivery_service: String,
    delivery_cost: Number,
    source: {
        name: String,
        id: String
    },
    combined_id:String,
    delivery_price_recieved: Number,
    delivery_price_to_pay: Number,
    rejection_reason: String,
    error: [{status: String, _id: false, date: {type: Date, default: Date.now}}],
    is_verified: {type: Boolean, default: false},
    is_deleted: {type: Boolean, default: false},
    created_time: {type: Date, default: Date.now},
    modified_time: {type: Date, default: Date.now}
});
orderSchema.plugin(autoIncrement.plugin, 'Order');

var dishSchema=new Schema({
        type:String,
        categories:[String],
        nomnom_name:String,
        identifier:String,
        image:String,
        sku:String,
        description:String,
        details:String,
        prep:String,
        ingredients:String,
        nutrition:String
});
var restaurantSchema = new Schema({
    name: {type: String, unique: true, dropDups: true},
    location: {type: [Number], index: "2dsphere"},
    shadowfax_store_code: {type: String, default: 'unset'},
    quickli_store_id: {type: String, default: 'unset'},
    dishes: [{
        identifier: String,
        price: Number,
        price_to_consumer: Number,
        availability: {type: Boolean, default: true},
        // details:{
        //     type:String,
        //     categories:[String],
        //     image:String,
        //     sku:String,
        //     description:String,
        //     details:String,
        //     prep:String,
        //     ingridients:String,
        //     nutrition:String
        // }
        // details:Schema.Types.Mixed
        details:{type:ObjectId,ref:'dishes'}
    }],
    delivery_enabled:{type:Boolean,default:true},
    open_status: {type: Boolean, default: false},
    contact_number: Number,
    contact_name: String,
    contact_email:String,
    servicing_restaurant:[String],
    address:String,
    zasty_zone:String,
    bank_name:String,
    bank_account_name:String,
    bank_account_number:String,
    ifsc:String,
    nomnom_username: String,
    nomnom_password: String,
    owner_id: {type: ObjectId, ref: 'restaurants'},
    dish_editable: {type: Boolean, default: false},
    dish_add_allowed: {type: Boolean, default: false},
    is_deleted: {type: Boolean, default: false},
    is_verified: {type: Boolean, default: false},
    created_time: {type: Date, default: Date.now},
    modified_time: {type: Date, default: Date.now}
});
var areaSchema = new Schema({
    area: String,
    locality: String,
    city: String,
    country: String,
    serviced_by: [String],
    created_time: {type: Date, default: Date.now},
    modified_time: {type: Date, default: Date.now}
});
var couponSchema= new Schema({
    name:String,
    off:Number,
    is_active:{type:Boolean,default:true},
    created_time: {type: Date, default: Date.now},
    modified_time: {type: Date, default: Date.now}
});
var alertSchema = new Schema({
    priority: Number,
    in_area: String,
    resolved: {type: Boolean, default: false},
    assigned_to: String,
    created_time: {type: Date, default: Date.now},
    modified_time: {type: Date, default: Date.now}
});
db.on('error', function (err) {
    log.info(err);
});
/**
 * once the connection is opened then the definitions of tables are exported and an event is raised
 * which is recieved in other files which read the definitions only when the event is received
 */
var userdef = db.model('users', userSchema);
var pindef = db.model('pins', pinschema);
var paymentdef = db.model('payments', paymentschema);
var orderdef = db.model('orders', orderSchema);
var restaurantdef = db.model('restaurants', restaurantSchema);
var areadef = db.model('areas', areaSchema);
var coupondef = db.model('coupons', couponSchema);
var dishdef = db.model('dishes', dishSchema);
var alertdef = db.model('alerts', alertSchema);

exports.getpindef = pindef;
exports.getpaymentdef = paymentdef;
exports.getuserdef = userdef;
exports.getorderdef = orderdef;
exports.getcoupondef= coupondef;
exports.getdishdef= dishdef;
exports.getrestaurantdef = restaurantdef;
exports.getareadef = areadef;
exports.getalertdef = alertdef;
exports.getDishSchema = dishSchema;

events.emitter.emit("db_data");

