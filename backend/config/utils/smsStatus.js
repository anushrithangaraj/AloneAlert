const twilio = require('twilio');

const checkSMSStatus = async (messageSid) => {
  try {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    const message = await client.messages(messageSid).fetch();
    
    console.log('📊 Message Details:');
    console.log('SID:', message.sid);
    console.log('Status:', message.status);
    console.log('To:', message.to);
    console.log('From:', message.from);
    console.log('Body:', message.body);
    console.log('Error Code:', message.errorCode);
    console.log('Error Message:', message.errorMessage);
    console.log('Date Created:', message.dateCreated);
    console.log('Date Sent:', message.dateSent);
    
    return message;
  } catch (error) {
    console.error('❌ Error checking message status:', error.message);
    return null;
  }
};

// Check your specific message
checkSMSStatus('SMe8a6a1df749d0b431210cdca244c1f92');