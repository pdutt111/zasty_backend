/**
 * Created by pariskshitdutt on 01/10/16.
 */
/**
 * Created by pariskshitdutt on 01/10/16.
 */
/**
 * Created by pariskshitdutt on 01/10/16.
 */
var Converter = require("csvtojson").Converter;
var converter = new Converter({});
var db = require('../db/DbSchema');
var fs=require("fs");
var jsonfile = require('jsonfile')

var restaurantTable=db.getrestaurantdef;

//end_parsed will be emitted once parsing finished
var file = './data/menu.json'
var converter = new Converter({});
var db = require('../db/DbSchema');

var restaurantTable=db.getrestaurantdef;

//end_parsed will be emitted once parsing finished
converter.on("end_parsed", function (jsonArray) {
    // console.log(jsonArray); //here is your result jsonarray
    jsonfile.readFile(file, function(err, obj) {
        var restaurant_dishes={};
        for(var i=0;i<jsonArray.length;i++){
            // console.log(jsonArray[i]);
            var dish;
            for(var item in jsonArray[i]){
                if(item=="SKU"){
                    dish=obj[jsonArray[i].SKU];
                    if(!dish){
                       console.log("not found",jsonArray[i].SKU.trim());
                    }
                }else{
                    if(!restaurant_dishes[item]){
                        restaurant_dishes[item]=[];
                    }
                    if(jsonArray[i][item]!=""&&jsonArray[i][item]!="-"){
                        console.log(item,dish,jsonArray[i][item]);
                        dish.price=jsonArray[i][item];
                        restaurant_dishes[item].push(JSON.parse(JSON.stringify(dish)));
                    }
                }


            }
        }
        console.log(restaurant_dishes["Z0101Z8ICFT"]);
        for(var item in restaurant_dishes){
            restaurantTable.update({name:item},{$set:{dishes:restaurant_dishes[item]}},function(err,info){
                console.log(err,info);
            })
        }
    })

});

//read from file
require("fs").createReadStream("./data/kitchen_data_prices.csv").pipe(converter);