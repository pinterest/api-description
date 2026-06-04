const axios = require('axios');
const fs = require('fs').promises;
const { execSync } = require('child_process');

const POSTMAN_API_KEY = process.env.POSTMAN_API_KEY;
const COLLECTION_UID = process.env.COLLECTION_UID;
const POSTMAN_API_BASE = 'https://api.getpostman.com';
const WORKSPACE_NAME = 'Pinterest Collections';

// Validate required environment variables
if (!POSTMAN_API_KEY) {
  console.error('Error: POSTMAN_API_KEY environment variable is required');
  process.exit(1);
}

if (!COLLECTION_UID) {
  console.error('Error: COLLECTION_UID environment variable is required');
  process.exit(1);
}

async function getWorkspaces() {
  try {
    const response = await axios.get(`${POSTMAN_API_BASE}/workspaces`, {
      headers: {
        'X-API-Key': POSTMAN_API_KEY
      }
    });
    return response.data.workspaces;
  } catch (error) {
    console.error('Error fetching workspaces:', error.response?.data || error.message);
    throw error;
  }
}

async function getCollectionsFromWorkspace(workspaceId) {
  try {
    const response = await axios.get(`${POSTMAN_API_BASE}/workspaces/${workspaceId}`, {
      headers: {
        'X-API-Key': POSTMAN_API_KEY
      }
    });
    return response.data.workspace.collections;
  } catch (error) {
    console.error('Error fetching collections from workspace:', error.response?.data || error.message);
    throw error;
  }
}

async function getCollections() {
  try {
    // Get all workspaces
    const workspaces = await getWorkspaces();
    
    // Find the Pinterest Collections workspace
    const targetWorkspace = workspaces.find(w => w.name === WORKSPACE_NAME);
    if (!targetWorkspace) {
      throw new Error(`Workspace "${WORKSPACE_NAME}" not found`);
    }
    
    console.log(`Found workspace: ${targetWorkspace.name} (ID: ${targetWorkspace.id})`);
    
    // Get collections from the specific workspace
    return await getCollectionsFromWorkspace(targetWorkspace.id);
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
    if (!uid) {
      throw new Error('Collection UID is required but was not provided');
    }
    
    if (!updateData || typeof updateData !== 'object') {
      throw new Error('Update data is required and must be an object');
    }
    
    const payload = {
      collection: updateData
    };
    
    const response = await axios.put(`${POSTMAN_API_BASE}/collections/${uid}`, payload, {
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

async function createCollection(collectionData, workspaceId) {
  try {
    const payload = {
      collection: collectionData
    };
    
    // Add workspace parameter if provided
    if (workspaceId) {
      payload.workspace = workspaceId;
    }
    
    const response = await axios.post(`${POSTMAN_API_BASE}/collections`, payload, {
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

async function getCurrentVersionFromSpec() {
  const specPath = './v5/openapi.json';
  try {
    const specData = JSON.parse(await fs.readFile(specPath, 'utf8'));
    const version = specData?.info?.version;
    if (!version) {
      throw new Error(`Could not find info.version in ${specPath}`);
    }
    return version;
  } catch (error) {
    console.error('Error reading current version from OpenAPI spec:', error.message);
    throw error;
  }
}

async function getPreviousVersionFromSpec() {
  try {
    const prevContent = execSync('git show HEAD~1:v5/openapi.json').toString();
    const version = JSON.parse(prevContent)?.info?.version;
    if (!version) {
      throw new Error('Could not find info.version in HEAD~1:v5/openapi.json');
    }
    return version;
  } catch (error) {
    console.error('Error reading previous version from git:', error.message);
    throw error;
  }
}

async function main() {
  try {
    console.log('Starting collection versioning process...');
    
    // Get all workspaces and find target workspace
    const workspaces = await getWorkspaces();
    const targetWorkspace = workspaces.find(w => w.name === WORKSPACE_NAME);
    if (!targetWorkspace) {
      throw new Error(`Workspace "${WORKSPACE_NAME}" not found`);
    }
    
    // Get collections from Pinterest Collections workspace
    const collections = await getCollections();
    console.log(`Found ${collections.length} collections in "${WORKSPACE_NAME}" workspace:`, collections.map(c => c.name));
    
    // Find the target collection - try by UID first (primary method), then by name as fallback
    let latestCollection = collections.find(c => c.uid === COLLECTION_UID);
    
    if (!latestCollection) {
      console.log(`Collection with UID ${COLLECTION_UID} not found, searching by name "Pinterest REST API (latest)"...`);
      latestCollection = collections.find(c => c.name === 'Pinterest REST API (latest)');
      if (!latestCollection) {
        collections.forEach(c => console.log(`  - "${c.name}"`));
        throw new Error(`Collection not found by UID ${COLLECTION_UID} or by name "Pinterest REST API (latest)"`);
      }
    }
    
    // Validate that we have a valid UID
    if (!latestCollection.uid) {
      throw new Error('Collection UID is undefined or null');
    }
    
    const previousVersion = await getPreviousVersionFromSpec();
    const currentVersion = await getCurrentVersionFromSpec();
    const versionedName = `Pinterest REST API ${previousVersion}`;
    
    console.log(`Snapshot will be named: "${versionedName}" (deploying ${currentVersion})`);
    
    // Step 1: Get the current content of the "latest" collection
    console.log('Getting current collection content...');
    const currentLatestContent = await getCollection(latestCollection.uid);
    
    // Step 2: Create a new versioned collection with the current content
    const versionedCollectionData = {
      ...currentLatestContent,
      info: {
        ...currentLatestContent.info,
        name: versionedName,
        // Update description to include the version
        description: currentLatestContent.info.description 
          ? currentLatestContent.info.description.replace(
              "Pinterest's REST API", 
              `Pinterest's REST API (${previousVersion})`
            )
          : `Pinterest's REST API (${previousVersion})`
      }
    };
    
    // Remove uid and id as they shouldn't be in create payload
    delete versionedCollectionData.uid;
    delete versionedCollectionData.id;
    
    const versionedCollection = await createCollection(versionedCollectionData, targetWorkspace.id);
    console.log(`Created snapshot: ${versionedCollection.name}`);
    
    // Step 3: Update the "latest" collection with the new OpenAPI conversion
    console.log('\nStep 3: Updating latest collection...');
    const convertedCollectionPath = './postman/collection.json';
    
    // Check if the converted collection file exists
    try {
      await fs.access(convertedCollectionPath);
    } catch (error) {
      throw new Error(`Converted collection file not found at ${convertedCollectionPath}. Make sure the OpenAPI conversion step has run successfully.`);
    }
    
    const convertedCollectionData = JSON.parse(await fs.readFile(convertedCollectionPath, 'utf8'));
    console.log('Converted collection loaded successfully');

    // Ensure the converted collection has the correct name
    if (!convertedCollectionData.info) {
      convertedCollectionData.info = {};
    }
    convertedCollectionData.info.name = 'Pinterest REST API (latest)';
    convertedCollectionData.info.description = `Pinterest's REST API (${currentVersion})`;
    
    // Remove uid and id from the converted data
    delete convertedCollectionData.uid;
    delete convertedCollectionData.id;
  
    // Validate data before sending
    if (!convertedCollectionData || Object.keys(convertedCollectionData).length === 0) {
      throw new Error('Converted collection data is empty or invalid');
    }
    
    console.log('Updating "latest" collection with fresh API specs...');
    const updateResult = await updateCollection(latestCollection.uid, convertedCollectionData);
    
    console.log('\n✓ Success!:');
    console.log(`  - Created backup: "${versionedName}"`);
    console.log(`  - Updated "latest" with new OpenAPI specs`);
    console.log('Collection updated successfully');
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    process.exit(1);
  }
}

main();
