'use strict';

require('dotenv').config();

var name = "texttospeech-middleman-"+process.env.NODE_ENV || "pi";

module.exports = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID ? process.env.AWS_ACCESS_KEY_ID : '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ? process.env.AWS_SECRET_ACCESS_KEY : '',
  profile: process.env.AWS_PROFILE ? process.env.AWS_PROFILE : '',
  region: process.env.AWS_LAMBDA_REGION ? process.env.AWS_LAMBDA_REGION : '',
  handler: 'index.handler',
  description: 'text to speech middleman',
  role: process.env.IAM_ROLE,
  functionName: name,
  timeout: 20,
  memorySize: 128,
  runtime: 'nodejs6.10'
};
