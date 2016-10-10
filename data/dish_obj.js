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
            ingredients: jsonArray[i].Ingredients.replace(new RegExp('\n', 'g'),"</br>"),
            nutrition: jsonArray[i].desc
        }
        }
        console.log(jsonArray[i].name);
        dishes_obj[dish.details.sku]=dish;
        // fs.access("./data/"+jsonArray[i].sku.replace(/-/g,"").replace(/HF/g,"")+".png", fs.F_OK, function(err) {
        //     if (!err) {
        //         try{
        //             fs.unlink("./data/"+this.item.sku.replace(/-/g,"").replace(/HF/g,"")+".png")
        //         }catch(e){}
        //         // Do something
        //         // console.log("found",this.item.sku.replace(/-/g,"").replace(/HF/g,"")+".png");
        //     } else {
        //         console.log("not found",this.item.sku.replace(/-/g,"").replace(/HF/g,"")+".png");
        //         // It isn't accessible
        //     }
        // }.bind({item:jsonArray[i]}));
    }
    console.log(dishes_obj);
    fs.writeFile('./data/menu.json',JSON.stringify(dishes_obj),function(err,info){console.log(err,info)});

});

//read from file
fs.createReadStream("./data/menu.csv").pipe(converter);
// db.restaurants.update({name:"Z0101Z2IOFF"},{$set:{contact_number:9999881044,contact_name:"Pawan Singh",contact_email:"lordvarunplacement@gmail.com",ifsc:"BARB0GURGA0"}})
// db.restaurants.update({name:"Z0101Z3ICMA"},{$set:{contact_number:9958255155,contact_name:"Ranjeet Singh",contact_email:"singhranjeet627@gmail.com",ifsc:"ICIC0000830"}})
// db.restaurants.update({name:"Z0101Z3OCG"},{$set:{contact_number:9015125683,contact_name:"Tara Datt Bhatt",contact_email:"chinagathering.14@gmail.com",ifsc:"CBIN0281154"}})
// db.restaurants.update({name:"Z0101Z5CCP"},{$set:{contact_number:9899929612,contact_name:"Sahil Mehta",contact_email:"sahilmehta2007@yahoo.co.in",ifsc:"HDFC0003634"}})
// db.restaurants.update({name:"Z0101Z6IOCA"},{$set:{contact_number:9818861116,contact_name:"Saurabh Singh",contact_email:"cyberadda24@gmail.com",ifsc:"HDFC0001203"}})
// db.restaurants.update({name:"Z0101Z6CEC"},{$set:{contact_number:9810946216,contact_name:"Ranjan Juneja",contact_email:"ranjanj7@gmail.com",ifsc:"ICIC0003431"}})
// db.restaurants.update({name:"Z0101Z7IOSY"},{$set:{contact_number:9650494309,contact_name:"Madhup Mayank",contact_email:"saiyo.restro@gmail.com",ifsc:"SBIN0016020"}})
// db.restaurants.update({name:"Z0101Z7CPP"},{$set:{contact_number:9999949970,contact_name:"Gaurav Sethi",contact_email:"cafepepperpot@yahoo.com",ifsc:"ICIC0000830"}})
// db.restaurants.update({name:"Z0101Z8ICFT"},{$set:{contact_number:9810920037,contact_name:"Nishant Marwah",contact_email:"nishant.marwah1990@gmail.com",ifsc:"ICIC0001144"}})
// db.restaurants.update({},{$set:{is_verified:true,open_status:true}},{multi:true})
// not found ZCNVB02.png
// not found ZCNVB03.png
// not found ZCNVPS03.png
// not found ZCNVPS04.png
// not found ZCNVGC01.png
// not found ZCNVQ01.png
// not found ZINVMC04.png
// not found ZINVMC04.png
// not found ZINVMC05.png
// not found ZINVMC05.png
// not found ZINVMC06.png
// not found ZINVMC06.png
// not found ZONVN02.png
// not found ZONVMC04.png
// not found ZINVCO01.png
// not found ZIVNVCO05.png
// not found ZONVCO05.png
// not found ZCNVCO03.png
// not found ZIB03.png
// not found ZIB04.png
// not found ZIB06.png
// not found ZIB07.png
// not found ZCS01.png
// not found ZISO1.png
// not found ZDO1.png
// not found ZDO2.png
// not found ZDO3.png
// not found ZDO4.png
// not found ZDO5.png
// not found ZDO6.png
// not found ZDO7.png
// not found ZDO8.png
// not found ZDO9.png
// not found ZDO10.png
// not found ZDO11.png
