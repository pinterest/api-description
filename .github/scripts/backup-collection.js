const axios = require('axios');
const fs = require('fs');

async function backupCollection() {
  try {
    const url = 'https://api.getpostman.com/collections/' + process.env.COLLECTION_UID;
    console.log('Backup URL:', url);
    
    console.log('Making backup request...');
    const config = {
      method: 'get',
      url,
      headers: {
        'X-Api-Key': process.env.POSTMAN_API_KEY
      }
    };
    console.log('Request config:', JSON.stringify({ ...config, headers: { 'X-Api-Key': '***' } }, null, 2));
    
    const response = await axios(config);
    
    const backupPath = './postman/backup/collection_' + process.env.TIMESTAMP + '.json';
    fs.writeFileSync(backupPath, JSON.stringify(response.data, null, 2));
    console.log('Backup created successfully');
  } catch (error) {
    console.error('Backup failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

backupCollection();