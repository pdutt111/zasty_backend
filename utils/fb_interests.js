/**
 * Created by pariskshitdutt on 11/10/16.
 */
var request=require('request');
var json2csv = require('json2csv');
var access_token="EAACEdEose0cBAN7rZASq9CHMTQL0zZAoTDMX7CUjMucGEc0ZCGrNmwZCt1h7eqPeCNgbZAnvUZAIGpx4z3fTNymZAmOnxgoJAuL46w66HnAosfjS3SgLITTQ4QzaPCkUkfgZCn8woK6ZBRCfZCphufaJkV2xijHFFSa73BnOWaRFyZBkQZDZD"
// var interest_list=['Shopping and fashion','Eyebrow'];
var fields = ['targeting', 'audience', '18-24','24-30','30-40','40-50','50-60'];
var fieldsinterests = ['id', 'name','audience_size'];
var async=require('async');
var fs=require('fs');
var done={};
var urls=[
    "https://graph.facebook.com/v2.8/search?type" +
    "=adinterestsuggestion&interest_list=['Shopping and fashion']&access_token="+access_token,
    "https://graph.facebook.com/v2.8/search?type" +
    "=adinterestsuggestion&interest_list=['Eyebrow']&access_token="+access_token,
    "https://graph.facebook.com/v2.8/search?type" +
    "=adinterestsuggestion&interest_list=['Fashion accessories']&access_token="+access_token,
    "https://graph.facebook.com/v2.8/search?type" +
    "=adinterestsuggestion&interest_list=['Fashion design']&access_token="+access_token,
    "https://graph.facebook.com/v2.8/search?type" +
    "=adinterestsuggestion&interest_list=['Fashion (magazine)']&access_token="+access_token,
]
// try {
//     var result = json2csv({ data: myData, fields: fields });
//     console.log(result);
// } catch (err) {
//     // Errors are thrown for bad options, or if the data is empty and no fields are provided.
//     // Be sure to provide fields if it is possible that your data array will be empty.
//     console.error(err);
// }

// }
var wstream = fs.createWriteStream('interests.csv');
wstream.write('"id","name","audience_size"\n');
var q = async.queue(function(task, callback) {
    console.log(task.url);
    if (task.url) {
    request(task.url,
        function (err, response, body) {
            if (!err) {
                try {
                    var body = JSON.parse(body);
                    if (body.data) {
                        var result = json2csv({data: body.data, fields: fieldsinterests});
                        var items = result.split('\n');
                        for (var i = 1; i < items.length; i++) {
                            if (Number(items[i].split(",")[2]) > 50000&&!done[items[i].split(",")[1].replace(/["']/g, "")]) {
                                wstream.write(items[i] + "\n");
                                done[items[i].split(",")[1].replace(/["']/g, "")]=true;
                            }
                        }
                        body.data.forEach(function (interest) {
                            if (interest.audience_size > 50000) {
                                var url = "https://graph.facebook.com/v2.8/search?type" +
                                    "=adinterestsuggestion&interest_list=['" + interest.name + "']&access_token=" + access_token
                                    urls.push(url);
                                    done[interest.name] = true;
                            }
                        });
                    }
                    if (body.next) {
                        urls.push(body.next);
                    }
                    callback();
                } catch (err) {
                    // Errors are thrown for bad options, or if the data is empty and no fields are provided.
                    // Be sure to provide fields if it is possible that your data array will be empty.
                    console.error(err);
                }
            }else{
                console.error(err);
            }
        });
}
}, 4);

// assign a callback
q.drain = function() {
    console.log('all items have been processed');
};

// add some items to the queue
function runcalls(){
    for(var i=0;i<urls.length;i++){
        urls.splice(i,1);
        q.push({url: urls[i]}, function(err) {
            console.log('finished processing foo');
        });
    }
}
setInterval(runcalls,4000);
runcalls();

