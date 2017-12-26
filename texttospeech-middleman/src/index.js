console.log("starting...");
require('dotenv').config();
const env = process.env.NODE_ENV || "development";
const BUCKET_NAME = process.env.AWS_BUCKET_NAME;
const langCodes = require("./lang.json");
const querystring = require("querystring");
var async = require('async');
var AWS = require('aws-sdk');
AWS.config = new AWS.Config();
AWS.config.accessKeyId = process.env.S3_AWS_ACCESS_KEY;
AWS.config.secretAccessKey = process.env.S3_AWS_SECRET_ACCESS_KEY;
AWS.config.region = process.env.AWS_S3_REGION;
if(env==="production"){
    AWS.config.update({
        useAccelerateEndpoint: true
    });
}
console.log("AWS CONFIG:", JSON.stringify(AWS.config));
console.log("env: ", env);
// get reference to S3 client
var s3 = new AWS.S3();
const polly = new AWS.Polly();
exports.handler = function (event, context, callback) {
  const request = event.Records[0].cf.request;
  const response = event.Records[0].cf.response;
  const query = querystring.parse(request.querystring); 
  const lang = query.lang,
        textDecoded = query.q;
  const textCoded = encodeURIComponent(textDecoded);
  const s3Key = generateS3Key(lang, textDecoded);
  request.uri = "/"+ encodeURIComponent(s3Key);
  async.waterfall([
      function(next){
        console.log('fetching object');
        s3.headObject({
        Bucket: BUCKET_NAME,
        Key: s3Key
        }, next);
      },
      function(response, next){
        console.log("response: ", response);
        return callback(null, request);
      }
    ], err=>{
      if(err.statusCode != "404"){
        console.error("error: ", err);
        return callback(err);
      }
      console.log("object does not exist, creating it...");
      textToSpeech(lang, textDecoded)
      .then(data=>{
        var params = {Bucket: BUCKET_NAME,
            Key: s3Key,
            Body: data.buffer,
            ContentType: data.contentType,
            CacheControl: 'public, max-age=5184000'
          };
        s3.upload(params, err=>{
          if(err)
            return Promise.reject(err);
          console.log("returning new request: ", request);
          callback(null, request);
        });
      })
      .catch(err=>{
        console.error("error when saving clip to s3: ", err);
        callback(err);
      })
  });
}

function generateS3Key(lang, q){
  return "audio/TTS-"+lang+"-"+q;
}

function chooseLanguageActor(lang){
  for(var i=0; i<langCodes.length; i++)
      if(langCodes[i].code === lang)
          return langCodes[i].voice;
  return langCodes[0].voice;
}

function textToSpeech(lang, text){
  return new Promise((resolve, reject)=>{
      const ssml = "<speak><prosody volume='x-loud' rate='slow'><lang xml:lang='"+lang+"'>"+text+"</lang></prosody></speak>"
      var voiceId = chooseLanguageActor(lang);
      let params = {
          OutputFormat: "ogg_vorbis",
          Text: ssml,
          VoiceId: voiceId,
          TextType: "ssml"
      }
      polly.synthesizeSpeech(params, (err, data) => {
          if (err)
              return reject("Failed to process text to speech: " + err.code);
          if(data){
              return resolve({contentType: data.ContentType, buffer: data.AudioStream});
          }
      });
  })
}