document.addEventListener('DOMContentLoaded', function(){
    const secretKey = 'o43ryr3t9v2671c340c87tyoer87xdyh'; // Key for encryption
    const IV = CryptoJS.enc.Hex.parse('000102030405060708090a0b0c0d0e0f');// Initialization Vector   CryptoJS.lib.WordArray.random(16);
    const IDB = (function init() {
        console.log('initialising');
        const today = new Date().toISOString().split('T')[0];
        const currentTime = new Date().toLocaleTimeString();
        const appDateInput = document.getElementById('app_date');
        const timeSlotDropdown = document.getElementById('time_slot');
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
                    displayPatientNameOnLoad();
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
                
                const dataString = data.toString(); 
        
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

        document.getElementById('logoutLink').addEventListener('click', function(event) {
            event.preventDefault();
            logout();
        });

        document.getElementById('appointments').addEventListener('click', function(event) {
            event.preventDefault();
            show_Box('appointment_box');
            populateDoctorDropdown();
        })

        document.querySelectorAll('.back_button').forEach(button => {
            button.addEventListener('click', function(event) {
                event.preventDefault();
                patientPage();
            });
        })

        document.getElementById('app_date').setAttribute('min', today);

        document.getElementById('booking_form'),addEventListener('submit', (ev) => {
            ev.preventDefault();
            bookAppointment();
        })

        document.getElementById('prescription').addEventListener('click', (ev) => {
            ev.preventDefault();
            show_Box('prescription_box');
            displayMedicineData();
        })

        document.getElementById('records').addEventListener('click', (ev) => {
            ev.preventDefault();
            show_Box('records_box');
            displayRecords();
        })

        appDateInput.addEventListener('input', async function(event) {
            const selectedDate = appDateInput.value;
            await updateTimeSlotsDropdown();
        })

        window.addEventListener('load', function(){
            document.getElementById("services_box").style.gridTemplateColumns= "1fr 1fr 1fr";
        })
        
        // function show_Box(a) passes a parameter for respective 'box' I want to appear on the screen,
        // through changing setting of its CSS style for display from 'none' to appropriate one.
        
        appDateInput.addEventListener('input', function(event) {
            updateTimeSlotsDropdown();
        })

        function show_Box(a) {
            document.getElementById("services_box").style.display = "none";
            document.getElementById(a).style.display = "block";
        }
    
        // function called out on the 'BACK' button - it reverses display settings, so i can change the 
        // visibility of the page content rather than loading a whole new page.
        
        function patientPage() {
            console.log('patient page function treiggered');
            document.getElementById("services_box").style.display = "grid";
            document.getElementById('news_box').style.display = "none";
            document.getElementById('prescription_box').style.display = "none";
            document.getElementById('records_box').style.display = "none";
            document.getElementById('opening_times_box').style.display = "none";
            document.getElementById('contact_box').style.display = "none";
            document.getElementById('appointment_box').style.display = "none";

        }

        function makeTransaction(tableName, mode) {
            let transaction = db.transaction(tableName, mode);
            transaction.onerror = (err) => {
                console.warn(err);
            };
            return transaction;
        };

        async function populateDoctorDropdown() {
            const doctorDropdown = document.getElementById('doc_dropdown');
            let transaction = makeTransaction('Doctor', 'readonly');
            let store = transaction.objectStore('Doctor');
            let getRequest = store.getAll();
        
            getRequest.onsuccess = async (ev) => {
                let doctors = ev.target.result;
                for (const doctor of doctors) {
                    const decryptedFirstName = await decryptData(doctor.first_name);
                    const decryptedLastName = await decryptData(doctor.last_name);
        
                    let option = document.createElement('option');
                    option.value = doctor.id;
        
                    // Populate the dropdown with decrypted doctor's name
                    option.textContent = `${decryptedFirstName} ${decryptedLastName}`;
                    doctorDropdown.appendChild(option);
                }
            };
        
            // Error handling...
        }
        

        async function bookAppointment() {
            const count_app = await getCountOfRows('Appointment');
            const count_rec = await getCountOfRows('Record');
            const selectedDoctorId = document.getElementById('doc_dropdown').value;
            const appointmentDate = document.getElementById('app_date').value;
            const appointmentTime = document.getElementById('time_slot').value;
            const appointmentNotes = document.getElementById('app_notes').value;
        
            let transaction = makeTransaction(['Temporary'], 'readonly');
            let store = transaction.objectStore('Temporary');
            let cursorRequest = store.openCursor();
        
            cursorRequest.onsuccess = (event) => {
                let cursor = event.target.result;
        
                if (cursor) {
                    let patientId = cursor.value.id;
                    let patientStoreName = cursor.value.table;
        
                    if (patientId && patientStoreName) {
                        let patientTransaction = makeTransaction(patientStoreName, 'readonly');
                        let patientStore = patientTransaction.objectStore(patientStoreName);
                        let patientRequest = patientStore.get(patientId);
        
                        patientRequest.onsuccess = (event) => {
                            const patient = event.target.result;
                            if (patient) {
                                const patientName = decryptData(patient.First);
                                const patientSurname = decryptData(patient.Last);
        
                                let doctorTransaction = makeTransaction('Doctor', 'readonly');
                                let doctorStore = doctorTransaction.objectStore('Doctor');
                                let doctorRequest = doctorStore.get(Number(selectedDoctorId));
                                console.log('selectedDocId', selectedDoctorId);
        
                                doctorRequest.onsuccess = (event) => {
                                    const doctor = event.target.result;
                                    console.log('doctor: ', doctor);
                                    if (doctor) {
                                        const doctorName = `${decryptData(doctor.first_name)} ${decryptData(doctor.last_name)}`;
        
                                        const newAppointment = {
                                            id: 'A00' + count_app,
                                            doctor_id: selectedDoctorId,
                                            doctor: doctorName,
                                            date: appointmentDate,
                                            timeslot: appointmentTime,
                                            notes: appointmentNotes,
                                            patient_id: patientId,
                                            patient: `${patientName} ${patientSurname}`,
                                        };
        
                                        let appointmentTransaction = makeTransaction('Appointment', 'readwrite');
                                        let appointmentStore = appointmentTransaction.objectStore('Appointment');
                                        let request = appointmentStore.add(newAppointment);
        
                                        request.onsuccess = () => {
                                            console.log('Appointment booked successfully');
                                            // Further actions or UI updates...
                                        };
        
                                        request.onerror = (event) => {
                                            console.error('Error adding appointment:', event.target.error);
                                        };
                                        
                                        const newRecord = {
                                            id: 'A0000' + count_rec,
                                            date_created: today,
                                            time_created: currentTime,
                                            doctor_id: selectedDoctorId,
                                            doctor: doctorName,
                                            patient_id: patientId,
                                            patient: `${patientName} ${patientSurname}`,
                                            record: `${appointmentDate} ${appointmentTime} ${appointmentNotes}`,
                                            record_type: 'Appointment',
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
        
                                doctorRequest.onerror = (event) => {
                                    console.error('Error fetching doctor:', event.target.error);
                                };
                            } else {
                                console.error('Patient not found');
                            }
                        };
        
                        patientRequest.onerror = (event) => {
                            console.error('Error fetching patient:', event.target.error);
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

            // Function to retrieve appointments for a specific date
        async function getAppointmentsForDate(date) {
            return new Promise((resolve, reject) => {
                const transaction = makeTransaction('Appointment', 'readonly');
                const store = transaction.objectStore('Appointment');
                const index = store.index('date');

                const range = IDBKeyRange.only(date);
                // console.log('index', index, 'range', range);
                const getAppointments = index.getAll(range);

                getAppointments.onsuccess = (event) => {
                    const appointments = event.target.result || [];
                    // console.log('appointments', appointments);
                    resolve(appointments);
                };

                getAppointments.onerror = (event) => {
                    reject(event.target.error);
                };
            });
        }

                // Function to retrieve booked time slots for a specific date
        async function getBookedTimeSlots(selectedDate) {
            try {
                const appointments = await getAppointmentsForDate(selectedDate);
                console.log('appointments', appointments);
                const bookedTimeSlots = appointments.map(appointment => appointment.timeslot);
                console.log('booked time slots: ', bookedTimeSlots);
                return bookedTimeSlots;
            } catch (error) {
                console.error('Error fetching booked time slots:', error);
                return [];
            }
        }

        async function updateTimeSlotsDropdown() {
            const dateInput = document.getElementById('app_date');
            const timeSlotDropdown = document.getElementById('time_slot');
            
            async function updateSlotsForSelectedDate(selectedDate) {
                const timeSlots = generateTimeSlots();
                const bookedTimeSlots = await getBookedTimeSlots(selectedDate);
                console.log('booked times slots = ', bookedTimeSlots);
                
                timeSlots.forEach(slot => {
                    console.log(' slot jest: ', slot.time);
                    if (bookedTimeSlots.includes(slot.time)) {
                        slot.available = false;
                    }
                });

                timeSlotDropdown.innerHTML = '';

                timeSlots.forEach(slot => {
                    const option = document.createElement('option');
                    option.value = slot.time;
                    option.textContent = slot.time;
                    console.log('option = ', option, 'slot = ', slot);
                    if (slot.available) {
                        timeSlotDropdown.appendChild(option);
                    }
                });
            }

            dateInput.addEventListener('change', async function () {
                const selectedDate = dateInput.value;
                await updateSlotsForSelectedDate(selectedDate);
            });

            const initialDate = dateInput.value;
            await updateSlotsForSelectedDate(initialDate);
        }

        function generateTimeSlots() {
            const times = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];
            const timeSlots = times.map(time => ({ time, available: true }));
            return timeSlots;
        }

        // Function to display medicine data in the table
        async function displayMedicineData() {
            const medicineTableBody = document.getElementById('drug_table');
            medicineTableBody.innerHTML = ''; // Clear previous data
            
            const transaction = makeTransaction('Medicine', 'readonly');
            const store = transaction.objectStore('Medicine');
            const getAllMedicine = store.getAll();
        
            getAllMedicine.onsuccess = async function(event) {
                const medicines = event.target.result;
                for (const medicine of medicines) {
                    const row = document.createElement('tr');
        
                    // Decrypt the medicine name
                    const decryptedMedicineName = await decryptData(medicine.Drug);
        
                    const medicineNameCell = document.createElement('td');
                    medicineNameCell.textContent = decryptedMedicineName;
        
                    const requestButtonCell = document.createElement('td');
                    const requestButton = document.createElement('button');
                    requestButton.textContent = 'Request';
                    requestButton.addEventListener('click', async function() {
                        // Pass the decrypted medicine name to the request function
                        requestMedicine(decryptedMedicineName);
                    });
        
                    requestButtonCell.appendChild(requestButton);
                    row.appendChild(medicineNameCell);
                    row.appendChild(requestButtonCell);
                    medicineTableBody.appendChild(row);
                }
            };
        
            getAllMedicine.onerror = function(event) {
                console.error('Error retrieving medicine data:', event.target.error);
            };
        }
        
        
        // Function to handle the request for medicine
        async function requestMedicine(medicineName) {
            try {
                const count_pres = await getCountOfRows('Prescription');
                const count_rec = await getCountOfRows('Record');
                const today = new Date().toISOString().split('T')[0];
                const currentTime = new Date().toLocaleTimeString();
        
                const transaction = makeTransaction('Temporary', 'readonly');
                transaction.onerror = function(event) {
                    console.error('Transaction error:', event.target.error);
                };
        
                const store = transaction.objectStore('Temporary');
                const cursorRequest = store.openCursor();
        
                cursorRequest.onsuccess = async (event) => {
                    const cursor = event.target.result;
        
                    if (cursor) {
                        const patientId = cursor.value.id;
                        const patientStoreName = cursor.value.table;
        
                        if (patientId && patientStoreName) {
                            const patientTransaction = makeTransaction(patientStoreName, 'readonly');
                            patientTransaction.onerror = function(event) {
                                console.error('Patient transaction error:', event.target.error);
                            };
        
                            const patientStore = patientTransaction.objectStore(patientStoreName);
                            const patientRequest = patientStore.get(patientId);
        
                            patientRequest.onsuccess = async (event) => {
                                const patient = event.target.result;
        
                                if (patient) {
                                    const patientName = decryptData(patient.First);
                                    const patientSurname = decryptData(patient.Last);
        
                                    const newPrescription = {
                                        id: 'PR00' + count_pres,
                                        date_created: today,
                                        time_created: currentTime,
                                        patient_id: patientId,
                                        patient: `${patientName} ${patientSurname}`,
                                        prescription: `${medicineName}`,
                                        status: 'requested',
                                    };
        
                                    const prescriptionTransaction = makeTransaction('Prescription', 'readwrite');
                                    prescriptionTransaction.onerror = function(event) {
                                        console.error('Prescription transaction error:', event.target.error);
                                    };
        
                                    const prescriptionStore = prescriptionTransaction.objectStore('Prescription');
                                    await prescriptionStore.add(newPrescription);
        
                                    const newRecord = {
                                        id: 'A0000' + count_rec,
                                        date_created: today,
                                        time_created: currentTime,
                                        doctor_id: 'not required',
                                        doctor: 'not required',
                                        patient_id: patientId,
                                        patient: `${patientName} ${patientSurname}`,
                                        record: `${medicineName} requested`,
                                        record_type: 'Prescription',
                                    };
        
                                    const recordTransaction = makeTransaction('Record', 'readwrite');
                                    recordTransaction.onerror = function(event) {
                                        console.error('Record transaction error:', event.target.error);
                                    };
        
                                    const recordStore = recordTransaction.objectStore('Record');
                                    await recordStore.add(newRecord);
        
                                    console.log(`Requested medicine: ${medicineName}`);
                                } else {
                                    console.error('Patient not found');
                                }
                            };
                        } else {
                            console.error('Key or Table not found in Temporary object store');
                        }
                    } else {
                        console.log('No more entries!');
                    }
                };
            } catch (error) {
                console.error('Error:', error);
            }
        }
        
        

        // Call the function to display medicine data when needed
        //displayMedicineData();
        
        

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

        async function displayRecords() {
            try {
                const transaction = makeTransaction('Temporary', 'readonly');
                transaction.onerror = function (event) {
                    console.error('Transaction error:', event.target.error);
                };
        
                transaction.onabort = function (event) {
                    console.error('Transaction aborted:', event.target.error);
                };
        
                transaction.oncomplete = function (event) {
                    console.log('Transaction completed successfully.');
                };
        
                const store = transaction.objectStore('Temporary');
                const cursorRequest = store.openCursor();
        
                cursorRequest.onsuccess = async (event) => {
                    const cursor = event.target.result;
        
                    if (cursor) {
                        const patientId = cursor.value.id;
                        const patientStoreName = cursor.value.table;
                        console.log('id:', patientId, 'name:', patientStoreName);
        
                        const records = await getRecordsByPatientId(patientId);
                        console.log('Records:', records);
        
                        const tableBody = document.getElementById('records_table');
                        tableBody.innerHTML = ''; // Clear previous data
        
                        records.forEach(record => {
                            const row = document.createElement('tr');
        
                            const filteredData = Object.entries(record).filter(([key]) => !['id', 'doctor_id', 'patient_id'].includes(key));
                            filteredData.forEach(([key, value]) => {
                                const cell = document.createElement('td');
                                cell.textContent = value;
                                row.appendChild(cell);
                            });
        
                            tableBody.appendChild(row);
                        });
        
                    } else {
                        console.log('No more records found.');
                    }
                };
            } catch (error) {
                console.error('Error getting patient key from temp:', error);
            }
        }
             
        async function getRecordsByPatientId(patientId) {
            return new Promise((resolve, reject) => {
                const transaction = makeTransaction('Record', 'readonly');
                const store = transaction.objectStore('Record');
                const index = store.index('patient_id');
        
                const getRequest = index.getAll(patientId);
                getRequest.onsuccess = (event) => {
                    const records = event.target.result;
                    resolve(records);
                };
        
                getRequest.onerror = (event) => {
                    reject(event.target.error);
                };
            });
        }
        
        // Function to display the patient's name upon page load
        async function displayPatientNameOnLoad() {
            try {
                const transaction = makeTransaction('Temporary', 'readonly');
                const store = transaction.objectStore('Temporary');
                const cursorRequest = store.openCursor();
        
                cursorRequest.onsuccess = async (event) => {
                    const cursor = event.target.result;
        
                    if (cursor) {
                        const patientId = cursor.value.id;
                        const patientStoreName = cursor.value.table;
                        console.log('id:', patientId, 'name:', patientStoreName);
        
                        const patientFullName = await getPatientFullName(patientId, patientStoreName);
                        displayPatientNameInHTML(patientFullName);
                    } else {
                        console.log('No records found.');
                    }
                };
        
                cursorRequest.onerror = function (event) {
                    console.error('Cursor request error:', event.target.error);
                };
            } catch (error) {
                console.error('Error displaying patient name:', error);
            }
        }   

        async function getPatientFullName(patientId, patientStoreName) {
            console.log('id: ', patientId, 'table: ', patientStoreName);
            return new Promise((resolve, reject) => {
                const transaction = makeTransaction(patientStoreName, 'readonly');
                const store = transaction.objectStore(patientStoreName);
                const getRequest = store.get(patientId);
        
                getRequest.onsuccess = (event) => {
                    const patientData = event.target.result;
                    console.log('data: ', patientData);
                    if (patientData) {
                        const fullName = `${decryptData(patientData.First)} ${decryptData(patientData.Last)}`;
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

        function displayPatientNameInHTML(patientFullName) {
            const welcomeMessage = document.querySelector('.main_tag h1');
            if (welcomeMessage) {
                welcomeMessage.textContent = `Welcome ${patientFullName}`;
            } else {
                console.error("Welcome message element not found.");
            }
        }
        
    })();
});
