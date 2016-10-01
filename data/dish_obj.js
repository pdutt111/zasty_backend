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
var restaurantTable=db.getrestaurantdef;

//end_parsed will be emitted once parsing finished
converter.on("end_parsed", function (jsonArray) {
    console.log(jsonArray); //here is your result jsonarray
    var dishes_obj={};
    for(var i=0;i<jsonArray.length;i++){
        // console.log(jsonArray[i]);
        var dish={
        identifier: jsonArray[i].name,
            price: jsonArray[i].price,
            price_to_consumer: jsonArray[i].price,
        details: {
            type: jsonArray[i].type,
            categories: [jsonArray[i].category],
            image: jsonArray[i].sku+".png",
            sku: jsonArray[i].sku,
            cuisine:jsonArray[i].cuisine,
            description: jsonArray[i].desc,
            details: jsonArray[i].desc,
            prep: jsonArray[i].desc,
            ingridients: jsonArray[i].desc,
            nutrition: jsonArray[i].desc
        }
        }
        console.log(dish);
        dishes_obj[dish.details.sku]=dish;
    }
    fs.writeFile("./data/menu.json", JSON.stringify(dishes_obj), function(err) {
        if(err) {
            return console.log(err);
        }

        console.log("The file was saved!");
    });
});

//read from file
fs.createReadStream("./data/menu.csv").pipe(converter);