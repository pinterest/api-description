const axios = require('axios');
const fs = require('fs');

async function backupCollection() {
  try {
    // First, try to find "latest" collection by name (preferred)
    // Fall back to COLLECTION_UID if "latest" doesn't exist yet
    let collectionUid = process.env.COLLECTION_UID;
    let collectionName = 'unknown';
    
    if (process.env.POSTMAN_API_KEY) {
      try {
        const collectionsResponse = await axios({
          method: 'get',
          url: 'https://api.getpostman.com/collections',
          headers: { 'X-Api-Key': process.env.POSTMAN_API_KEY }
        });
        
        const latestCollection = collectionsResponse.data.collections.find(c => c.name === 'Pinterest REST API (latest)');
        if (latestCollection) {
          collectionUid = latestCollection.uid;
          collectionName = 'Pinterest REST API (latest)';
          console.log('Found "Pinterest REST API (latest)" collection, using UID:', collectionUid);
        } else {
          console.log('No "Pinterest REST API (latest)" collection found, using COLLECTION_UID:', collectionUid);
        }
      } catch (error) {
        console.log('Could not fetch collections list, using COLLECTION_UID:', collectionUid);
      }
    }

    const url = 'https://api.getpostman.com/collections/' + collectionUid;
    console.log('Backup URL:', url);
    
    console.log('Making backup request...');
    const config = {
      method: 'get',
      url,
      headers: {
        'X-Api-Key': process.env.POSTMAN_API_KEY
      }
    };
    
    const response = await axios(config);
    
    const backupPath = './postman/backup/collection_' + process.env.TIMESTAMP + '.json';
    fs.writeFileSync(backupPath, JSON.stringify(response.data, null, 2));
    console.log('Backup created successfully at:', backupPath);
    console.log('Backed up collection:', collectionName, '(UID:', collectionUid + ')');
  } catch (error) {
    console.error('Backup failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

backupCollection();