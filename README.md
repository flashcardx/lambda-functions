# lamda-functions

# motivation

In this repository we upload AWS Lambda functions that the platform www.flashcardx.co uses/needs

# functions in the repo:
1. texttospeech-middleman: At FlashcarX we use this Lambda function to generate the text to speech audio you get when pressing on the speaker icon in your flashcard: this function is triggered by an origin request event when AWS cloudfront does not have the audio clip cached, the function will make sure the audio exists on S3 before cloudfront tries to fetch it, if the audio does not yet exist, we generate it by calling AWS Polly.

2. Image-compressor: This was an experiment where we wanted a function to compress images when saved to an S3 bucket, this is not running on Production right now, and may have some bugs

# deployment
1. create a .env file in the folder of the function with all the necessary AWS keys. For security we don't commit this file to the repo
2. `npm install`
3. `gulp deploy`
