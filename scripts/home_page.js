// ---------------------------------- INITIALIZING SCRIPT AND DATABASE ------------------------------------//

document.addEventListener('DOMContentLoaded', function(){
    const secretKey = 'o43ryr3t9v2671c340c87tyoer87xdyh'; // Key for encryption
    const IV = CryptoJS.enc.Hex.parse('000102030405060708090a0b0c0d0e0f');// Initialization Vector   CryptoJS.lib.WordArray.random(16);
    const IDB = (function init() {
        console.log('initialising');
        let db = null;
        let objectStore = null;
        // setting the version number so it is easier to document changes to db
        let DBOpenReq = window.indexedDB.open('SurgeryDB', 1.1);

        DBOpenReq.addEventListener('error', (err) => {
            // error occured while trying to open DB
            console.warn(err);
        });

        DBOpenReq.addEventListener('success', async (ev) => {
            // DB has been opened... after upgradeneeded
            db = ev.target.result;
            console.log('success', db);
            let transaction = makeTransaction('Patient', 'readwrite');
            transaction.oncomplete = async (ev) => {
                try {
                    await addTestData('https://simulacra.uk/CST2572/people.json', 'Patient', 'Patient123/', 1);
                    console.log('All Patient items added');
                    await addTestData('https://simulacra.uk/CST2572/doctor.json', 'Doctor', 'Doctor123/', 1);
                    console.log('All Doctor items added');
                    await addTestData('https://simulacra.uk/CST2572/admin.json', 'Admin', 'Admin123/', 1);
                    console.log('All Admin items added');
                    await addTestData('https://simulacra.uk/CST2572/medicine.json', 'Medicine', 'none', 0);
                    console.log('All Medicine items added');
                    //buildTable();
                } catch (error) {
                    console.error('Error adding items:', error);
                }
            };
        });

// --------------------------------------- ADDING TEST DATA ------------------------------------------------//        
        // Function for encryption
        function encryptData(data) {
            return CryptoJS.AES.encrypt(data, CryptoJS.enc.Utf8.parse(secretKey), { iv: IV, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }).toString();
        }

        // function for decryption
        function decryptData(ciphertext) {
            const decrypted = CryptoJS.AES.decrypt(ciphertext, CryptoJS.enc.Utf8.parse(secretKey), { iv: IV, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
            return decrypted.toString(CryptoJS.enc.Utf8);
        }
    
     // function populating database with test data
     async function addTestData(source, table, password, flag) {
            try {
                const response = await fetch(source);
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                console.log('Fetching data successful');
        
                const data = await response.json();
        
                const transaction = db.transaction([table], 'readwrite');
                const objectStore = transaction.objectStore(table);
        
                transaction.oncomplete = () => {
                    console.log('All items added successfully');
                    // buildTable(); // Assuming buildTable function exists and serves a purpose
                };
        
                transaction.onerror = (event) => {
                    console.error('Transaction error:', event.target.error);
                };
                for (const item of data) {
                    // Check if the record already exists
                    for (const field in item) {
                        if (item.hasOwnProperty(field) && typeof item[field] === 'string') {
                            item[field] = encryptData(item[field]);
                        }
                    }
                    const existingRecord = await getItemByKey(objectStore, item.id);
                    if(flag === 1){
                        if (!existingRecord) {
                            // Add the record if it doesn't exist
                            const encryptedPassword = encryptData(password);
                            const request = objectStore.add({ ...item, Password: encryptedPassword });
                            request.onsuccess = () => {
                                console.log('Item added successfully', item);
                            };
                        } else if (!existingRecord.Password) {
                            // Add a common password if the record exists but doesn't have a password
                            existingRecord.Password = encryptData(password);
                            const request = objectStore.put(existingRecord);
                            request.onsuccess = () => {
                                console.log('Password added to existing record:', existingRecord);
                            };
                        } else {
                            console.log('Record already exists with a password, skipping:', item);
                        }
                    }else {
                        const request = objectStore.put({...item});
                        request.onsuccess = () => {
                            console.log('Drug added successfully');
                        }
                    }
                }    

            } catch (error) {
                console.error('Error fetching or processing data:', error);
            }
        }

        function getItemByKey(objectStore, key) {
            return new Promise((resolve, reject) => {
                const request = objectStore.get(key);
                request.onsuccess = () => {
                    resolve(request.result);
                };
                request.onerror = () => {
                    reject(request.error);
                };
            });
        }
        
        
        // Helper function to get an item by key from the object store
        function getItemByKey(objectStore, key) {
            return new Promise((resolve, reject) => {
                const request = objectStore.get(key);
                request.onsuccess = () => {
                    resolve(request.result);
                };
                request.onerror = () => {
                    reject(request.error);
                };
            });
        }
        
        
        
//----------------------------------- DATABASE TABLES CREATION ----------------------------//        

        DBOpenReq.addEventListener('upgradeneeded', (ev) => {
            db = ev.target.result;
            let oldVersion = ev.oldVersion;
            let newVersion  = ev.newVersion || db.version;
            console.log('DB updated from version', oldVersion, 'to', newVersion);
            console.log('upgrade', db);
            if( ! db.objectStoreNames.contains('Patient')){
                objectStore = db.createObjectStore('Patient', {
                    keyPath: 'id'
                });
                objectStore.createIndex('NHS', 'NHS', {unique: true});
                objectStore.createIndex('Title', 'Title', {unique: false});
                objectStore.createIndex('First', 'First', {unique: false});
                objectStore.createIndex('Last', 'Last', {unique: false});
                objectStore.createIndex('DOB', 'DOB', {unique: false});
                objectStore.createIndex('Gender', 'Gender', {unique: false});
                objectStore.createIndex('Address', 'Address', {unique: false});
                objectStore.createIndex('Email', 'Email', {unique: false});
                objectStore.createIndex('Telephone', 'Telephone', {unique: false});
                objectStore.createIndex('Password', 'Password', {unique: false});
            }
            if( ! db.objectStoreNames.contains('Doctor')){
                objectStore = db.createObjectStore('Doctor', {
                    keyPath: 'id'
                });
                objectStore.createIndex('first_name', 'first_name', {uniqe: false});
                objectStore.createIndex('last_name', 'last_name', {uniqe: false});
                objectStore.createIndex('email', 'email', {uniqe: false});
                objectStore.createIndex('gender', 'gender', {uniqe: false});
                objectStore.createIndex('Address', 'Address', {uniqe: false});
                objectStore.createIndex('Telephone', 'Telephone', {uniqe: false});
                objectStore.createIndex('Password', 'Password', {unique: false});
            }
            if( ! db.objectStoreNames.contains('Admin')){
                objectStore = db.createObjectStore('Admin', {
                    keyPath: 'id'
                });
                objectStore.createIndex('first_name', 'first_name', { unique: false});
                objectStore.createIndex('last_name', 'last_name', { uniqe: false});
                objectStore.createIndex('email', 'email', {uniqe: false});
                objectStore.createIndex('Password', 'password', {unique:false});
            }
            if( ! db.objectStoreNames.contains('Medicine')){
                objectStore = db.createObjectStore('Medicine', {
                    keyPath: 'id'
                });
                objectStore.createIndex('Drug', 'Drug', {unique: false});
            }
            if( ! db.objectStoreNames.contains('Appointment')){
                objectStore = db.createObjectStore('Appointment', {
                    keyPath: 'id'
                });
                objectStore.createIndex('doctor_id', 'doctor_id', {uniqe: false});
                objectStore.createIndex('doctor', 'doctor', {uniqe: false});
                objectStore.createIndex('patient_id', 'patient_id', {unique: false});
                objectStore.createIndex('patient', 'patient', {unique: false});
                objectStore.createIndex('date', 'date', {unique: false});
                objectStore.createIndex('timeslot', 'timeslot', {unique:false});
                objectStore.createIndex('notes', 'notes', {unique: false});
            }
            if( ! db.objectStoreNames.contains('Prescription')){
                objectStore = db.createObjectStore('Prescription', {
                    keyPath: 'id'
                });
                objectStore.createIndex('patient', 'patient', {unique: false});
                objectStore.createIndex('doctor', 'doctor', {unique:false});
                objectStore.createIndex('medicine', 'medicine', {unique: false});
                objectStore.createIndex('date', 'date', {uniqe:false});
                objectStore.createIndex('prescription', 'prescription', {unique:false});
                objectStore.createIndex('status', 'status', {unique: false});
            }
            if( ! db.objectStoreNames.contains('Record')){
                objectStore = db.createObjectStore('Record', {
                    keyPath: 'id'
                });
                objectStore.createIndex('date_created', 'date_created', {uniqe: false});
                objectStore.createIndex('time_created', 'time_created', {uniqe: false});
                objectStore.createIndex('doctor_id', 'doctor_id', {unique: false});
                objectStore.createIndex('doctor', 'doctor', {unique: false});
                objectStore.createIndex('patient_id', 'patient_id', {unique: false});
                objectStore.createIndex('patient', 'patient', {unique: false});
                objectStore.createIndex('record', 'record', {unique: false});
                objectStore.createIndex('record_type', 'record_type', {unique: false});
            }
            if( ! db.objectStoreNames.contains('Temporary')){
                objectStore = db.createObjectStore('Temporary', {
                    keyPath: 'id'
                });
                objectStore.createIndex('key', 'key', {unique: true});
                objectStore.createIndex('table', 'table', {unique: true});
            };
        });

        document.getElementById('login_form').addEventListener('submit', async (ev) => {
            ev.preventDefault();
            let email = encryptData(document.getElementById('username').value.trim());
            console.log('enc email', email);
            let email2 = encryptData(document.getElementById('username').value.trim());
            console.log('enc email', email2);
            let password = document.getElementById('password').value.trim();

            loginSystem(email, password);
        })

        function makeTransaction(tableName, mode) {
            let transaction = db.transaction(tableName, mode);
            transaction.onerror = (err) => {
                console.warn(err);
            };
            return transaction;
        };

        function loginSystem(email, password) {
            const stores = [
                { name: 'Patient', emailKey: 'Email' },
                { name: 'Doctor', emailKey: 'email' },
                { name: 'Admin', emailKey: 'email' }
            ];
            const transaction = makeTransaction(stores.map(store => store.name), 'readonly');
            let userFound = false;
            let wrongPassword = false;
            let userData = {};
        
            stores.forEach(storeInfo => {
                const objectStore = transaction.objectStore(storeInfo.name);
                const request = objectStore.index(storeInfo.emailKey).get(email);
        
                request.onsuccess = async (event) => {
                    console.log('success, continuing to log in');
                    const user = event.target.result;
                    if (user) {
                        try {
                            // Decrypt the user's password for comparison
                            const userPassword = user.Password;
        
                            // Encrypt the provided password for comparison
                            const encryptedProvidedPassword = encryptData(password);
                            console.log('enc pass', encryptedProvidedPassword);
        
                            // Compare decrypted user password with the provided encrypted password
                            if (userPassword === encryptedProvidedPassword) {
                                console.log('Login successful');
                                let role;
                                if (storeInfo.name === 'Admin') {
                                    role = 'admin';
                                } else if (storeInfo.name === 'Doctor') {
                                    role = 'doctor';
                                } else if (storeInfo.name === 'Patient') {
                                    role = 'patient';
                                }
                                userFound = true;
                                userData = {
                                    id: user.id,
                                    table: storeInfo.name
                                };
                                redirectToRolePage(role);
                                insertIntoTemporary(userData);
                                console.log(userData);
                            } else {
                                wrongPassword = true;
                            }
                        } catch (error) {
                            console.error('Error decrypting data:', error);
                        }
                    }
                };
        
                request.onerror = (event) => {
                    console.error(`Error fetching user from ${storeInfo.name} store:`, event.target.error);
                };
            });
        
            setTimeout(() => {
                if (!userFound && !wrongPassword) {
                    alert('User does not exist');
                } else if (!userFound && wrongPassword) {
                    alert('Wrong password');
                }
            }, 100);
        }
        
        
        
        
        function insertIntoTemporary(userData) {
            const encryptedUserData = userData;
            const tempTransaction = makeTransaction(['Temporary'], 'readwrite');
            const tempObjectStore = tempTransaction.objectStore('Temporary');
            const request = tempObjectStore.put(encryptedUserData);

            request.onsuccess = () => {
                console.log('User data stored temporarily');
            };

            request.onerror = (event) => {
                console.error('Error inserting temp data ', event.target.error);
            };
        }

        // Function to clear 'Temporary' object store
        function clearTemporaryObjectStore() {
            const tempTransaction = makeTransaction(['Temporary'], 'readwrite');
            const tempObjectStore = tempTransaction.objectStore('Temporary');

            const clearRequest = tempObjectStore.clear();

            clearRequest.onsuccess = () => {
                console.log('Temporary object store cleared');
            };

            clearRequest.onerror = (event) => {
                console.error('Error clearing Temporary object store:', event.target.error);
            };
        }

        // Check if the current page URL matches the home page URL before clearing the 'Temporary' object store
        window.addEventListener('beforeunload', () => {
            clearTemporaryObjectStore();
        });


        function redirectToRolePage(role) {
            switch (role) {
                case 'admin':
                    window.location.href = 'admin_page.html'; 
                    break;
                case 'doctor':
                    window.location.href = 'doctor_page.html'; 
                    break;
                case 'patient':
                    window.location.href = 'patient_page.html'; 
                    break;
                default:
                    console.log('Unknown role');
                    // Handle unknown roles or unexpected scenarios
            }
        }
    })();
});
