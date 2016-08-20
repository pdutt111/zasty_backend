/**
 * Created by pariskshitdutt on 24/07/16.
 */
var config= require('config');
var events=require('events');
var log = require('tracer').colorConsole(config.get('log'));
var db=require('../db/DbSchema');
var nmea=require("node-nmea");
var locationTable=db.getlocationdef;
var healthTable=db.gethealthdef;

data='ABCDEFGH**GPRMC,000259.800,V,,,,,0.00,0.00,060180,,,N*44**23.8V**41057D**410D00**410C0E18**410F55**7F0112**7F0112**7F0112**7F0112**7F0112**7F0112';

var data_object_health={};
var data_object_location={};
var data_array=data.toString().split("AT+QISEND=200")[0].split("**");
log.info(data.toString().split("AT+QISEND=200")[0]);
data_object_health.device_id=data_array[0];
data_object_location.device_id=data_array[0];
if(data_array[1].indexOf("$")>-1){
    var gprmc=nmea.parse(data_array[1]);
}else{
    var gprmc=nmea.parse("$"+data_array[1]);
}

        if(gprmc.valid) {
            log.info(gprmc);
            data_object_location.location = gprmc.loc.geojson.coordinates;
            if (row && row.location) {
                data_object_location.distance = haversineDistance(row.location, data_object_location.location, false);
            } else {
                data_object_location.distance = 0;
            }
        }
        data_object_health.voltage = data_array[2];
        log.info(data_array[3].slice(0, 2));
        if (data_array[3].slice(0, 2) == "41") {
            log.info("coolant_temp",data_array[3].slice(4, 6))
            data_object_health.coolant_temp = (Number(parseInt(data_array[3].slice(4, 6), 16)) - 40);//410582
        }
        if (data_array[4].slice(0, 2) == "41") {
            log.info(data_array[4].slice(4, 5));
            data_object_health.vehicle_speed_sensor = Number(parseInt(data_array[4].slice(4, 6), 16));//410D01
            data_object_location.speed = Number(data_array[4].slice(4, 5));//410D01
        }
        if (data_array[5].slice(0, 2) == "41"){
            data_object_health.engine_rpm = ((256 * Number(parseInt(data_array[5].slice(4, 6), 16)) + Number(parseInt(data_array[5].slice(6, 8), 16)) / 4));//410C13DC
        }
        if (data_array[6].slice(0, 2) == "41")
            data_object_health.intake_air_temp = (Number(parseInt(data_array[6].slice(4, 6), 16)) - 40);//410F62
        if (data_array[7].slice(0, 2) == "41")
            data_object_health.throttle_position = (Number(parseInt(data_array[7].slice(4, 6), 16)) * 100 / 255);//41111A
        if (data_array[8].slice(0, 2) == "41")
            data_object_health.run_time = (256 * Number(parseInt(data_array[8].slice(4, 6), 16)) + Number(parseInt(data_array[8].slice(6, 8), 16)));//7F0112
        if (data_array[9].slice(0, 2) == "41")
            data_object_health.fuel_level = (Number(parseInt(data_array[9].slice(4, 6), 16)) * 100 / 255);
        if (data_array[10].slice(0, 2) == "41")
            data_object_health.ambient_air_temp = (Number(parseInt(data_array[10].slice(4, 6), 16)) - 40);
        if (data_array[11].slice(0, 2) == "41")
            data_object_health.engine_oil_temp = (Number(parseInt(data_array[11].slice(4, 6), 16)) - 40);
        if (data_array[12].slice(0, 2) == "41")
            data_object_health.engine_fuel_rate = ((256 * Number(parseInt(data_array[5].slice(4, 6), 16)) + Number(parseInt(data_array[5].slice(6, 8), 16))) / 120);

        log.info(data_object_health,data_object_location);
        var location = new locationTable(data_object_location);
        location.save(function (err, row, info) {
        });
        var health = new healthTable(data_object_health);
        health.save(function (err, row, info) {
        });