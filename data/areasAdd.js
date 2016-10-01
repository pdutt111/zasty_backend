/**
 * Created by pariskshitdutt on 01/10/16.
 */
var Converter = require("csvtojson").Converter;
var converter = new Converter({});
var db = require('../db/DbSchema');

var areaTable=db.getareadef;
var restoarea={
    sector15:["Z0101Z2IOFF"],
    sector48:["Z0101Z6IOCA","Z0101Z6CEC"],
    sector56:["Z0101Z7IOSY","Z0101Z7CPP"]
}

//end_parsed will be emitted once parsing finished
converter.on("end_parsed", function (jsonArray) {
    // console.log(jsonArray); //here is your result jsonarray
    for(var i=0;i<jsonArray.length;i++){
        // console.log(jsonArray[i]);
        var area=new areaTable({
            area: jsonArray[i].sector56,
            locality: "gurgaon",
            city: "gurgaon",
            country: "india",
            serviced_by: restoarea.sector56,
        });
        area.save(function(err,area,info){
            console.log(area);
        })

    }
});

//read from file
require("fs").createReadStream("./data/sec56.csv").pipe(converter);