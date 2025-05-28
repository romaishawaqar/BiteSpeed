This project implements a contact deduplication and identification API. 
It processes user contact information (email and phone number), clusters related contacts, and determines primary and secondary contact relationships using a PostgreSQL database.

 -Features-
Accepts contact identification requests with email and/or phonenumber.
Automatically clusters related contacts based on matches.
Maintains a single primary contact per cluster.
Creates secondary contacts when duplicates are identified.
Ensures transitive linking (all related contacts are grouped together).

-Logic Overview-
If no contact exists with the given email or phone → create as primary.
If any matches are found → build a transitive cluster (direct or indirect links).
Determine the oldest contact as the primary.
All others are converted to secondary, linked to the primary.
Insert a new contact as secondary if the given email or phone was not found in the cluster.
Return the full cluster: all unique emails, phone numbers, and secondary IDs.

-Technologies Used-
Node.js
Express
PostgreSQL
pg (node-postgres)

-API Documentation-
Endpoint: POST /identify
http://localhost:5000/identify

 -How to Run the Project-
 1. cd backend
 2. npm install
 3. Set Up PostgreSQL Database
    Open pgAdmin.
    Create a new database (e.g., bitespeed_db).
    Create the required table using this SQL:

          CREATE TABLE contact (
        id SERIAL PRIMARY KEY,
        phonenumber VARCHAR(15),
        email VARCHAR(100),
        linkedid INTEGER,
        linkprecedence VARCHAR(10) CHECK (linkPrecedence IN ('primary', 'secondary')),
        createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deletedat TIMESTAMP
      );

   Note:
   All emails and phone numbers are stored in lowercase and trimmed.
   linkprecedence defines whether a contact is the primary or a secondary entry.
   linkedid points to the id of the primary contact if the current one is secondary.
    
 4. Set Environment Variables
   Create a .env file in the backend folder and add details from POSTGRES SQL:
    DB_HOST=localhost
    DB_PORT=5432
    DB_USER=YOUR_USER
    DB_PASSWORD=YOUR_PASSWORD
    DB_NAME=YOUR_DB_NAME

5. Run the Project
   package.json should include:
   "type": "module",
    "scripts": {
      "dev": "nodemon index.js"
    }
run this command in terminal-
npm run dev


