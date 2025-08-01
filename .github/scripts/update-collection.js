const axios = require('axios');
const fs = require('fs').promises;

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

async function getLatestGitHubRelease() {
  try {
    const response = await axios.get('https://api.github.com/repos/pinterest/api-description/releases/latest');
    return response.data.tag_name;
  } catch (error) {
    console.error('Error fetching GitHub releases:', error.response?.data || error.message);
    throw error;
  }
}

function parseVersion(versionString) {
  // Remove 'v' prefix if present
  const cleanVersion = versionString.replace(/^v/, '');
  const match = cleanVersion.match(/(\d+)\.(\d+)\.(\d+)/);
  if (match) {
    return {
      major: parseInt(match[1]),
      minor: parseInt(match[2]),
      patch: parseInt(match[3])
    };
  }
  return null;
}

async function getNextVersion() {
  try {
    const latestRelease = await getLatestGitHubRelease();
    console.log(`Latest GitHub release: ${latestRelease}`);
    
    const version = parseVersion(latestRelease);
    if (!version) {
      throw new Error(`Could not parse version from GitHub release: ${latestRelease}`);
    }
    
    // Increment minor version
    version.minor += 1;
    version.patch = 0;
    
    return `${version.major}.${version.minor}.${version.patch}`;
  } catch (error) {
    console.error('Error getting next version from GitHub:', error.message);
    console.log('Falling back to default version 1.0.0');
    return '1.0.0';
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
    
    // Calculate next version from GitHub releases
    const nextVersion = await getNextVersion();
    const versionedName = `Pinterest REST API ${nextVersion}`;
    
    console.log(`Next version will be: ${versionedName}`);
    
    // Step 1: Get the current content of the "latest" collection
    console.log('Getting current collection content...');
    const currentLatestContent = await getCollection(latestCollection.uid);
    
    // Step 2: Create a new versioned collection with the current content
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
