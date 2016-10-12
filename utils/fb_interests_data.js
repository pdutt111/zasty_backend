/**
 * Created by pariskshitdutt on 12/10/16.
 */
var request=require('request');
var json2csv = require('json2csv');
var fs=require('fs')
var urlencode = require('urlencode');
var async=require('async')
var Converter = require("csvtojson").Converter;
var converter = new Converter({});
var access_token="EAANyyyuml0YBAHhJWyPcznwBZCZCgAQXdHFg0r8bhmaAi0bxauTNZCvdAHetDMN2q1LWgpQNVFcxGD7INFtq3gHcmXzPsZAYwxqNSqkCephRBFNbt4mbowPSb1DZAWNVuGZC4CdU00H16ycwkLxxPj1PTtEY9reXui1UPkAiGk7gZDZD"
var url="https://graph.facebook.com/v2.8/act_214377457/reachestimate" +
"?access_token="+access_token+"&" +
"batch=#batch"
var interest_data;
var fieldsinterests = ['id', 'name','audience_size','females','females_18_24','females_24_30','females_30_40','females_40_50','females_50_60'];
var wstream = fs.createWriteStream('interests_full.csv');
wstream.write('"id","name","audience_size,"females","females_18_24","females_24_30","females_30_40","females_40_50","females_50_60"\n');
// var q = async.queue(function(task, callback) {
//     // console.log(task.interest);
//     var line= {
//         id:task.interest.id,
//         name:task.interest.name,
//         audience_size:task.interest.audience_size
//     }
//     async.series([
//             function(callback) {
//                 var targeting_1={"genders":[2]
//                     ,"interests":[{id:task.interest.id}]
//                     ,"geo_locations": {"countries":["US","GB","DE","FR"]}
//                     ,"age_min": 18
//                     ,"age_max": 60};
//                 var targeting_2={"genders":[2]
//                     ,"interests":[{id:task.interest.id}]
//                     ,"geo_locations": {"countries":["US","GB","DE","FR"]}
//                     ,"age_min": 18
//                     ,"age_max": 24};
//                 var targeting_3={"genders":[2]
//                     ,"interests":[{id:task.interest.id}]
//                     ,"geo_locations": {"countries":["US","GB","DE","FR"]}
//                     ,"age_min": 24
//                     ,"age_max": 30};
//                 var targeting_4={"genders":[2]
//                     ,"interests":[{id:task.interest.id}]
//                     ,"geo_locations": {"countries":["US","GB","DE","FR"]}
//                     ,"age_min": 30
//                     ,"age_max": 40};
//                 var targeting_5={"genders":[2]
//                     ,"interests":[{id:task.interest.id}]
//                     ,"geo_locations": {"countries":["US","GB","DE","FR"]}
//                     ,"age_min": 40
//                     ,"age_max": 50};
//                 var targeting_6={"genders":[2]
//                     ,"interests":[{id:task.interest.id}]
//                     ,"geo_locations": {"countries":["US","GB","DE","FR"]}
//                     ,"age_min": 50
//                     ,"age_max": 60};
//                 var batch=[
//                     {
//                         "method": "GET",
//                         "relative_url": "v2.8/act_214377457/reachestimate?targeting_spec="+JSON.stringify(targeting_1)+"&optimize_for=OFFSITE_CONVERSIONS&currency=USD"
//                     },
//                     {
//                         "method": "GET",
//                         "relative_url": "v2.8/act_214377457/reachestimate?targeting_spec="+JSON.stringify(targeting_2)+"&optimize_for=OFFSITE_CONVERSIONS&currency=USD"
//                     },
//                     {
//                         "method": "GET",
//                         "relative_url": "v2.8/act_214377457/reachestimate?targeting_spec="+JSON.stringify(targeting_3)+"&optimize_for=OFFSITE_CONVERSIONS&currency=USD"
//                     },
//                     {
//                         "method": "GET",
//                         "relative_url": "v2.8/act_214377457/reachestimate?targeting_spec="+JSON.stringify(targeting_4)+"&optimize_for=OFFSITE_CONVERSIONS&currency=USD"
//                     },
//                     {
//                         "method": "GET",
//                         "relative_url": "v2.8/act_214377457/reachestimate?targeting_spec="+JSON.stringify(targeting_5)+"&optimize_for=OFFSITE_CONVERSIONS&currency=USD"
//                     },
//                     {
//                         "method": "GET",
//                         "relative_url": "v2.8/act_214377457/reachestimate?targeting_spec="+JSON.stringify(targeting_6)+"&optimize_for=OFFSITE_CONVERSIONS&currency=USD"
//                     }
//
//                 ]
//                 request({uri:"https://graph.facebook.com/?access_token="+access_token+"&batch="+urlencode(JSON.stringify(batch)),method:"POST"},function(err,response,body){
//                     if(!err){
//                         var body=JSON.parse(body);
//                         console.log(body);
//                         var data=JSON.parse(body[0].body);
//                         if(!data.error){
//                             line.females=JSON.parse(body[0].body).data.users
//                             line.females_18_24=JSON.parse(body[1].body).data.users
//                             line.females_24_30=JSON.parse(body[2].body).data.users
//                             line.females_30_40=JSON.parse(body[3].body).data.users
//                             line.females_40_50=JSON.parse(body[4].body).data.users
//                             line.females_50_60=JSON.parse(body[5].body).data.users
//                             console.log(line);
//                         }else{
//                         }
//                         callback("error",null)
//                     }
//                 })
//             },
//         ],
//         function(err, results) {
//                 if(!err){
//                     var result = json2csv({data: line, fields: fieldsinterests});
//                     console.log(result);
//                     wstream.write(result.split("\n")[1]+"\n");
//                 }
//                     callback(true);
//
//             // the results array will equal ['one','two'] even though
//             // the second function had a shorter timeout.
//         });
// },1);
converter.fromFile("./interests.csv",function(err,result){
    // recursion(0);
    // function recursion(i){
    //     q.push({interest:result[i]}, function(err) {
    //         if(err){
    //             i--;
    //         }
    //         console.log(i);
    //         recursion(++i);
    //     });
    // }
    var targeting=[{"genders":[2]
        ,"interests":[{id:""}]
        ,"geo_locations": {"countries":["US"]}
        ,"age_min": 18
        ,"age_max": 60}
    ,{"genders":[2]
        ,"interests":[{id:""}]
        ,"geo_locations": {"countries":["US"]}
        ,"age_min": 18
        ,"age_max": 24}
    ,{"genders":[2]
        ,"interests":[{id:""}]
        ,"geo_locations": {"countries":["US"]}
        ,"age_min": 24
        ,"age_max": 30}
    ,{"genders":[2]
        ,"interests":[{id:""}]
        ,"geo_locations": {"countries":["US"]}
        ,"age_min": 30
        ,"age_max": 40}
    ,{"genders":[2]
        ,"interests":[{id:""}]
        ,"geo_locations": {"countries":["US"]}
        ,"age_min": 40
        ,"age_max": 50}
    ,{"genders":[2]
        ,"interests":[{id:""}]
        ,"geo_locations": {"countries":["US"]}
        ,"age_min": 50
        ,"age_max": 60}]
    var batch=[];
    var requests=[];
    for(var i=0;i<result.length;i++){
        // q.push({interest:interest}, function(err) {
        //     console.log('finished processing foo');
        // });
        for(var j=0;j<targeting.length;j++){
            targeting[j].interests[0].id=result[i].id
            targeting[j].interests[0].name=result[i].name
            batch.push({
                "method": "GET",
                "relative_url": "v2.8/act_214377457/reachestimate?targeting_spec="+JSON.stringify(targeting[j])+"&optimize_for=OFFSITE_CONVERSIONS&currency=USD"
            });

        }
        // request(url.replace("#targeting",JSON.stringify(targeting)),function())
    }
    var i=0;
    setInterval(function(){
        request({uri:"https://graph.facebook.com/?access_token="+access_token+"&batch="+urlencode(JSON.stringify(batch.slice(48*i,i*48+48))),method:"POST"},function(err,response,body){
            if(!err){
                var body=JSON.parse(body);
                for(var j=0;j<body.length;j++){
                    var data=JSON.parse(body[j].body);
                    var targeting=JSON.parse(this.small_batch[j].relative_url.split("targeting_spec=")[1].split("&")[0]);
                        var line= {
                            id: targeting.interests.id,
                            name: targeting.interests.name,
                            females:data.data.users
                            // audience_size: task.interest.audience_size
                        }
                }
                // if(!data.error){
                //     line.females=JSON.parse(body[0].body).data.users
                //     line.females_18_24=JSON.parse(body[1].body).data.users
                //     line.females_24_30=JSON.parse(body[2].body).data.users
                //     line.females_30_40=JSON.parse(body[3].body).data.users
                //     line.females_40_50=JSON.parse(body[4].body).data.users
                //     line.females_50_60=JSON.parse(body[5].body).data.users
                //     console.log(line);
                // }else{
                // }
                // callback("error",null)
            }
        }.bind({small_batch:batch.slice(48*i,i*48+48)}));
        i++;
    },5000)
});