/**
 * Created by pariskshitdutt on 10/10/16.
 */
var ejs=require('ejs');
var data={order:{
    customer_name:"pariskshit",
    track_link:"http://localhost:3000/track.html?orderid=18178",
    combined_id:18178,
    dishes:[
        {identifier:"test",qty:1,price:200},
        {identifier:"test",qty:1,price:200}
    ],
    address:"test",
    area:"blah",
    city:"blah"
}}
ejs.renderFile('./public/user/email_template.html', data, function(err, str){
    // str => Rendered HTML string

    console.log(err,str);
});