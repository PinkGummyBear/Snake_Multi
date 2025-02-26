document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    const box = 20;
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const urlParams = new URLSearchParams(window.location.search);
    const sessionID = urlParams.get('session'); 

    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
        deviceId = 'unique-device-id-' + Math.random().toString(36).substr(2, 9);  // Generate a unique ID
        localStorage.setItem('deviceId', deviceId);  // Store it in localStorage
    }

    if (sessionID) {
        socket.emit('joinRoom', { sessionID, deviceId });  // Send both sessionID and deviceId as an object
    }

    socket.on('setAIMode', (isEnabled) => {
    aiMode = isEnabled; // Update local variable
    aiCheckbox.checked = isEnabled; // Ensure the checkbox updates
});

    
    
    const allowedDeviceId = "unique-device-id-2m89ye103"; 

// Hide the checkbox if this device isn't the allowed one
window.onload = function() {
    if (deviceId !== allowedDeviceId) {
        document.getElementById("aiCheckbox").style.display = "none";
    }
};

   
    let gameSpeed = 100;
    let snake = [];
    snake[0] = {
        x: canvasWidth / 2,
        y: canvasHeight / 2
    };

    let food = {
        x: Math.floor(Math.random() * (canvasWidth / box)) * box,
        y: Math.floor(Math.random() * (canvasHeight / box)) * box
    };

    let direction = 'RIGHT';
    let score = 0;
    let highScore = 0;
    let gameInterval;
    let snakeColor = 'green';
    let aiMode = false; // Variable to track AI mode

    const backgroundSound = new Audio('SoundEffect/background.mp3');
    const deathSound = new Audio('SoundEffect/death.mp3');
    const collectSound = new Audio('SoundEffect/collect.mp3');
    const customizeSound = new Audio('SoundEffect/customize.mp3');
    const buttonPressSound = new Audio('SoundEffect/buttonpress.mp3');

    function increaseSpeed() {
        if (score % 5 === 0) { // Every 15 points
            gameSpeed = Math.max(50, gameSpeed - 10); // Decrease interval time but not below 50ms
            clearInterval(gameInterval);
            gameInterval = setInterval(draw, gameSpeed);
        }
    }
    
    function playSound(sound) {
        sound.currentTime = 0;
        sound.play();
    }

    const soundVolumeInput = document.getElementById('soundVolume');
    soundVolumeInput.addEventListener('input', () => {
        const volume = parseFloat(soundVolumeInput.value);
        backgroundSound.volume = volume;
        deathSound.volume = volume;
        collectSound.volume = volume;
        customizeSound.volume = volume;
        buttonPressSound.volume = volume;
    });

    const aiCheckbox = document.getElementById('aiCheckbox');
    // Inside the aiCheckbox event listener
    aiCheckbox.addEventListener('change', (event) => {
        aiMode = event.target.checked;  // Update the global variable
        socket.emit('setAIMode', { aiMode, deviceId });
    });
    


    const snakeHeadImage = new Image();
    snakeHeadImage.src = 'character.png'; // Change snake head image path

    function drawSnakePart(part) {
        if (aiMode) {
            if (part === snake[0]) {
                if (snakeHeadImage.complete && snakeHeadImage.naturalHeight !== 0) {
                    ctx.drawImage(snakeHeadImage, part.x, part.y, box, box);
                } else {
                    ctx.fillStyle = snakeColor;
                    ctx.fillRect(part.x, part.y, box, box);
                }
            } else {
                ctx.fillStyle = snakeColor;
                ctx.fillRect(part.x, part.y, box, box);

                ctx.strokeStyle = 'black';
                ctx.strokeRect(part.x, part.y, box, box);
            }
        } else {
            ctx.fillStyle = snakeColor;
            ctx.fillRect(part.x, part.y, box, box);

            ctx.strokeStyle = 'black';
            ctx.strokeRect(part.x, part.y, box, box);
        }
    }

    function bfs(start, goal) {
        const queue = [{ pos: start, path: [] }];
        const visited = new Set();
        
        const directions = [
            { x: -box, y: 0, dir: 'LEFT' },
            { x: box, y: 0, dir: 'RIGHT' },
            { x: 0, y: -box, dir: 'UP' },
            { x: 0, y: box, dir: 'DOWN' }
        ];
    
        visited.add(`${start.x},${start.y}`);
    
        while (queue.length > 0) {
            let { pos, path } = queue.shift();
            
            if (pos.x === goal.x && pos.y === goal.y) {
                return path; // Return the shortest path to food
            }
    
            for (let dir of directions) {
                let next = { x: pos.x + dir.x, y: pos.y + dir.y };
                let nextKey = `${next.x},${next.y}`;
    
                if (
                    next.x >= 0 && next.x < canvasWidth &&
                    next.y >= 0 && next.y < canvasHeight &&
                    !visited.has(nextKey) &&
                    !collision(next, snake)
                ) {
                    visited.add(nextKey);
                    queue.push({ pos: next, path: [...path, dir.dir] }); // Store the path
                }
            }
        }
        return null; // No valid path found
    }
    
    

    function generateFood() {
        let validFoodPosition = false;
        while (!validFoodPosition) {
            food = {
                x: Math.floor(Math.random() * (canvasWidth / box)) * box,
                y: Math.floor(Math.random() * (canvasHeight / box)) * box
            };
            validFoodPosition = !collision(food, snake);
        }
    }
    
    function collision(head, array) {
        // Check if head collides with any part of the snake
        return array.some(part => head.x === part.x && head.y === part.y);
    }

    function moveAI() {
        let path = bfs(snake[0], food);
    
        if (path && path.length > 0) {
            direction = path[0]; // Move towards the first step in the path
        } else {
            console.warn("No valid path found, moving randomly");
            let possibleMoves = [
                { x: snake[0].x - box, y: snake[0].y, dir: 'LEFT' },
                { x: snake[0].x + box, y: snake[0].y, dir: 'RIGHT' },
                { x: snake[0].x, y: snake[0].y - box, dir: 'UP' },
                { x: snake[0].x, y: snake[0].y + box, dir: 'DOWN' }
            ].filter(move => !collision(move, snake));
    
            if (possibleMoves.length > 0) {
                let randomMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
                direction = randomMove.dir;
            }
        }
    }
    
    

    function draw() {
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
        snake.forEach(drawSnakePart);
    
        ctx.fillStyle = 'red';
        ctx.fillRect(food.x, food.y, box, box);
    
        let snakeX = snake[0].x;
        let snakeY = snake[0].y;
    
        if (aiMode) {
            moveAI();
        }
    
        if (direction === 'LEFT') snakeX -= box;
        if (direction === 'UP') snakeY -= box;
        if (direction === 'RIGHT') snakeX += box;
        if (direction === 'DOWN') snakeY += box;
    
        if (snakeX === food.x && snakeY === food.y) {
            score++;
            highScore = Math.max(highScore, score);
            document.getElementById('currentScore').textContent = score;
            document.getElementById('highScore').textContent = highScore;
    
            generateFood();
            playSound(collectSound);
    
            increaseSpeed(); // Call function to adjust speed
        } else {
            snake.pop();
        }
    
        let newHead = { x: snakeX, y: snakeY };
        if(collision(newHead, snake)) {
            socket.emit('gameOver', score); // Send the score only after death
            gameOver();
            return
        }
    
        if (
            snakeX < 0 ||
            snakeY < 0 ||
            snakeX >= canvasWidth ||
            snakeY >= canvasHeight ||
            collision(newHead, snake)
        ) {
            playSound(deathSound);
            gameOver();
            return;
        }
    
        snake.unshift(newHead);
    }

    function updateScore() {
        console.log("Updating score:", score);
        console.log("High Score:", highScore);
        
        const currentScoreEl = document.getElementById('currentScore');
        const highScoreEl = document.getElementById('highScore');
    
        if (currentScoreEl) {
            currentScoreEl.textContent = score;
        } else {
            console.error("currentScore element not found!");
        }
    
        if (highScoreEl) {
            highScoreEl.textContent = highScore;
        } else {
            console.error("highScore element not found!");
        }
    }

    document.getElementById('retryButton').addEventListener('click', () => {
        playSound(buttonPressSound); // Play button press sound
        resetGame(); // Restart the game
        startGame(); // Start the game again
    });

    document.getElementById('exitButton').addEventListener('click', () => {
        playSound(buttonPressSound); // Play button press sound
        document.getElementById('gameOverScreen').style.display = 'none'; // Hide game over screen
        document.getElementById('startMenu').style.display = 'block'; // Show start menu
    });

    function startGame() {
        playSound(backgroundSound);
        canvas.style.display = 'block';
        document.getElementById('startMenu').style.display = 'none';
        document.getElementById('scoreboard').style.display = 'block';
    
        gameSpeed = 100; 
        gameInterval = setInterval(draw, gameSpeed);
    
        score = 0;
        updateScore();
    }

    function openOptionsMenu() {
        canvas.style.display = 'none';
        document.getElementById('startMenu').style.display = 'none';
        document.getElementById('optionsMenu').style.display = 'block';
    }

    function backToStart() {
        canvas.style.display = 'none';
        document.getElementById('startMenu').style.display = 'block';
        document.getElementById('optionsMenu').style.display = 'none';
    }

    function gameOver() {
        clearInterval(gameInterval);
        backgroundSound.pause();  // Stop background music
        backgroundSound.currentTime = 0; // Reset it
        playSound(deathSound);
        document.getElementById('gameOverScreen').style.display = 'block';
        document.getElementById('finalScore').textContent = score; // Update final score
        document.getElementById('finalHighScore').textContent = highScore; // Update high score display
    
        // Hide canvas and start menu
        document.getElementById('gameCanvas').style.display = 'none';
        document.getElementById('startMenu').style.display = 'none';
    }

    socket.on('gameResult', (data) => {
        console.log('Received gameResult:', data);  // Debugging line to see the received data
    
        // Ensure the result corresponds to the current player
        if (data.player1Id === socket.id || data.player2Id === socket.id) {
            if (data.winner === socket.id) {
                alert(`You won! Your score: ${data[data.player1Id === socket.id ? 'player1Score' : 'player2Score']}, Opponent's score: ${data[data.player1Id === socket.id ? 'player2Score' : 'player1Score']}`);
            } else if (data.winner === "It's a draw!") {
                alert(`It's a draw! Your score: ${data[data.player1Id === socket.id ? 'player1Score' : 'player2Score']}, Opponent's score: ${data[data.player1Id === socket.id ? 'player2Score' : 'player1Score']}`);
            } else {
                alert(`You lost! Your score: ${data[data.player1Id === socket.id ? 'player1Score' : 'player2Score']}, Opponent's score: ${data[data.player1Id === socket.id ? 'player2Score' : 'player1Score']}`);
            }
        }
    });

    function resetGame() {
        snake = [{
            x: canvasWidth / 2,
            y: canvasHeight / 2
        }];
        direction = 'RIGHT';
        score = 0;
        food = {
            x: Math.floor(Math.random() * (canvasWidth / box)) * box,
            y: Math.floor(Math.random() * (canvasHeight / box)) * box
        };
    
        // Stop background music
        backgroundSound.pause();
        backgroundSound.currentTime = 0;
    
        // Hide game over screen
        document.getElementById('gameOverScreen').style.display = 'none';
    
        // Display start menu
        document.getElementById('startMenu').style.display = 'block';
        document.getElementById('scoreboard').style.display = 'none'; // Hide scoreboard
        document.getElementById('currentScore').textContent = score; // Reset current score display
    }

    document.getElementById('startButton').addEventListener('click', () => {
        playSound(buttonPressSound); // Play button press sound
        resetGame(); // Reset the game
        startGame(); // Start the game
    });

    document.getElementById('optionsButton').addEventListener('click', () => {
        playSound(buttonPressSound); // Play button press sound
        openOptionsMenu();
    });

    document.getElementById('backToStartButton').addEventListener('click', () => {
        playSound(buttonPressSound); // Play button press sound
        backToStart();
    });

    document.addEventListener('keydown', directionHandler);

    function directionHandler(event) {
        const key = event.key;
        if ((key === 'ArrowLeft' || key === 'a') && direction !== 'RIGHT') direction = 'LEFT';
        if ((key === 'ArrowUp' || key === 'w') && direction !== 'DOWN') direction = 'UP';
        if ((key === 'ArrowRight' || key === 'd') && direction !== 'LEFT') direction = 'RIGHT';
        if ((key === 'ArrowDown' || key === 's') && direction !== 'UP') direction = 'DOWN';
    }

    function collision(head, array) {
    // Check if head collides with the canvas boundaries
    if (head.x < 0 || head.y < 0 || head.x >= canvasWidth || head.y >= canvasHeight) {
        return true;
    }

    // Check if head collides with the snake's body (excluding the last part being removed)
    for (let i = 1; i < array.length; i++) {
        if (head.x === array[i].x && head.y === array[i].y) {
            return true;
        }
    }

    return false;
}


    // Change snake color when selected from the options menu
    document.getElementById('snakeColorSelect').addEventListener('change', function() {
        snakeColor = this.value;
        playSound(customizeSound);
    });

    updateScore();

    console.log('Your device ID is:', deviceId);
});
