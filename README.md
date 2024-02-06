Courserwork requirements:

Coursework target was to design a website for GP Surgery using IndexedDB for data storage and manipulation. 
Below are the requirements given for that piece of coursework: 


IndexedDB database in use and managed 
1.	Creation of DB, with JSON data from server 
  -	Add 
  -	Delete 
  -	Update 
2. Patient, Admin and Doctor account types and permissions 
  -	Patient account type and permissions 
  -	Admin account type and permissions 
  -	Doctor account type and permissions 
3. Admin functionality (Can manage patient’s information name, address, DOB etc.) 
  -	Can add details of patient (name, address, telephone, DOB, NHS number)
  -	Can update/delete 
4. Patient functionality (Can book appointments, look at medication instructions etc.) 
  -	Can book appointments and request prescriptions 
  -	Can see stored information and medical notes 
5. Doctor functionality (Review patient history, medical notes, medicines) 
  -	Can look at patient history, notes 
  -	Can add to patient history, notes and medicines (prescriptions) 
6. Validation checks and basic security (input sanitisation, password, email etc.)
  -	Accounts are password protected 
  -	Inputs are sanitised, password reaches applied security standard, email input is valid 
7. Security (Encryption) 
  -	Encryption modules used from crypto lib or similar, must be AES 256 or better 
  -	Encryption applied to passwords and other data 
  -	Decryption and data in use after storage 
8. Advanced 
  -	JSON data collected from server and processed 
  -	Service / Web workers and threads used 
