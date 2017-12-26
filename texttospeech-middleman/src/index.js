console.log("starting...");
require('dotenv').config();
const env = process.env.NODE_ENV || "development";
const BUCKET_NAME = process.env.AWS_BUCKET_NAME;
const langCodes = require("./lang.json");
var async = require('async');
var AWS = require('aws-sdk');
AWS.config = new AWS.Config();
AWS.config.accessKeyId = process.env.AWS_ACCESS_KEY;
AWS.config.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
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
  console.log("request: ", JSON.stringify(request));
  const lang = request.querystring.lang,
        textDecoded = request.querystring.q;
  const textCoded = encodeURIComponent(textDecoded);
  console.log("lang: ", lang);
  console.log("text coded: ", textCoded);
  console.log("text decoded: ", textDecoded);
  const s3Key = generateS3Key(lang, textCoded);
  request.uri = "/"+s3Key;
  console.log("bucket: ", BUCKET_NAME);
  console.log("s3key: ", s3Key);
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
  console.error("chooseLanguageActor got lang code invalid: ", lang);
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