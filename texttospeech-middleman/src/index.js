const BUCKET_NAME = "img-pi";
var async = require('async');
var path = require('path');
var AWS = require('aws-sdk');
var Q = require('q');
var gm = require('gm').subClass({
  imageMagick: true
});
require('dotenv').config();

// get reference to S3 client
var s3 = new AWS.S3();
exports.handler = function (event, context, callback) {
  const request = event.Records[0].cf.request;
  console.log("request: ", JSON.stringify(request));
  const {lang, q} = querystring.parse(request.querystring);
  console.log("lang: ", lang);
  console.log("q: ", q);
  const bucket = BUCKET_NAME;
  console.log("bucket: ", bucket);
}