const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const { Server } = require('socket.io');

// MySQL Connection
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'clinic_db',
});

// Store Chat Message
async function storeChat(req, res) {
    console.log('req------>', req);
    const { sender_id, receiver_id, message } = req.body;

    if (!sender_id || !receiver_id || !message) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    try {
        const query = `INSERT INTO chats (sender_id, receiver_id, message) VALUES (?, ?, ?)`;
        const [result] = await db.execute(query, [sender_id, receiver_id, message]);

        const chat = {
            id: result.insertId,
            sender_id,
            receiver_id,
            message,
            timestamp: new Date(),
            is_read: false,
        };

        // io.emit('new-chat-message', chat);
        req.io.emit('new-chat-message', chat);

        res.status(201).json({ success: true, message: 'Chat stored successfully.', chat });
    } catch (error) {
        console.error('Error storing chat:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
}

// Fetch Chat Messages with Pagination
async function fetchChats(req, res) {
    const { user1, user2, page = 1, limit = 10 } = req.query;

    if (!user1 || !user2) {
        return res.status(400).json({ error: 'Both user1 and user2 are required.' });
    }

    const offset = (page - 1) * limit;

    try {
        const query = `
            SELECT * FROM chats
            WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
            ORDER BY timestamp ASC
            LIMIT ? OFFSET ?
        `;
        const [rows] = await db.execute(query, [user1, user2, user2, user1, parseInt(limit), parseInt(offset)]);

        res.status(200).json({ success: true, chats: rows });
    } catch (error) {
        console.error('Error fetching chats:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
}

// Mark Messages as Read
async function markMessagesAsRead(req, res) {
    const { user1, user2 } = req.body;

    if (!user1 || !user2) {
        return res.status(400).json({ error: 'Both user1 and user2 are required.' });
    }

    try {
        const query = `
            UPDATE chats
            SET is_read = TRUE
            WHERE sender_id = ? AND receiver_id = ? AND is_read = FALSE
        `;
        const [result] = await db.execute(query, [user2, user1]);

        res.status(200).json({ success: true, updatedCount: result.affectedRows });
    } catch (error) {
        console.error('Error marking messages as read:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
}

// Define Routes
router.post('/chat', storeChat);
router.get('/chat', fetchChats);
router.post('/chat/mark-read', markMessagesAsRead);

module.exports = router;
