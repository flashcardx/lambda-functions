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
exports.handler = function (event, context) {
  var bucket = BUCKET_NAME;
  //bucket where processed images will be saved
  var destinationBucket = bucket;
  // Object key may have spaces or unicode non-ASCII characters.
  var srcKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));
  var srcPath = path.dirname(srcKey) + '/';
  if (srcPath === './') {
    srcPath = '';
  }

  var _600px = {
    width: 600,
    destinationPath: "medium"
  };
  var _sizesArray = [_600px];

  var fileName = path.basename(srcKey);

  console.log('optimizing image ' + srcKey);
  async.waterfall([

    function download(next) {
      console.log('downloading image');
      s3.getObject({
        Bucket: bucket,
        Key: srcKey
      }, next);
    },

    function convert(response, next) {
      console.log("response: ", response);
      /*
      const contentType = event.Records[0].s3;
      if(contentType == 'image/gif')
        return console.log("skipping image because is a gif...");
      */
      console.log('converting image');
      gm(response.Body)
        .antialias(true)
        .toBuffer('jpeg', function (err, buffer) {
          if (err) {
            next(err);  // call the main callback in case of error
          }
          else {
            next(null, buffer);
          }
        });
    },

    function process(response, next) {

      var promises = [];

      function processImage(response, index) {
        var deferred = Q.defer();
        console.log('processing image');
        //get image size
        gm(response).size(function (err, imgSize) {
          var width = _sizesArray[index].width;

          //var position = fileName.lastIndexOf('.');
          //var key = srcPath + _sizesArray[index].destinationPath + "/"+ fileName.slice(0, position) + ".jpg";
          var key = srcPath + fileName;
          if(imgSize.width > width) {
            console.log('image resizing ' + imgSize.width + ' --> ' + width);
            this.resize(width).toBuffer('jpeg', function (err, buffer) {
              if(err) {
                deferred.reject(err);
                return;
              }
              console.log('uploading image ' + key + ' to bucket ' + destinationBucket);
              uploadImage(destinationBucket, key, buffer, ()=>{
                  console.log('image uploaded');
                  deferred.resolve();
              });
            });
          }
          else {
            console.log('skipping image resizing');
            return deferred.resolve();
          }
        });
        return deferred.promise;
      }

      for(var i = 0; i < _sizesArray.length; i++) (function(i) {
          promises.push(processImage(response, i));
      })(i);

      return Q.all(promises).then(
        function() {
          console.log('all resizing completed');
          next(null);
        }, function(err) {
          console.log('some resizing went wrong ' + err);
          next(err);
        });
    }

  ],
    function waterfallCallback (err) {
      if (err) {
        console.error('error during image optimization: ' + err);
      } else {
        console.error('image optimization successful');
      }
      context.done();
    });
};


function uploadImage(bucketName, key, buffer, callback){
   s3.putObject({
                Bucket: bucketName,
                Key: key,
                Body: buffer,
                CacheControl: 'public, max-age=5184000',
              }, function () {
                  callback();
              });
}