/**
 * Created by pariskshitdutt on 24/07/15.
 */
var crypto = require('crypto');
var config= require('config');

/**
 * used to encrypt jwt payload
 * @param text
 * @returns {*}
 */
function encryptObject(text){
    var input=JSON.stringify(text);
    var cipher = crypto.createCipher(config.get('crypto.algorithm'),config.get('crypto.password'))
    var crypted = cipher.update(input,'utf8','hex')
    crypted += cipher.final('hex');
    return crypted;
}
/**
 * used to decrypt jwt payload
 * @param text
 * @returns {*}
 */
function decryptObject(text){
    var decipher = crypto.createDecipher(config.crypto.algorithm,config.crypto.password)
    var dec = decipher.update(text,'hex','utf8')
    dec += decipher.final('utf8');
    var output;
    try{
        output=JSON.parse(dec);
    }catch(E){}
    return output;
}
exports.encryptObject=encryptObject;
exports.decryptObject=decryptObject;