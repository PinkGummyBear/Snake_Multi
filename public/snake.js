document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    const box = 20;
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const urlParams = new URLSearchParams(window.location.search);
    const sessionID = urlParams.get('session'); 

    if (sessionID) {
        socket.emit('joinRoom', sessionID);
    }

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
    let highScore = 0; // Initialize high score variable
    let gameInterval;
    let snakeColor = 'green';
  
    const backgroundSound = new Audio('SoundEffect/background.mp3');
    const deathSound = new Audio('SoundEffect/death.mp3');
    const collectSound = new Audio('SoundEffect/collect.mp3');
    const customizeSound = new Audio('SoundEffect/customize.mp3');
    const buttonPressSound = new Audio('SoundEffect/buttonpress.mp3');
  
    function backToStart() {
        canvas.style.display = 'none';
        document.getElementById('startMenu').style.display = 'block';
        document.getElementById('optionsMenu').style.display = 'none';
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

    const snakeHeadImage = new Image();
    snakeHeadImage.src = 'snake_head.png'; // Path to your snake head image
  
    function drawSnakePart(part) {
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
    }

    function draw() {
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        snake.forEach(drawSnakePart);
        ctx.fillStyle = 'red';
        ctx.fillRect(food.x, food.y, box, box);

        let snakeX = snake[0].x;
        let snakeY = snake[0].y;

        if (direction === 'LEFT') snakeX -= box;
        if (direction === 'UP') snakeY -= box;
        if (direction === 'RIGHT') snakeX += box;
        if (direction === 'DOWN') snakeY += box;

        if (snakeX === food.x && snakeY === food.y) {
            score++;
            food = { x: Math.floor(Math.random() * (canvasWidth / box)) * box, y: Math.floor(Math.random() * (canvasHeight / box)) * box };
            updateScore();
        } else {
            snake.pop();
        }

        let newHead = { x: snakeX, y: snakeY };
        if (collision(newHead, snake)) {
            socket.emit('gameOver', score); // Send the score only after death
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
        playSound(buttonPressSound);
        resetGame();
        startGame();
    });

    document.getElementById('exitButton').addEventListener('click', () => {
        playSound(buttonPressSound);
        document.getElementById('gameOverScreen').style.display = 'none';
        resetGame();
        document.getElementById('startMenu').style.display = 'block';
    });

    function startGame() {
        playSound(backgroundSound);
        canvas.style.display = 'block';
        document.getElementById('startMenu').style.display = 'none';
        document.getElementById('scoreboard').style.display = 'block';
        gameInterval = setInterval(draw, 100);
  
        score = 0;
        updateScore();
    }

    function gameOver() {
        clearInterval(gameInterval);
        document.getElementById('scoreboard').style.display = 'none';
        document.getElementById('gameOverScreen').style.display = 'block';
        if (score > highScore) {
            highScore = score;  // Update the high score if the current score is higher
        }
        document.getElementById('finalScore').textContent = score;
        document.getElementById('finalHighScore').textContent = highScore;
        
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
    }

    document.getElementById('startButton').addEventListener('click', () => {
        playSound(buttonPressSound);
        startGame();
    });

    // Define openOptionsMenu function to show options menu
    function openOptionsMenu() {
        document.getElementById('startMenu').style.display = 'none';
        document.getElementById('optionsMenu').style.display = 'block';
    }

    document.getElementById('optionsButton').addEventListener('click', () => {
        playSound(buttonPressSound);
        openOptionsMenu(); // Call the function to open the options menu
    });

    document.getElementById('backToStartButton').addEventListener('click', () => {
        playSound(buttonPressSound);
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
        if (array.some(part => head.x === part.x && head.y === part.y)) return true;
        if (head.x < 0 || head.y < 0 || head.x >= canvasWidth || head.y >= canvasHeight) return true;
        return false;
    }
    document.getElementById('snakeColorSelect').addEventListener('change', function () {
        snakeColor = this.value;
        playSound(customizeSound);
    });

    updateScore();
});
