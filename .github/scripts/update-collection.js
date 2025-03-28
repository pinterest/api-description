const axios = require('axios');
const fs = require('fs');

async function updateCollection() {
  try {
    const url = 'https://api.getpostman.com/collections/' + process.env.COLLECTION_UID;
    console.log('Update URL:', url);
    
    const collectionData = JSON.parse(fs.readFileSync('./postman/collection.json'));
    const payload = { collection: collectionData };
    
    console.log('Making update request...');
    const config = {
      method: 'put',
      url,
      headers: {
        'X-Api-Key': process.env.POSTMAN_API_KEY,
        'Content-Type': 'application/json'
      },
      data: payload
    };
    
    const response = await axios(config);
    
    console.log('Collection updated successfully');
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Update failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

updateCollection();