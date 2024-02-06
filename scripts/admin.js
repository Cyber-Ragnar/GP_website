
document.addEventListener('DOMContentLoaded', function(){
    const secretKey = 'o43ryr3t9v2671c340c87tyoer87xdyh'; // Key for encryption
    const IV = CryptoJS.enc.Hex.parse('000102030405060708090a0b0c0d0e0f');// Initialization Vector   CryptoJS.lib.WordArray.random(16);
    const IDB = (function init() {
        console.log('initialising');
        let db = null;
        let objectStore = null;
        // setting the version number so it is easier to document changes to db
        let DBOpenReq = window.indexedDB.open('SurgeryDB', 1);

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
                    //await addTestData();
                    //console.log('All items added');
                    displayAdminNameOnLoad();
                    buildTable();
                } catch (error) {
                    console.error('Error adding items:', error);
                }
            };
        });
        
        function encryptData(data) {
            return CryptoJS.AES.encrypt(data, CryptoJS.enc.Utf8.parse(secretKey), { iv: IV, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }).toString();
        }
        
        function encryptData_long_int(data) {
            try {
                // Convert the data to a string or another compatible format if needed
                const dataString = data.toString(); // For example, convert numbers to strings
        
                // Encrypt the data
                const encrypted = CryptoJS.AES.encrypt(dataString, secretKey, { iv: IV }).toString();
                return encrypted;
            } catch (error) {
                console.error('Encryption error:', error);
                return null;
            }
        }
        
        function decryptData(ciphertext) {
            const decrypted = CryptoJS.AES.decrypt(ciphertext, CryptoJS.enc.Utf8.parse(secretKey), { iv: IV, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
            return decrypted.toString(CryptoJS.enc.Utf8);
        }

        document.getElementById('btnRegister').addEventListener('click', async (ev) => {
            ev.preventDefault();
        
            const count = await getCountOfRows();
        
            let id = encryptData('P' + (count + 1));
            let NHS = encryptData(document.getElementById('NHS').value.trim());
            let Title = encryptData(document.getElementById('title').value.trim());
            let First = encryptData(document.getElementById('name').value.trim());
            let DOB = encryptData(document.getElementById('surname').value.trim());
            let Last = encryptData(document.getElementById('d_o_b').value.trim());
            let Gender = encryptData(document.getElementById('gender').value.trim());
            let Address = encryptData(document.getElementById('address').value.trim());
            let Email = encryptData(document.getElementById('email').value.trim());
            let Telephone = encryptData(document.getElementById('phone').value.trim());
            let Password = encryptData(document.getElementById('password').value.trim());
        
            let patient = {
                id: id,
                NHS: NHS,
                Title: Title,
                First: First,
                DOB: DOB,
                Last,
                Gender,
                Address,
                Email,
                Telephone,
                Password,
            };
        
            let transaction = makeTransaction('Patient', 'readwrite');
            transaction.oncomplete = (ev) => {
                console.log(ev);
                buildTable();
                clearForm();
            };
        
            let table = transaction.objectStore('Patient');
            let request = table.add(patient);
        
            request.onsuccess = (ev) => {
                console.log('successfully added an object');
            };
            request.onerror = (err) => {
                console.log('error in request to add');
            };
        });
        
        
        // function which is counting existing amount of rows in the table, so it can be used to produce unique ID number
        async function getCountOfRows(){
            return new Promise((resolve, reject) => {
                let transaction = db.transaction(['Patient'], 'readonly');
                let objectStore = transaction.objectStore('Patient');
                let countRequest = objectStore.count();

                countRequest.onsuccess = function() {
                    resolve(countRequest.result);
                };

                countRequest.onerror = function() {
                    reject("Error in counting rows");
                };
            });
        };

        document.getElementById('btnUpdate').addEventListener('click', (ev) => {
            ev.preventDefault();
        
            let NHS = encryptData(document.getElementById('NHS').value);
            console.log(NHS);
            let Title = encryptData(document.getElementById('title').value.trim());
            let First = encryptData(document.getElementById('name').value.trim());
            let DOB = encryptData(document.getElementById('d_o_b').value.trim());
            let Last = encryptData(document.getElementById('surname').value.trim());
            let Gender = encryptData(document.getElementById('gender').value.trim());
            let Address = encryptData(document.getElementById('address').value.trim());
            let Email = encryptData(document.getElementById('email').value.trim());
            let Telephone = encryptData(document.getElementById('phone').value.trim());
            let Password = encryptData(document.getElementById('password').value.trim());
        
            let key = parseInt(document.new_patient_form.getAttribute('data-key'));
            if (key) {
                let patient = {
                    id: key,
                    NHS,
                    Title,
                    First,
                    Last,
                    DOB,
                    Gender,
                    Address,
                    Email,
                    Telephone,
                    Password,
                };
            
                let transaction = makeTransaction('Patient', 'readwrite');
                transaction.oncomplete = (ev) => {
                    console.log(ev);
                    buildTable();
                    clearForm();
                };
        
                let store = transaction.objectStore('Patient');
                let request = store.put(patient); // request a put/update
        
                request.onsuccess = (ev) => {
                    console.log('successfully updated an object');
                };
        
                request.onerror = (err) => {
                    console.log('error in request to update');
                };
            }
        });
        

        document.getElementById('btnDelete').addEventListener('click', (ev) => {
            ev.preventDefault();
            // id
            let key = parseInt(document.new_patient_form.getAttribute('data-key'));
            if (key) {
                let transaction = makeTransaction('Patient', 'readwrite');
                transaction.oncomplete = (ev) => {
                    console.log(ev);
                    buildTable();
                    clearForm();
                };

                let store = transaction.objectStore('Patient');
                let request = store.delete(key); // request a delete

                request.onsuccess = (ev) => {
                    console.log('successfully deleted an object');
                    // move on to the next request in the transaction or
                    // commit the transaction
                };
                request.onerror = (err) => {
                    console.log('error in request to delete');
                };
            };
        });

        document.getElementById('add/update_patient').addEventListener('click', (ev) => {
            ev.preventDefault();
            addPatient();
        })

        document.getElementById('view/select_patient').addEventListener('click', (ev) => {
            ev.preventDefault();
            updatePatientDetails();
        })

        document.querySelectorAll('.back_button').forEach(button => {
            button.addEventListener('click', function(event) {
                event.preventDefault();
                adminPage();
            });
        })

        document.getElementById('btnSearch').addEventListener('click', (ev) => {
            ev.preventDefault();
            let value = encryptData(document.getElementById('search').value.trim());
            console.log('show me value from search bar: ', value);
            searchBuildTable(value);
        });

        document.getElementById('btnShowAll').addEventListener('click', (ev) => {
            ev.preventDefault();
            buildTable();
        });

        
        document.getElementById('logoutLink').addEventListener('click', function(event) {
            event.preventDefault();
            logout();
        });

        async function searchBuildTable(value) {
            let tableContainer = document.querySelector('.patient_table');
            if (!tableContainer) {
                console.error('table container not found');
                return;
            }
        
            if (db) {
                let table = document.createElement('table');
                table.classList.add('patient-table');
        
                let tableBody = document.createElement('tbody');
        
                let transaction = makeTransaction('Patient', 'readonly');
        
                transaction.oncomplete = () => {
                    table.appendChild(tableBody);
                    tableContainer.innerHTML = '';
                    tableContainer.appendChild(table);
                };
        
                let store = transaction.objectStore('Patient');
                let range = IDBKeyRange.only(value);
                let idx = store.index('First');
                let getRequest = idx.getAll(range);
        
                getRequest.onsuccess = async (ev) => {
                    let request = ev.target;
                    let patients = request.result;
        
                    for (const patient of patients) {
                        let row = tableBody.insertRow();
                        for (const [key, value] of Object.entries(patient)) {
                            let cell = row.insertCell();
                            const decryptedValue = await decryptData(value);
                            cell.textContent = decryptedValue;
                        }
                    }
                };
        
                getRequest.onerror = (err) => {
                    console.warn(err);
                };
            }
        }
        
        

        async function buildTable() {
            let tableContainer = document.querySelector('.patient_table');
            if (!tableContainer) {
                console.error('table container not found');
                return;
            }
        
            if (db) {
                let table = document.createElement('table');
                table.classList.add('patient-table');
        
                let tableBody = document.createElement('tbody');
        
                let transaction = makeTransaction('Patient', 'readonly');
        
                transaction.oncomplete = () => {
                    table.appendChild(tableBody);
                    tableContainer.innerHTML = '';
                    tableContainer.appendChild(table);
                };
        
                let store = transaction.objectStore('Patient');
                let getRequest = store.getAll();
        
                getRequest.onsuccess = async (ev) => {
                    let request = ev.target;
                    let patients = request.result;
        
                    for (const patient of patients) {
                        let row = tableBody.insertRow();
        
                        // Add the 'id' field
                        let idCell = row.insertCell();
                        if (typeof patient.id === 'number') {
                            // If 'id' is a number, display it directly without decryption
                            idCell.textContent = patient.id;
                        } else {
                            // Decrypt 'id' if it's not a number
                            const decryptedId = await decryptData(patient.id);
                            idCell.textContent = decryptedId;
                        }
        
                        // Loop through other fields to decrypt and display
                        for (const [key, value] of Object.entries(patient)) {
                            if (key !== 'id') {
                                let cell = row.insertCell();
                                // Decrypt all fields except the 'id'
                                const decryptedValue = await decryptData(value);
                                cell.textContent = decryptedValue;
                            }
                        }
                    }
                };
        
                getRequest.onerror = (err) => {
                    console.warn(err);
                };
            }
        }
        
        
        
        

        document.querySelector('.patient_table').addEventListener('click', (ev) => {
            let tr = ev.target.closest('tr');
            console.log('trying to find tr: ', tr);
        
            // Extract the ID field value as a string
            let idString = tr.querySelector('td:first-child').textContent.trim();
            console.log('idString: ', idString);
        
            // Check if the extracted ID is a number
            let id = !isNaN(idString) ? parseInt(idString) : idString;
            console.log('id: ', id);
        
            let transaction = makeTransaction('Patient', 'readonly');
            let table = transaction.objectStore('Patient');
            let req = table.get(id);
        
            // Further processing based on the ID retrieved from the table
            // ...
        
        
            console.log('show me req: ', req, 'SHOW ID: ', id);
            req.onsuccess = (ev) => {
                //adminPage();
                addPatient();
                console.log('onsuccess');
                let request = ev.target;
                console.log('request: ', request);
                let patient = request.result;
                console.log('show me patient', patient);
        
                // Populate the form fields with patient data for update/deletion
                if (patient) {
                    document.getElementById('NHS').value = decryptData(patient.NHS);
                    document.getElementById('title').value = decryptData(patient.Title);
                    document.getElementById('name').value = decryptData(patient.First);
                    document.getElementById('surname').value = decryptData(patient.Last);
                    document.getElementById('gender').value = decryptData(patient.Gender);
                    document.getElementById('address').value = decryptData(patient.Address);
                    document.getElementById('email').value = decryptData(patient.Email);
                    document.getElementById('d_o_b').value = decryptData(patient.DOB);
                    document.getElementById('phone').value = decryptData(patient.Telephone);
                    document.getElementById('password').value = decryptData(patient.Password);
                    document.new_patient_form.setAttribute('data-key', patient.id);
                    }
                };
                req.onerror = (err) => {
                    console.warn(err);
                };  
            }           
        );

        function makeTransaction(tableName, mode) {
            let transaction = db.transaction(tableName, mode);
            transaction.onerror = (err) => {
                console.warn(err);
            };
            return transaction;
        };

        document.getElementById('btnClear').addEventListener('click', clearForm);

        function clearForm(ev) {
            if (ev) ev.preventDefault();
            document.new_patient_form.reset();
        };

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

        window.addEventListener('load', function(){
            document.getElementById("services_box").style.backgroundImage = "url(images/backgrounds/4.png)";
            document.getElementById("services_box").style.gridTemplateColumns= "1fr 1fr";
        })
    
        // function changing 'display' parameter in CSS of the elements, which I want to make visible
        // without loading a new page 
    
        function updatePatientDetails() {
            document.getElementById("services_box").style.display = "none";
            document.getElementById("table_box").style.display = "block";
            document.getElementById("search_bar").style.display = "inline-block";
            document.getElementById("container_1").style.display = "block";
            document.getElementById("patient_table").style.display = "block";
        }
        
        // function changing 'display' parameter in CSS of the elements, which I want to make visible
        // without loading a new page 
    
        function addPatient(){
            document.getElementById("services_box").style.display = "none";
            document.getElementById("table_box").style.display = "block";
            document.getElementById("search_bar").style.display = "none";
            document.getElementById("new_patient_form").style.display = "block";
            document.getElementById("form_box").style.display = "block";
        }
        
        // function called out on the 'BACK' button - it reverses display settings, so i can change the 
        // visibility of the page content rather than loading a whole new page.
    
        function adminPage() {
            document.getElementById("services_box").style.display = "grid";
            document.getElementById("table_box").style.display = "none";
            document.getElementById("form_box").style.display = "none";
            document.getElementById("container_1").style.display = "none";
        }

        function logout(){
            clearTemporaryObjectStore();
            window.location.href = 'Home_page.html';
        }

        async function displayAdminNameOnLoad() {
            try {
                const transaction = makeTransaction('Temporary', 'readonly');
                const store = transaction.objectStore('Temporary');
                const cursorRequest = store.openCursor();
        
                cursorRequest.onsuccess = async (event) => {
                    const cursor = event.target.result;
        
                    if (cursor) {
                        const adminId = cursor.value.id;
                        const adminStoreName = cursor.value.table;
                        console.log('id:', adminId, 'name:', adminStoreName);
        
                        const adminFullName = await getAdminFullName(adminId, adminStoreName);
                        displayAdminNameInHTML(adminFullName);
                    } else {
                        console.log('No records found.');
                    }
                };
        
                cursorRequest.onerror = function (event) {
                    console.error('Cursor request error:', event.target.error);
                };
            } catch (error) {
                console.error('Error displaying admin name:', error);
            }
        }
        

        async function getAdminFullName(adminId, adminStoreName) {
            console.log('id: ', adminId, 'table: ', adminStoreName);
            return new Promise((resolve, reject) => {
                const transaction = makeTransaction(adminStoreName, 'readonly');
                const store = transaction.objectStore(adminStoreName);
                const getRequest = store.get(adminId);
        
                getRequest.onsuccess = (event) => {
                    const adminData = event.target.result;
                    console.log('data: ', adminData);
                    if (adminData) {
                        const fullName = `${decryptData(adminData.first_name)} ${decryptData(adminData.last_name)}`;
                        resolve(fullName);
                    } else {
                        reject('Admin not found');
                    }
                };
        
                getRequest.onerror = (event) => {
                    reject(event.target.error);
                };
            });
        }
        
        function displayAdminNameInHTML(adminFullName) {
            const welcomeMessage = document.querySelector('.main_tag h1');
            if (welcomeMessage) {
                welcomeMessage.textContent = `Welcome admin ${adminFullName}`;
            } else {
                console.error("Welcome message element not found.");
            }
        }
        
    })();
});
