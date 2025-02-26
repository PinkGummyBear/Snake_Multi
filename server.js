const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const sessionID = 'default-room'; // Force all players into this room

// Serve static files (your HTML, JS, and CSS)
app.use(express.static('public'));

let playerScores = {};
let rooms = {}; // To keep track of rooms and players in them

// When a player connects
io.on('connection', (socket) => {
    console.log('A player connected');

    // Use the fixed session ID for all players
    console.log(`Player connected to session: ${sessionID}`);

    // Ensure the room exists
    if (!rooms[sessionID]) {
        rooms[sessionID] = [];
    }
    if (!playerScores[sessionID]) {
        playerScores[sessionID] = {}; // Keep scores separate per session
    }

    // Add player to the room
    rooms[sessionID].push(socket.id);
    socket.join(sessionID);
    console.log(`Player ${socket.id} joined room ${sessionID}`);

    socket.on('gameOver', (score) => {
        console.log(`Received gameOver event from ${socket.id} with score:`, score);
    
        // Ensure session score object exists
        if (!playerScores[sessionID]) {
            playerScores[sessionID] = {}; // Create an empty object for this session
        }
    
        // Store the score for this player
        playerScores[sessionID][socket.id] = score;
        console.log(`Updated playerScores:`, playerScores);
    
        // If two players have finished, determine the result
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
    
            // Send results to both players
            io.to(sessionID).emit("gameResult", {
                winner,
                player1Score: score1,
                player2Score: score2,
                player1Id: player1,
                player2Id: player2
            });
    
            // Reset game state for next match
            delete playerScores[sessionID];
            rooms[sessionID] = [];
        }
    });
    
    

    socket.on('disconnect', () => {
        console.log(`Player ${socket.id} disconnected`);

        // Remove player from the room
        rooms[sessionID] = rooms[sessionID].filter(id => id !== socket.id);

        // If room is empty, clean up
        if (rooms[sessionID].length === 0) {
            delete rooms[sessionID];
            delete playerScores[sessionID];
        }
    });
});

// Start the server on port 3000
server.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
