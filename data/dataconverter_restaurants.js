/**
 * Created by pariskshitdutt on 01/10/16.
 */
var Converter = require("csvtojson").Converter;
var converter = new Converter({});
var db = require('../db/DbSchema');

var restaurantTable=db.getrestaurantdef;

//end_parsed will be emitted once parsing finished
converter.on("end_parsed", function (jsonArray) {
    // console.log(jsonArray); //here is your result jsonarray
    for(var i=0;i<jsonArray.length;i++){
        // console.log(jsonArray[i]);
        var restaurant=new restaurantTable({
            name: jsonArray[i]['id'],
            location: [jsonArray[i]['Coordinates'].split(", ")[1],jsonArray[i]['Coordinates'].split(", ")[0]],
            shadowfax_store_code: jsonArray[i]['id'],
            quickli_store_id:jsonArray[i]['id'],
            dishes: [],
            contact_number: jsonArray[i]['Owner_number'],
            contact_name: jsonArray[i]['Owner_name'],
            address:jsonArray[i]['address'],
            zasty_zone:jsonArray[i]['zasty_zone'],
            bank_name:jsonArray[i]['bank_name'],
            bank_account_name:jsonArray[i]['acc_name'],
            bank_account_number:jsonArray[i]['acc_number'],
        })
        restaurant.save(function(err,restaurant,info){
            console.log(restaurant);
        })
    }
});

//read from file
require("fs").createReadStream("./data/restaurant_profile.csv").pipe(converter);