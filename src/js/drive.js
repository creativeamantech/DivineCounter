// Google Drive Sync Module

const CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID'; // TODO: Replace with your Client ID
const API_KEY = 'YOUR_GOOGLE_API_KEY'; // TODO: Replace with your API Key
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';

let tokenClient;
let gapiInited = false;
let gisInited = false;

export function initGoogleDrive() {
    const script1 = document.createElement('script');
    script1.src = 'https://apis.google.com/js/api.js';
    script1.onload = () => gapi.load('client', initializeGapiClient);
    document.body.appendChild(script1);

    const script2 = document.createElement('script');
    script2.src = 'https://accounts.google.com/gsi/client';
    script2.onload = () => {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: '', // defined at request time
        });
        gisInited = true;
        checkAuth();
    };
    document.body.appendChild(script2);
}

async function initializeGapiClient() {
    await gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: [DISCOVERY_DOC],
    });
    gapiInited = true;
    checkAuth();
}

function checkAuth() {
    if (gapiInited && gisInited) {
        const storedToken = localStorage.getItem('gdrive_token');
        if (storedToken) {
            const token = JSON.parse(storedToken);
            gapi.client.setToken(token);
            updateSigninStatus(true);
        } else {
            updateSigninStatus(false);
        }
    }
}

export function handleAuthClick() {
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) {
            throw (resp);
        }
        const token = gapi.client.getToken();
        if (token) {
            localStorage.setItem('gdrive_token', JSON.stringify(token));
            updateSigninStatus(true);
            await listBackups(); // check if backup exists
        }
    };

    if (gapi.client.getToken() === null) {
        tokenClient.requestAccessToken({prompt: 'consent'});
    } else {
        tokenClient.requestAccessToken({prompt: ''});
    }
}

export function handleSignoutClick() {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token);
        gapi.client.setToken('');
        localStorage.removeItem('gdrive_token');
        updateSigninStatus(false);
    }
}

function updateSigninStatus(isSignedIn) {
    const loginBtn = document.getElementById('gdrive-login');
    const logoutBtn = document.getElementById('gdrive-logout');
    const syncControls = document.getElementById('gdrive-controls');
    const statusText = document.getElementById('gdrive-status');

    if (isSignedIn) {
        if(loginBtn) loginBtn.classList.add('hidden');
        if(logoutBtn) logoutBtn.classList.remove('hidden');
        if(syncControls) syncControls.classList.remove('hidden');
        if(statusText) statusText.innerText = "Connected";
    } else {
        if(loginBtn) loginBtn.classList.remove('hidden');
        if(logoutBtn) logoutBtn.classList.add('hidden');
        if(syncControls) syncControls.classList.add('hidden');
        if(statusText) statusText.innerText = "Not Connected";
    }
}

export async function uploadBackup(data) {
    if (!gapi.client.getToken()) {
        showToast("Please login first");
        return;
    }

    try {
        const fileContent = JSON.stringify(data);
        const file = new Blob([fileContent], {type: 'application/json'});
        const metadata = {
            'name': 'divine_counter_backup.json',
            'mimeType': 'application/json',
            'parents': ['appDataFolder']
        };

        const existingFileId = await findBackupFileId();
        const accessToken = gapi.client.getToken().access_token;

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', file);

        let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
        let method = 'POST';

        if (existingFileId) {
            url = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`;
            method = 'PATCH';
        }

        const response = await fetch(url, {
            method: method,
            headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
            body: form
        });

        if (response.ok) {
            showToast("Backup synced to Drive");
        } else {
            console.error("Upload failed", await response.text());
            showToast("Sync failed");
        }
    } catch (err) {
        console.error("Error uploading backup", err);
        showToast("Error uploading backup");
    }
}

export async function restoreBackup() {
    if (!gapi.client.getToken()) return null;

    try {
        const fileId = await findBackupFileId();
        if (!fileId) {
            showToast("No backup found in Drive");
            return null;
        }

        const response = await gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media'
        });

        if (response.status === 200) {
            showToast("Backup restored from Drive");
            return response.result;
        }
    } catch (err) {
        console.error("Error restoring backup", err);
        showToast("Error restoring backup");
    }
    return null;
}

async function findBackupFileId() {
    try {
        const response = await gapi.client.drive.files.list({
            spaces: 'appDataFolder',
            q: "name = 'divine_counter_backup.json' and trashed = false",
            fields: 'files(id, name)',
        });
        const files = response.result.files;
        if (files && files.length > 0) {
            return files[0].id;
        }
    } catch (e) {
        console.error("Error finding file", e);
    }
    return null;
}

function showToast(msg) {
    if (window.app && window.app.showToast) {
        window.app.showToast(msg);
    }
}
