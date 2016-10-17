/**
 * Created by pariskshitdutt on 01/10/16.
 */
var Converter = require("csvtojson").Converter;
var converter = new Converter({});
var db = require('../db/DbSchema');

var areaTable=db.getareadef;
var restoarea={
    sec15:["Z0101Z2IOFF"],
    sec48:["Z0101Z6IOCA","Z0101Z6CEC"],
    sec56:["Z0101Z7IOSY","Z0101Z7CPP"],
    dlfphase2:["Z0101Z3ICMA","Z0101Z3OCG"],
    sector45:["Z0101Z5CCP","Z0101Z5IOUK"],
    supermart1:["Z0101Z8ICFT"]
}

//end_parsed will be emitted once parsing finished
converter.on("end_parsed", function (jsonArray) {
    // console.log(jsonArray); //here is your result jsonarray
    for(var i=0;i<jsonArray.length;i++){
        console.log(jsonArray[i]);
        var area=new areaTable({
            area: jsonArray[i].sec56,
            locality: "gurgaon",
            city: "gurgaon",
            country: "india",
            serviced_by: restoarea.sec56,
        });
        area.save(function(err,area,info){
            console.log(area);
        })

    }
});

//read from file
// for(var item in restoarea){
    require("fs").createReadStream("./data/sec56.csv").pipe(converter);
// }