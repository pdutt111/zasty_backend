/**
 * Created by pariskshitdutt on 03/09/15.
 */
var MongoClient = require('mongodb').MongoClient
    , assert = require('assert');
var fs = require('fs');
var converter = require('json-2-csv');

var wstream = fs.createWriteStream('myOutput.csv');
wstream.write("aes,arrTime,busType,DateOfJourney,depTime,DPInformationList,FromCity,FromCityId,maxLowerColumns," +
    "maxLowerRows,maxUpperColumns,maxUpperRows,MPax,mxSPrTxn,Notes,operatorId,RouteId,ToCity,ToCityId," +
    "Travels,vehicleType,amenties,travelDate,depTimeString,arrTimeString,isBPMapLinkShown,boardingPoints," +
    "total_seats,fare,seats_available,seats_booked");
var url = 'mongodb://localhost:27017/redbus';
// Use connect method to connect to the Server
MongoClient.connect(url, function(err, db) {
    var cursor =db.collection('redbus').find( {},{seats_data:1}).limit(10);
    var count=0;
    cursor.each(function(err,doc) {
        count++;
        console.log(count);
            if (doc != null && doc.seats_data != null) {
                try {
                    var output = doc.seats_data;
                    output.boardingPoints = "";
                    for (var i = 0; i < output.BPInformationList.length; i++) {
                        output.boardingPoints = output.boardingPoints + "|" + output.BPInformationList[i].BpAddress;
                    }
                    output.total_seats = output.seatlist.length
                    var available = 0;
                    var booked = 0;
                    var fare = 0;
                    for (var i = 0; i < output.seatlist.length; i++) {
                        if (output.seatlist[i].isAvailable) {
                            available++;
                        } else {
                            booked++;
                        }
                        if (fare < output.seatlist[i].Fare) {
                            fare = output.seatlist[i].Fare;
                        }

                    }
                    output.fare = fare;
                    output.seats_available = available;
                    output.seats_booked = booked;
                    delete output.seatlist;
                    delete output.BPInformationList;
                    delete output.DPInformationList;

                } catch (e) {
                    console.log(e);
                }
                for(var key in output){
                    if(typeof output[key]=="string")
                    output[key]=output[key].replace(",",";");
                }
                converter.json2csv(output, function (err, csv) {
                    console.log(csv.split("\n")[1]);
                    wstream.write(csv.split("\n")[1]);
                });
                //if(!cursor.hasNext()._result){
                //    db.close();
                //}
            }

    });
});