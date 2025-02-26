const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const sessionID = 'default-room';

let playerScores = {};
let rooms = {};

const allowedDeviceIds = new Set(['unique-device-id-2m89ye103']);

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('A player connected');

    // Listen for joinRoom event
    socket.on('joinRoom', (data) => {
        const { sessionID, deviceId } = data;

        // If the room doesn't exist, create it
        if (!rooms[sessionID]) {
            rooms[sessionID] = [];
        }

        // Initialize player scores for the room if necessary
        if (!playerScores[sessionID]) {
            playerScores[sessionID] = {};
        }

        rooms[sessionID].push(socket.id);
        socket.join(sessionID);
        console.log(`Player ${socket.id} joined room ${sessionID}`);
    });

    // Handle game over event
    socket.on('gameOver', (score) => {
        console.log(`Received gameOver event from ${socket.id} with score:`, score);

        // Initialize the playerScores if necessary
        if (!playerScores[sessionID]) {
            playerScores[sessionID] = {};
        }

        playerScores[sessionID][socket.id] = score;

        // If both players have finished the game
        if (Object.keys(playerScores[sessionID]).length === 2) {
            const [player1, player2] = Object.keys(playerScores[sessionID]);
            const score1 = playerScores[sessionID][player1];
            const score2 = playerScores[sessionID][player2];

            let winner;
            if (score1 > score2) {
                winner = player1;
            } else if (score2 > score1) {
                winner = player2;
            } else {
                winner = "It's a draw!";
            }

            io.to(sessionID).emit("gameResult", {
                winner,
                player1Score: score1,
                player2Score: score2,
                player1Id: player1,
                player2Id: player2
            });

            delete playerScores[sessionID];
            rooms[sessionID] = [];
        }
    });

    // Handle player disconnection
    socket.on('disconnect', () => {
        console.log(`Player ${socket.id} disconnected`);

        // Remove player from the room
        rooms[sessionID] = rooms[sessionID].filter(id => id !== socket.id);

        // Clean up if no players remain in the room
        if (rooms[sessionID].length === 0) {
            delete rooms[sessionID];
            delete playerScores[sessionID];
        }
    });

    // Handle setAIMode event
    socket.on('setAIMode', (data) => {
        const { aiMode, deviceId } = data;

        // Check if the deviceId is in the allowed list
        if (allowedDeviceIds.has(deviceId)) {
            console.log(`Device ${deviceId} is allowed to use AI mode.`);
            socket.emit('setAIMode', true); // Enable AI mode
        } else {
            console.log(`Device ${deviceId} is not allowed to use AI mode.`);
            socket.emit('setAIMode', false); // Disable AI mode
        }
    });
});

server.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
