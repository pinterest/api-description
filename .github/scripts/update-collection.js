const axios = require('axios');
const fs = require('fs').promises;

const POSTMAN_API_KEY = process.env.POSTMAN_API_KEY;
const COLLECTION_UID = process.env.COLLECTION_UID;
const POSTMAN_API_BASE = 'https://api.getpostman.com';

// Validate required environment variables
if (!POSTMAN_API_KEY) {
  console.error('Error: POSTMAN_API_KEY environment variable is required');
  process.exit(1);
}

if (!COLLECTION_UID) {
  console.error('Error: COLLECTION_UID environment variable is required');
  process.exit(1);
}

async function getCollections() {
  try {
    const response = await axios.get(`${POSTMAN_API_BASE}/collections`, {
      headers: {
        'X-API-Key': POSTMAN_API_KEY
      }
    });
    return response.data.collections;
  } catch (error) {
    console.error('Error fetching collections:', error.response?.data || error.message);
    throw error;
  }
}

async function getCollection(uid) {
  try {
    const response = await axios.get(`${POSTMAN_API_BASE}/collections/${uid}`, {
      headers: {
        'X-API-Key': POSTMAN_API_KEY
      }
    });
    return response.data.collection;
  } catch (error) {
    console.error('Error fetching collection:', error.response?.data || error.message);
    throw error;
  }
}

async function updateCollection(uid, updateData) {
  try {
    const response = await axios.put(`${POSTMAN_API_BASE}/collections/${uid}`, {
      collection: updateData
    }, {
      headers: {
        'X-API-Key': POSTMAN_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    return response.data.collection;
  } catch (error) {
    console.error('Error updating collection:', error.response?.data || error.message);
    throw error;
  }
}

async function createCollection(collectionData) {
  try {
    const response = await axios.post(`${POSTMAN_API_BASE}/collections`, {
      collection: collectionData
    }, {
      headers: {
        'X-API-Key': POSTMAN_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    return response.data.collection;
  } catch (error) {
    console.error('Error creating collection:', error.response?.data || error.message);
    throw error;
  }
}

function extractVersion(name) {
  const match = name.match(/(\d+)\.(\d+)\.(\d+)/);
  if (match) {
    return {
      major: parseInt(match[1]),
      minor: parseInt(match[2]),
      patch: parseInt(match[3])
    };
  }
  return null;
}

function getNextVersion(collections) {
  let highestVersion = null;
  
  collections.forEach(collection => {
    const version = extractVersion(collection.name);
    if (version) {
      const versionString = `${version.major}.${version.minor}.${version.patch}`;
      const highestString = highestVersion ? 
        `${highestVersion.major}.${highestVersion.minor}.${highestVersion.patch}` : '0.0.0';
      
      if (versionString > highestString) {
        highestVersion = version;
      }
    }
  });
  
  if (!highestVersion) return '1.0.0';
  
  highestVersion.minor += 1;
  highestVersion.patch = 0;
  
  return `${highestVersion.major}.${highestVersion.minor}.${highestVersion.patch}`;
}

async function main() {
  try {
    console.log('Starting collection versioning process...');
    
    // Get all collections
    const collections = await getCollections();
    console.log(`Found ${collections.length} collections:`, collections.map(c => c.name));
    
    // Find the target collection - try by UID first (primary method), then by name as fallback
    let latestCollection = collections.find(c => c.uid === COLLECTION_UID);
    
    if (!latestCollection) {
      console.log(`Collection with UID ${COLLECTION_UID} not found, searching by name "Pinterest REST API (latest)"...`);
      latestCollection = collections.find(c => c.name === 'Pinterest REST API (latest)');
      if (!latestCollection) {
        throw new Error(`Collection not found by UID ${COLLECTION_UID} or by name "Pinterest REST API (latest)"`);
      }
      console.log(`Tip: Update COLLECTION_UID to: ${latestCollection.uid}`);
    }
    
    console.log(`Found collection: ${latestCollection.name} (UID: ${latestCollection.uid})`);
    
    // Calculate next version
    const nextVersion = getNextVersion(collections);
    const versionedName = `Pinterest REST API ${nextVersion}`;
    
    console.log(`Next version will be: ${versionedName}`);
    
    // Step 1: Get the current content of the "latest" collection
    console.log('Getting current collection content...');
    const currentLatestContent = await getCollection(latestCollection.uid);
    
    // Step 2: Create a new versioned collection with the current content
    console.log(`Creating snapshot: "${versionedName}"...`);
    const versionedCollectionData = {
      ...currentLatestContent,
      info: {
        ...currentLatestContent.info,
        name: versionedName
      }
    };
    
    // Remove uid and id as they shouldn't be in create payload
    delete versionedCollectionData.uid;
    delete versionedCollectionData.id;
    
    const versionedCollection = await createCollection(versionedCollectionData);
    console.log(`Created snapshot: ${versionedCollection.name}`);
    
    // Step 3: Update the "latest" collection with the new OpenAPI conversion
    console.log('Loading OpenAPI conversion...');
    const convertedCollectionPath = './postman/collection.json';
    
    // Check if the converted collection file exists
    try {
      await fs.access(convertedCollectionPath);
    } catch (error) {
      throw new Error(`Converted collection file not found at ${convertedCollectionPath}. Make sure the OpenAPI conversion step has run successfully.`);
    }
    
    const convertedCollectionData = JSON.parse(await fs.readFile(convertedCollectionPath, 'utf8'));
    
    // Ensure the converted collection has the correct name
    if (!convertedCollectionData.info) {
      convertedCollectionData.info = {};
    }
    convertedCollectionData.info.name = 'Pinterest REST API (latest)';
    
    // Remove uid and id from the converted data
    delete convertedCollectionData.uid;
    delete convertedCollectionData.id;
    
    console.log('Updating "latest" collection with fresh API specs...');
    await updateCollection(latestCollection.uid, convertedCollectionData);
    
    console.log('\n✓ Success!:');
    console.log(`  - Created backup: "${versionedName}"`);
    console.log(`  - Updated "latest" with new OpenAPI specs`);
    console.log(`  - Collection UID stayed the same: ${latestCollection.uid}`);
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    process.exit(1);
  }
}

main();