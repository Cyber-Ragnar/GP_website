document.addEventListener('DOMContentLoaded', function(){
    const secretKey = 'o43ryr3t9v2671c340c87tyoer87xdyh'; // Key for encryption
    const IV = CryptoJS.enc.Hex.parse('000102030405060708090a0b0c0d0e0f');// Initialization Vector   CryptoJS.lib.WordArray.random(16);
    const IDB = (function init() {
        let temp = null; 
        console.log('initialising');
        const today = new Date().toISOString().split('T')[0];
        const currentTime = new Date().toLocaleTimeString();
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
            transaction.oncomplete = () => {
                try {
                    displayDoctorNameOnLoad();
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

        function searchBuildTable(value) {
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
                        let columnsToDisplay = ['id', 'NHS', 'Title', 'First', 'Last', 'DOB', 'Gender', 'Address', 'Email', 'Telephone'];
        
                        for (const column of columnsToDisplay) {
                            let cell = row.insertCell();
                            // Decrypting the displayed data
                            const decryptedValue = await decryptData(patient[column]);
                            cell.textContent = decryptedValue;
                        }
                    }
                };
        
                getRequest.onerror = (err) => {
                    console.warn(err);
                };
        
                tableContainer.innerHTML = '';
                tableContainer.appendChild(table);
            }
        }
        
      

        async function buildTable() {
            let tableContainer = document.querySelector('.patient_table');
            if (!tableContainer) {
                console.error('table container not found');
                return;
            }
            if (db) {
                // use getAll to get an array of objects from the table
                let table = document.createElement('table');
                table.classList.add('patient-table');
        
                let tableBody = document.getElementById('patient_table_body');
        
                let transaction = makeTransaction('Patient', 'readonly');
                let store = transaction.objectStore('Patient');
                let getRequest = store.getAll();
        
                getRequest.onsuccess = async (ev) => {
                    let request = ev.target;
                    let patients = request.result;
        
                    patients.forEach(async (patient) => {
                        let row = tableContainer.insertRow();
                        let columnsToDisplay = ['id', 'NHS', 'Title', 'First', 'Last', 'DOB', 'Gender', 'Address', 'Email', 'Telephone'];
        
                        for (const column of columnsToDisplay) {
                            let cell = row.insertCell();
                            // Check if the column is 'id' and skip decryption
                            if (column === 'id') {
                                cell.textContent = patient[column];
                            } else {
                                // Decrypting the displayed data for other columns
                                const decryptedValue = await decryptData(patient[column]);
                                cell.textContent = decryptedValue;
                            }
                        }
        
                        let addButtonCell = row.insertCell();
                        let addButton = document.createElement('button');
                        addButton.textContent = 'Add';
                        addButton.addEventListener('click', () => {
                            notePage();
                            temp = patient.id;
                            console.log(`Add button clicked for patient ID: ${temp}`);
                            // Perform action when the 'Add' button is clicked for a specific patient
                        });
                        addButtonCell.appendChild(addButton);
                    });
                };
        
                getRequest.onerror = (err) => {
                    console.warn(err);
                };
        
                tableContainer.innerHTML = '';
                tableContainer.appendChild(table);
            }
        }
        
        

        function makeTransaction(tableName, mode) {
            let transaction = db.transaction(tableName, mode);
            transaction.onerror = (err) => {
                console.warn(err);
            };
            return transaction;
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

        function logout(){
            clearTemporaryObjectStore();
            window.location.href = 'Home_page.html';
        }

        async function displayDoctorNameOnLoad() {
            try {
                const transaction = makeTransaction('Temporary', 'readonly');
                const store = transaction.objectStore('Temporary');
                const cursorRequest = store.openCursor();
        
                cursorRequest.onsuccess = async (event) => {
                    const cursor = event.target.result;
        
                    if (cursor) {
                        const doctorId = cursor.value.id;
                        const doctorStoreName = cursor.value.table;
                        console.log('id:', doctorId, 'name:', doctorStoreName);
        
                        const doctorFullName = await getDoctorFullName(doctorId, doctorStoreName);
                        displayDoctorNameInHTML(doctorFullName);
                    } else {
                        console.log('No records found.');
                    }
                };
        
                cursorRequest.onerror = function (event) {
                    console.error('Cursor request error:', event.target.error);
                };
            } catch (error) {
                console.error('Error displaying doctor name:', error);
            }
        }   

        async function getDoctorFullName(doctorId, doctorStoreName) {
            console.log('id: ', doctorId, 'table: ', doctorStoreName);
            return new Promise((resolve, reject) => {
                const transaction = makeTransaction(doctorStoreName, 'readonly');
                const store = transaction.objectStore(doctorStoreName);
                const getRequest = store.get(doctorId);
        
                getRequest.onsuccess = (event) => {
                    const doctorData = event.target.result;
                    console.log('data: ', doctorData);
                    if (doctorData) {
                        const fullName = `${decryptData(doctorData.first_name)} ${decryptData(doctorData.last_name)}`;
                        resolve(fullName);
                    } else {
                        reject('Patient not found');
                    }
                };
        
                getRequest.onerror = (event) => {
                    reject(event.target.error);
                };
            });
        }

        function displayDoctorNameInHTML(doctorFullName) {
            const welcomeMessage = document.querySelector('.main_tag h1');
            if (welcomeMessage) {
                welcomeMessage.textContent = `Welcome dr. ${doctorFullName}`;
            } else {
                console.error("Welcome message element not found.");
            }
        }

        document.querySelector('.patient_table').addEventListener('click', async (ev) => {
            ev.stopPropagation();
            let tr = ev.target.closest('tr');
            let id = parseInt(tr.querySelector('td:first-child').textContent);
        
            try {
                const records = await fetchRecordsByPatientId(id); // Function to fetch records by patient ID
                console.log('records: ', records);
                const table = document.getElementById('records_table');
                clearTable(table); // Function to clear existing rows except header row
                console.log('table cleared');
        
                if (records && records.length > 0) {
                    patientHistory();
                    console.log('records present, length = ', records.length);
                    records.forEach(record => {
                        console.log('record: ', record);
                        const newRow = table.insertRow();
                        newRow.insertCell().textContent = record.patient; 
                        console.log('record.patient', record.patient);
                        newRow.insertCell().textContent = record.date_created;
                        newRow.insertCell().textContent = record.time_created;
                        newRow.insertCell().textContent = record.doctor;
                        newRow.insertCell().textContent = record.record;
                        newRow.insertCell().textContent = record.record_type;
                        
                    });
                }
            } catch (error) {
                console.error(error);
            }
        });
        
        async function fetchRecordsByPatientId(id) {
            return new Promise((resolve, reject) => {
                let transaction = makeTransaction('Record', 'readonly');
                let store = transaction.objectStore('Record');
                let records = [];
        
                // Open a cursor to iterate through the object store
                let cursorRequest = store.openCursor();
        
                cursorRequest.onsuccess = (event) => {
                    let cursor = event.target.result;
                    console.log('success 3000: ', cursor);
                    if (cursor) {
                        let record = cursor.value;
                        if (record.patient_id === id) {
                            records.push(record);
                        }
                        cursor.continue(); // Move to the next record
                    } else {
                        resolve(records); // Resolve the promise with the filtered records
                    }
                };
        
                cursorRequest.onerror = (event) => {
                    reject(event.target.error); // Reject the promise if an error occurs
                };
            });
        }
        

        function clearTable(table) {
            console.log('existing rows number: ', table.rows.length);
            while (table.rows.length > 1) {
                console.log('number of rows: ', table.rows.length)
                table.deleteRow(1);
            }
        }

        document.getElementById('history').addEventListener('click', (ev) => {
            ev.preventDefault();
            buildTable();
            patientRecords();
        })

        // document.getElementById('notes').addEventListener('click', (ev) => {
        //     ev.preventDefault();
        //     notePage();
        // })
        function patientRecords()  {
            document.getElementById("services_box").style.display = "none";
            document.getElementById("table_box").style.display = "block";
            document.getElementById("search_bar").style.display = "inline-block";
            document.getElementById("container_1").style.display = "block";
            document.getElementById("patient_table").style.display = "block";
        }

        function drugsPage() {
            document.getElementById("services_box").style.display = "none";
            document.getElementById("table_box").style.display = "block";
            document.getElementById("container_2").style.display = "flex";
            document.getElementById("drugs_table").style.display = "block";
        }

        function doctorPage() {
            document.getElementById("services_box").style.display = "grid";
            document.getElementById("table_box").style.display = "none";
            document.getElementById("patient_table").style.display = "none";
            document.getElementById("drugs_table").style.display = "none";
            document.getElementById("container_1").style.display = "none";
            document.getElementById("container_2").style.display = "none";
            document.getElementById("container_3").style.display = 'none';
            document.getElementById("form_box").style.display = 'none';
        }

        function notePage() {
            console.log('notePage triggered');
            document.getElementById("services_box").style.display = "none";
            document.getElementById("table_box").style.display = "block";
            document.getElementById("patient_table").style.display = "none";
            document.getElementById("drugs_table").style.display = "none";
            document.getElementById("container_1").style.display = "none";
            document.getElementById("container_2").style.display = "none";
            document.getElementById("container_3").style.display = 'none';
            document.getElementById("form_box").style.display = 'grid';
            document.getElementById("search_bar").style.display = "none";
        }

        function patientHistory() {
            document.getElementById("table_box").style.display = "block";
            document.getElementById("search_bar").style.display = "none";
            document.getElementById("container_1").style.display = "none";
            document.getElementById("patient_table").style.display = "none";
            document.getElementById('container_3').style.display = 'block';
            document.getElementById('records_table').style.display = 'block';

        }

        window.addEventListener('load', function(){
            document.getElementById("services_box").style.backgroundImage = "url(images/backgrounds/4.png)";
            document.getElementById("services_box").style.gridTemplateColumns= "1fr 1fr";
        })

        document.querySelectorAll('.back_button').forEach(button => {
            button.addEventListener('click', function(event) {
                event.preventDefault();
                doctorPage();
            });
        })

        document.getElementById('submitButton').addEventListener('click', (ev) => {
            ev.preventDefault();
            console.log('button clicked');
            addRecord();
        });
        
        async function addRecord(){
            console.log('record initialised');
            const count_rec = await getCountOfRows('Record');
            let transaction = makeTransaction('Temporary', 'readonly');
            let store = transaction.objectStore('Temporary');
            
            let record_value = document.getElementById('medicalNote').value;
            console.log('medical note', record_value);
            let cursorRequest = store.openCursor();
            

            cursorRequest.onsuccess = (event) => {
                console.log('success');
                let cursor = event.target.result;
        
                if (cursor) {
                    let doctorId = cursor.value.id;
                    let doctorStoreName = cursor.value.table;
                    console.log('cursor is working');
        
                    if (doctorId && doctorStoreName) {
                        let doctorTransaction = makeTransaction(doctorStoreName, 'readonly');
                        let doctorStore = doctorTransaction.objectStore(doctorStoreName);
                        let doctorRequest = doctorStore.get(doctorId);
        
                        doctorRequest.onsuccess = (event) => {
                            const doctor = event.target.result;
                            console.log('doctor');
                            if (doctor) {
                                const doctorName = decryptData(doctor.first_name);
                                const doctorSurname = decryptData(doctor.last_name);
        
                                let patientTransaction = makeTransaction('Patient', 'readonly');
                                let patientStore = patientTransaction.objectStore('Patient');
                                let patientRequest = patientStore.get(temp);
                                console.log('selectedPatientd', temp);
        
                                patientRequest.onsuccess = (event) => {
                                    console.log('patient');
                                    const patient = event.target.result;
                                    console.log('patient: ', doctor);
                                    if (doctor) {
                                        const patientName = `${decryptData(patient.First)} ${decryptData(patient.Last)}`;
                                        const newRecord = {
                                            id: 'N0000' + (count_rec + 1) ,
                                            date_created: today,
                                            time_created: currentTime,
                                            doctor_id: doctorId,
                                            doctor: `${doctorName} ${doctorSurname}`,
                                            patient_id: temp,
                                            patient: patientName,
                                            record: record_value,
                                            record_type: 'Doctor note',
                                        }

                                        let recordTransaction = makeTransaction('Record', 'readwrite');
                                        let recordStore = recordTransaction.objectStore('Record');
                                        let request_record = recordStore.add(newRecord);

                                        request_record.onsuccess = () => {
                                            console.log('Record created');
                                        };

                                        request_record.onerror = (event) => {
                                            console.error('Error adding the record');
                                        }
                                         
                                    } else {
                                        console.error('Doctor not found');
                                    }
                                    
                                };
        
                                patientRequest.onerror = (event) => {
                                    console.error('Error fetching patient:', event.target.error);
                                };
                            } else {
                                console.error('Doctor not found');
                            }
                        };
        
                        doctorRequest.onerror = (event) => {
                            console.error('Error fetching doctor', event.target.error);
                        };
                    } else {
                        console.error('Key or Table not found in Temporary object store');
                    }
                } else {
                    console.log('No more entries!');
                }
            };
        
            cursorRequest.onerror = (event) => {
                console.error('Error retrieving values:', event.target.error);
            };
        
        
            cursorRequest.onerror = (event) => {
                console.error('Error retrieving values:', event.target.error);
            };
        
        }

        async function getCountOfRows(table){
            return new Promise((resolve, reject) => {
                let transaction = db.transaction([table], 'readonly');
                let objectStore = transaction.objectStore(table);
                let countRequest = objectStore.count();

                countRequest.onsuccess = function() {
                    resolve(countRequest.result);
                };

                countRequest.onerror = function() {
                    reject("Error in counting rows");
                };
            });
        };
    })();
});
