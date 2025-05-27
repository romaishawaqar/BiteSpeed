// controllers/identifyController.js
import { pool } from '../config/database.js';

export const identify = async (req, res) => {
  const client = await pool.connect();

  try {
    let { email, phonenumber } = req.body;

    email = email ? email.trim().toLowerCase() : null;
    phonenumber = phonenumber ? phonenumber.trim() : null;

    if (!email && !phonenumber) {
      return res.status(400).json({ message: 'Email or phonenumber required' });
    }

    await client.query('BEGIN');

    // Get all matching contacts
    let { rows: contacts } = await client.query(
      `SELECT * FROM contact WHERE email = $1 OR phonenumber = $2`,
      [email, phonenumber]
    );

    // No contacts found - insert as primary
    if (contacts.length === 0) {
      const { rows } = await client.query(
        `INSERT INTO contact (email, phonenumber, linkprecedence, createdat, updatedat)
         VALUES ($1, $2, 'primary', NOW(), NOW()) RETURNING id`,
        [email, phonenumber]
      );

      await client.query('COMMIT');
      return res.status(200).json({
        contact: {
          primaryContactId: rows[0].id,
          emails: email ? [email] : [],
          phonenumbers: phonenumber ? [phonenumber] : [],
          secondaryContactIds: [],
        },
      });
    }

    // 🔁 Build full cluster (transitive)
    const clusterIds = new Set(contacts.map(c => c.id));
    let addedNew;
    do {
      addedNew = false;
      const { rows: found } = await client.query(
        `SELECT * FROM contact WHERE id = ANY($1) OR linkedid = ANY($1)`,
        [[...clusterIds]]
      );
      for (const c of found) {
        if (!clusterIds.has(c.id)) {
          clusterIds.add(c.id);
          addedNew = true;
        }
        if (c.linkedid && !clusterIds.has(c.linkedid)) {
          clusterIds.add(c.linkedid);
          addedNew = true;
        }
      }
    } while (addedNew);

    const { rows: clusterContacts } = await client.query(
      `SELECT * FROM contact WHERE id = ANY($1)`,
      [[...clusterIds]]
    );

    // Identify primary (oldest by createdAt)
    let primaryContact = clusterContacts.reduce((a, b) =>
      new Date(a.createdat) < new Date(b.createdat) ? a : b
    );
    const primaryId = primaryContact.id;

    if (primaryContact.linkprecedence !== 'primary') {
      await client.query(
        `UPDATE contact SET linkprecedence = 'primary', linkedid = NULL, updatedat = NOW() WHERE id = $1`,
        [primaryId]
      );
    }

    // Demote other primaries
    for (const contact of clusterContacts) {
      if (contact.id !== primaryId && contact.linkprecedence === 'primary') {
        await client.query(
          `UPDATE contact SET linkprecedence = 'secondary', linkedid = $1, updatedat = NOW() WHERE id = $2`,
          [primaryId, contact.id]
        );
      }
    }

    // Insert new contact if not already present
    const emailExists = email && clusterContacts.some(c => c.email === email);
    const phoneExists = phonenumber && clusterContacts.some(c => c.phonenumber === phonenumber);

    if ((!emailExists && email) || (!phoneExists && phonenumber)) {
      await client.query(
        `INSERT INTO contact (email, phonenumber, linkprecedence, linkedid, createdat, updatedat)
         VALUES ($1, $2, 'secondary', $3, NOW(), NOW())`,
        [email, phonenumber, primaryId]
      );
    }

    // 🔁 Rebuild final cluster after changes
    const finalClusterIds = new Set([primaryId]);
    do {
      addedNew = false;
      const { rows: found } = await client.query(
        `SELECT * FROM contact WHERE id = ANY($1) OR linkedid = ANY($1)`,
        [[...finalClusterIds]]
      );
      for (const c of found) {
        if (!finalClusterIds.has(c.id)) {
          finalClusterIds.add(c.id);
          addedNew = true;
        }
        if (c.linkedid && !finalClusterIds.has(c.linkedid)) {
          finalClusterIds.add(c.linkedid);
          addedNew = true;
        }
      }
    } while (addedNew);

    const { rows: finalContacts } = await client.query(
      `SELECT * FROM contact WHERE id = ANY($1)`,
      [[...finalClusterIds]]
    );

    const emails = new Set();
    const phonenumbers = new Set();
    const secondaryContactIds = [];

    finalContacts.forEach(c => {
      if (c.email) emails.add(c.email);
      if (c.phonenumber) phonenumbers.add(c.phonenumber);
      if (c.linkprecedence === 'secondary') secondaryContactIds.push(c.id);
    });

    await client.query('COMMIT');

    return res.status(200).json({
      contact: {
        primaryContactId: primaryId,
        emails: Array.from(emails),
        phonenumbers: Array.from(phonenumbers),
        secondaryContactIds,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in identify:', error);
    return res.status(500).json({ message: 'Server Error', error: error.message });
  } finally {
    client.release();
  }
};

export default identify;
