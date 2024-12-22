class Game {
    constructor(canvasId, controlType = 'mouse', playerName = 'Player 1') {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 400;
        this.canvas.height = 600;
        this.controlType = controlType;
        
        this.isMultiplayer = false;
        this.currentPlayer = 1;
        this.scores = {
            player1: 0,
            player2: 0
        };
        this.bestScore = parseInt(localStorage.getItem('bestScore')) || 0;
        
        this.ball = {
            x: this.canvas.width / 2,
            y: this.canvas.height - 30,
            radius: 8,
            speed: 5,
            dx: 0,
            dy: 0,
            launched: false
        };
        
        this.paddle = {
            width: 80,
            height: 10,
            x: this.canvas.width / 2 - 40,
            y: this.canvas.height - 20,
            color: this.controlType === 'wasd' ? '#4CAF50' : '#2196F3',
            speed: 7
        };
        
        this.keys = {
            left: false,
            right: false,
            launch: false
        };
        
        this.bricks = [];
        this.brickRows = 5;
        this.brickCols = 6;
        this.gameFinished = false;
        this.finalScore = 0;
        this.playAgainButton = {
            x: this.canvas.width / 2 - 60,
            y: this.canvas.height / 2 + 100,
            width: 120,
            height: 45
        };
        
        this.level = 1;
        this.combo = 0;
        this.comboTimer = null;
        this.particles = [];
        
        this.playerName = playerName;
        
        this.initBricks();
        this.setupCanvas();
        this.setupKeyboardControls();
        this.gameLoop();
        
        this.updateThemeColors();
    }
    
    initBricks() {
        const brickWidth = (this.canvas.width - 60) / this.brickCols;
        const brickHeight = 30;
        
        // Clear existing bricks if any
        this.bricks = [];
        
        for (let row = 0; row < this.brickRows; row++) {
            for (let col = 0; col < this.brickCols; col++) {
                const value = Math.floor(Math.random() * (this.level + 8)) + this.level;
                this.bricks.push({
                    x: 30 + col * brickWidth,
                    y: 50 + row * (brickHeight + 10),
                    width: brickWidth - 4,
                    height: brickHeight,
                    value: value,
                    color: `hsl(${value * 25}, 70%, 50%)`
                });
            }
        }
    }
    
    setupCanvas() {
        if (this.controlType === 'mouse') {
            this.canvas.addEventListener('mousemove', (e) => {
                const rect = this.canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                if (!this.gameFinished) {
                    this.paddle.x = Math.max(0, Math.min(mouseX - this.paddle.width / 2, 
                        this.canvas.width - this.paddle.width));
                    
                    if (!this.ball.launched) {
                        this.ball.x = this.paddle.x + this.paddle.width / 2;
                    }
                }
            });
        }

        // Add click event listener for both single and multiplayer modes
        this.canvas.addEventListener('click', (e) => {
            if (this.gameFinished) {
                const rect = this.canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                
                if (mouseX >= this.playAgainButton.x && 
                    mouseX <= this.playAgainButton.x + this.playAgainButton.width &&
                    mouseY >= this.playAgainButton.y && 
                    mouseY <= this.playAgainButton.y + this.playAgainButton.height) {
                    this.restartGame();
                }
            } else if (!this.ball.launched && this.controlType === 'mouse') {
                this.ball.launched = true;
                this.ball.dx = this.ball.speed;
                this.ball.dy = -this.ball.speed;
            }
        });
    }

    setupKeyboardControls() {
        if (this.controlType === 'wasd' || this.controlType === 'arrows') {
            window.addEventListener('keydown', (e) => {
                if (this.controlType === 'wasd') {
                    if (e.key === 'a' || e.key === 'A') this.keys.left = true;
                    if (e.key === 'd' || e.key === 'D') this.keys.right = true;
                    if (e.key === 'w' || e.key === 'W' || e.key === ' ') this.keys.launch = true;
                } else if (this.controlType === 'arrows') {
                    if (e.key === 'ArrowLeft') this.keys.left = true;
                    if (e.key === 'ArrowRight') this.keys.right = true;
                    if (e.key === 'ArrowUp') this.keys.launch = true;
                }
            });
            
            window.addEventListener('keyup', (e) => {
                if (this.controlType === 'wasd') {
                    if (e.key === 'a' || e.key === 'A') this.keys.left = false;
                    if (e.key === 'd' || e.key === 'D') this.keys.right = false;
                    if (e.key === 'w' || e.key === 'W' || e.key === ' ') this.keys.launch = false;
                } else if (this.controlType === 'arrows') {
                    if (e.key === 'ArrowLeft') this.keys.left = false;
                    if (e.key === 'ArrowRight') this.keys.right = false;
                    if (e.key === 'ArrowUp') this.keys.launch = false;
                }
            });
        }
    }

    updatePaddlePosition() {
        if (this.controlType === 'wasd' || this.controlType === 'arrows') {
            if (this.keys.left) {
                this.paddle.x = Math.max(0, this.paddle.x - this.paddle.speed);
            }
            if (this.keys.right) {
                this.paddle.x = Math.min(this.canvas.width - this.paddle.width, 
                    this.paddle.x + this.paddle.speed);
            }
            
            if (!this.ball.launched) {
                this.ball.x = this.paddle.x + this.paddle.width / 2;
            }

            if (this.keys.launch && !this.ball.launched) {
                this.ball.launched = true;
                this.ball.dx = this.ball.speed;
                this.ball.dy = -this.ball.speed;
            }
        }
    }
    
    update() {
        if (this.gameFinished) return;
        
        this.updatePaddlePosition();
        this.updateParticles();
        
        if (!this.ball.launched) return;
        
        // Update ball position
        this.ball.x += this.ball.dx;
        this.ball.y += this.ball.dy;
        
        // Ball collision with walls
        if (this.ball.x + this.ball.radius > this.canvas.width || 
            this.ball.x - this.ball.radius < 0) {
            this.ball.dx *= -1;
            this.addParticles(this.ball.x, this.ball.y, '#fff');
        }
        if (this.ball.y - this.ball.radius < 0) {
            this.ball.dy *= -1;
            this.addParticles(this.ball.x, this.ball.y, '#fff');
        }
        
        // Ball collision with paddle
        if (this.ball.y + this.ball.radius > this.paddle.y &&
            this.ball.x > this.paddle.x &&
            this.ball.x < this.paddle.x + this.paddle.width) {
            this.ball.dy = -this.ball.speed;
            
            // Add angle based on where the ball hits the paddle
            const hitPos = (this.ball.x - this.paddle.x) / this.paddle.width;
            this.ball.dx = this.ball.speed * (hitPos - 0.5) * 2;
            
            this.addParticles(this.ball.x, this.ball.y, this.paddle.color);
        }
        
        // Ball collision with bricks
        this.bricks.forEach((brick, index) => {
            if (this.ball.x + this.ball.radius > brick.x &&
                this.ball.x - this.ball.radius < brick.x + brick.width &&
                this.ball.y + this.ball.radius > brick.y &&
                this.ball.y - this.ball.radius < brick.y + brick.height) {
                
                this.ball.dy *= -1;
                brick.value--;
                this.scores.player1 += (1 + Math.floor(this.combo / 3));
                
                // Combo system
                clearTimeout(this.comboTimer);
                this.combo++;
                this.comboTimer = setTimeout(() => {
                    this.combo = 0;
                }, 1000);
                
                this.addParticles(this.ball.x, this.ball.y, brick.color);
                
                if (brick.value <= 0) {
                    this.bricks.splice(index, 1);
                    // Add more particles for brick destruction
                    this.addParticles(brick.x + brick.width/2, brick.y + brick.height/2, brick.color);
                } else {
                    brick.color = `hsl(${brick.value * 25}, 70%, 50%)`;
                }
                
                if (!this.isMultiplayer && this.scores.player1 > this.bestScore) {
                    this.bestScore = this.scores.player1;
                    localStorage.setItem('bestScore', this.bestScore);
                }

                this.updateScoreDisplay();
            }
        });
        
        // Game over condition
        if (this.ball.y + this.ball.radius > this.canvas.height) {
            this.finishGame();
        }

        // Check if all bricks are destroyed - Level up!
        if (this.bricks.length === 0) {
            this.level++;
            this.ball.speed += 0.2;
            this.paddle.width = Math.max(40, this.paddle.width - 2);
            this.initBricks();
        }
    }
    
    finishGame() {
        // For single player mode, proceed as normal
        if (window.gameManager && window.gameManager.currentMode === 'single') {
            this.gameFinished = true;
            this.finalScore = this.scores.player1;
            this.ball.launched = false;
            
            if (this.finalScore > this.bestScore) {
                this.bestScore = this.finalScore;
                localStorage.setItem('bestScore', this.bestScore);
                const bestScoreElement = document.getElementById('best-score');
                if (bestScoreElement) {
                    bestScoreElement.textContent = this.bestScore;
                }
                
                window.gameManager.addLogEntry(
                    `New Best Score! ${this.finalScore} points at Level ${this.level}`,
                    {
                        score: this.finalScore,
                        level: this.level,
                        isBestScore: true
                    }
                );
            } else {
                window.gameManager.finishGame(this);
            }
            return;
        }
        
        // For multiplayer mode
        if (window.gameManager && window.gameManager.currentMode === 'sideBySide') {
            // Set final score before storing
            this.finalScore = this.scores.player1;
            
            // Store final score but don't end game yet
            const playerKey = this.canvas.id === 'gameCanvas' ? 'player1FinalScore' : 'player2FinalScore';
            localStorage.setItem(playerKey, this.finalScore);
            
            // Stop the ball and movement but keep the game visible
            this.ball.launched = false;
            this.ball.dx = 0;
            this.ball.dy = 0;
            
            const otherPlayerScore = this.canvas.id === 'gameCanvas' 
                ? localStorage.getItem('player2FinalScore') 
                : localStorage.getItem('player1FinalScore');
            
            // Only proceed with game over if both players have finished
            if (otherPlayerScore !== null) {
                const player1Score = parseInt(localStorage.getItem('player1FinalScore'));
                const player2Score = parseInt(localStorage.getItem('player2FinalScore'));
                
                const player1Name = window.gameManager.player1Name;
                const player2Name = window.gameManager.player2Name;
                
                let resultText = '';
                if (player1Score > player2Score) {
                    resultText = `${player1Name} wins! (${player1Score} vs ${player2Score})`;
                } else if (player2Score > player1Score) {
                    resultText = `${player2Name} wins! (${player2Score} vs ${player1Score})`;
                } else {
                    resultText = `It's a tie! (${player1Score} points each)`;
                }

                // Add to game log with detailed information
                if (window.gameManager) {
                    window.gameManager.addLogEntry(resultText, {
                        player1: {
                            name: player1Name,
                            score: player1Score
                        },
                        player2: {
                            name: player2Name,
                            score: player2Score
                        },
                        winner: player1Score > player2Score ? player1Name : 
                               player2Score > player1Score ? player2Name : 'tie'
                    });
                }
                
                // Now we can set both games as finished
                this.gameFinished = true;
                if (window.gameManager.game1) {
                    window.gameManager.game1.gameFinished = true;
                    window.gameManager.game1.finalScore = player1Score;
                }
                if (window.gameManager.game2) {
                    window.gameManager.game2.gameFinished = true;
                    window.gameManager.game2.finalScore = player2Score;
                }
                
                // Clear the stored scores
                localStorage.removeItem('player1FinalScore');
                localStorage.removeItem('player2FinalScore');
                
                // Show alert after a short delay
                setTimeout(() => {
                    alert(`Game Over!\n\n${resultText}`);
                }, 100);
            } else {
                // If this player finished first, show waiting message
                this.waitingForOtherPlayer = true;
            }
        }
    }
    
    restartGame() {
        // Reset game state
        this.gameFinished = false;
        this.finalScore = 0;
        this.scores.player1 = 0;
        this.level = 1;
        this.combo = 0;
        this.ball.speed = 5;
        this.paddle.width = 80;
        this.waitingForOtherPlayer = false;
        
        this.ball.x = this.canvas.width / 2;
        this.ball.y = this.canvas.height - 30;
        this.ball.dx = 0;
        this.ball.dy = 0;
        this.ball.launched = false;
        this.paddle.x = this.canvas.width / 2 - this.paddle.width / 2;
        
        // Clear particles
        this.particles = [];
        
        // Reinitialize bricks
        this.bricks = [];
        this.initBricks();
        
        // Update score display
        this.updateScoreDisplay();
        
        // In multiplayer mode, restart both games
        if (window.gameManager && window.gameManager.currentMode === 'sideBySide') {
            // Clear any stored scores
            localStorage.removeItem('player1FinalScore');
            localStorage.removeItem('player2FinalScore');
            
            // If this is game1, also restart game2
            if (this === window.gameManager.game1 && window.gameManager.game2) {
                window.gameManager.game2.restartGame();
            }
            // If this is game2, also restart game1
            else if (this === window.gameManager.game2 && window.gameManager.game1) {
                window.gameManager.game1.restartGame();
            }
        }
    }

    updateScoreDisplay() {
        const scoreId = this.canvas.id === 'gameCanvas' ? 'score1' : 'score2_2';
        document.getElementById(scoreId).textContent = this.scores.player1;
        
        // Update best score for both players in multiplayer mode
        const bestScoreId = this.canvas.id === 'gameCanvas' ? 'best-score' : 'best-score2';
        document.getElementById(bestScoreId).textContent = this.bestScore;
    }
    
    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw particles
        this.drawParticles();
        
        // Draw level indicator
        if (!this.gameFinished) {
            this.ctx.fillStyle = this.levelTextColor || 'rgba(255, 255, 255, 0.2)';
            this.ctx.font = 'bold 40px Inter';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`Level ${this.level}`, this.canvas.width / 2, this.canvas.height / 2);
        }
        
        // Draw combo indicator
        if (this.combo > 0) {
            this.ctx.fillStyle = '#ffd700';
            this.ctx.font = 'bold 24px Inter';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`Combo x${this.combo}`, this.canvas.width / 2, 30);
        }
        
        // Draw ball with trail effect
        if (!this.gameFinished) {
            this.ctx.beginPath();
            const gradient = this.ctx.createRadialGradient(
                this.ball.x, this.ball.y, 0,
                this.ball.x, this.ball.y, this.ball.radius
            );
            gradient.addColorStop(0, this.ballColor || '#ffffff');
            gradient.addColorStop(1, this.ballTrailColor || 'rgba(255, 255, 255, 0.3)');
            this.ctx.fillStyle = gradient;
            this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.closePath();
            
            // Draw paddle
            this.ctx.fillStyle = this.paddle.color;
            this.ctx.fillRect(this.paddle.x, this.paddle.y, 
                this.paddle.width, this.paddle.height);
        }
        
        // Draw bricks
        this.bricks.forEach(brick => {
            this.ctx.fillStyle = brick.color;
            this.ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
            
            // Draw brick value
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '500 16px Inter';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(brick.value, 
                brick.x + brick.width / 2, 
                brick.y + brick.height / 2 + 6);
        });

        // Draw final score and play again button if game is finished
        if (this.gameFinished) {
            // Create semi-transparent dark overlay
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Draw decorative lines
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(50, this.canvas.height / 2 - 80);
            this.ctx.lineTo(this.canvas.width - 50, this.canvas.height / 2 - 80);
            this.ctx.moveTo(50, this.canvas.height / 2 + 80);
            this.ctx.lineTo(this.canvas.width - 50, this.canvas.height / 2 + 80);
            this.ctx.stroke();
            
            // Draw game over text with shadow
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            this.ctx.shadowBlur = 15;
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '500 25px Inter';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Game Over', this.canvas.width / 2, this.canvas.height / 2 - 120);
            
            // Only show new best score message in single player mode
            if (window.gameManager && window.gameManager.currentMode === 'single' && this.finalScore > this.bestScore) {
                this.ctx.fillStyle = '#4CAF50';
                this.ctx.font = '600 25px Inter';
                this.ctx.fillText('NEW BEST SCORE!', this.canvas.width / 2, this.canvas.height / 2 - 70);
            }
            
            // Draw score details
            this.ctx.shadowBlur = 5;
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '500 28px Inter';
            this.ctx.fillText('Final Score', this.canvas.width / 2, this.canvas.height / 2 - 20);
            this.ctx.font = '700 35px Inter';
            this.ctx.fillText(this.finalScore, this.canvas.width / 2, this.canvas.height / 2 + 30);
            this.ctx.font = '500 24px Inter';
            this.ctx.fillText(`Level ${this.level}`, this.canvas.width / 2, this.canvas.height / 2 + 70);

            // Draw play again button with gradient and shadow
            const buttonGradient = this.ctx.createLinearGradient(
                this.playAgainButton.x,
                this.playAgainButton.y,
                this.playAgainButton.x,
                this.playAgainButton.y + this.playAgainButton.height
            );
            buttonGradient.addColorStop(0, '#2196F3');
            buttonGradient.addColorStop(1, '#1976D2');
            
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            this.ctx.shadowBlur = 8;
            this.ctx.shadowOffsetY = 3;
            
            // Draw button background with larger radius
            this.ctx.fillStyle = buttonGradient;
            this.ctx.beginPath();
            this.ctx.roundRect(
                this.playAgainButton.x,
                this.playAgainButton.y,
                this.playAgainButton.width,
                this.playAgainButton.height,
                10
            );
            this.ctx.fill();
            
            // Draw button text
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            this.ctx.shadowBlur = 3;
            this.ctx.shadowOffsetY = 1;
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '600 15px Inter';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('PLAY AGAIN', 
                this.playAgainButton.x + this.playAgainButton.width / 2,
                this.playAgainButton.y + this.playAgainButton.height / 2 + 7
            );
            
            // Reset shadow
            this.ctx.shadowColor = 'transparent';
            this.ctx.shadowBlur = 0;
            this.ctx.shadowOffsetY = 0;
        }

        // Add waiting message in multiplayer mode
        if (this.waitingForOtherPlayer && !this.gameFinished) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '500 24px Inter';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Waiting for other player...', 
                this.canvas.width / 2, 
                this.canvas.height / 2);
        }
    }
    
    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }

    addParticles(x, y, color) {
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8;
            const speed = 2 + Math.random() * 2;
            this.particles.push({
                x: x,
                y: y,
                dx: Math.cos(angle) * speed,
                dy: Math.sin(angle) * speed,
                color: color,
                life: 1,
                size: 4
            });
        }
    }

    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.x += particle.dx;
            particle.y += particle.dy;
            particle.life -= 0.02;
            particle.size *= 0.95;
            
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    drawParticles() {
        this.particles.forEach(particle => {
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fillStyle = `${particle.color}${Math.floor(particle.life * 255).toString(16).padStart(2, '0')}`;
            this.ctx.fill();
            this.ctx.closePath();
        });
    }

    darkenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, (num >> 16) - amt);
        const G = Math.max(0, (num >> 8 & 0x00FF) - amt);
        const B = Math.max(0, (num & 0x0000FF) - amt);
        return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
    }

    updateThemeColors() {
        const computedStyle = getComputedStyle(document.documentElement);
        this.ballColor = computedStyle.getPropertyValue('--ball-color').trim();
        this.ballTrailColor = computedStyle.getPropertyValue('--ball-trail').trim();
        this.levelTextColor = computedStyle.getPropertyValue('--level-text').trim();
        
        // Update paddle color based on control type and theme
        if (this.controlType === 'wasd') {
            this.paddle.color = computedStyle.getPropertyValue('--primary').trim();
        } else if (this.controlType === 'arrows') {
            this.paddle.color = computedStyle.getPropertyValue('--secondary').trim();
        }
    }
}

class GameManager {
    constructor() {
        this.game1 = null;
        this.game2 = null;
        this.currentMode = 'single';
        this.logEntries = JSON.parse(localStorage.getItem('gameHistory')) || [];
        this.currentTheme = localStorage.getItem('theme') || 'dark';
        this.player1Name = localStorage.getItem('singlePlayerName') || 'Player 1';
        this.player2Name = 'Player 2';
        this.applyTheme(this.currentTheme);
        this.setupEventListeners();
        this.startSinglePlayer();
        this.displayGameHistory();
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        this.currentTheme = theme;
    }

    setupEventListeners() {
        const multiplayerBtn = document.getElementById('multiplayerBtn');
        const backToSingleBtn = document.getElementById('backToSingleBtn');
        const modal = document.getElementById('multiplayerModal');
        const startGameBtn = document.getElementById('startGameBtn');
        const themeToggleBtn = document.getElementById('themeToggleBtn');
        const logFilter = document.getElementById('logFilter');
        const clearLogBtn = document.getElementById('clearLogBtn');
        const toggleHistoryBtn = document.getElementById('toggleHistoryBtn');
        const closeLogBtn = document.getElementById('closeLogBtn');
        const namePopup = document.getElementById('nameUpdatePopup');
        const nameInput = document.getElementById('nameUpdateInput');
        const saveNameBtn = document.getElementById('saveNameBtn');
        const cancelNameBtn = document.getElementById('cancelNameBtn');
        const player1Score = document.querySelector('.player1');

        if (!multiplayerBtn || !backToSingleBtn || !modal || !startGameBtn || !themeToggleBtn) {
            console.error('Required elements not found');
            return;
        }

        // Theme toggle
        themeToggleBtn.addEventListener('click', () => {
            const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
            this.applyTheme(newTheme);
            
            // Update ball colors in existing games
            if (this.game1) {
                this.game1.updateThemeColors();
            }
            if (this.game2) {
                this.game2.updateThemeColors();
            }
        });

        // Toggle history window
        if (toggleHistoryBtn) {
            toggleHistoryBtn.addEventListener('click', () => {
                const gameLog = document.querySelector('.game-log');
                if (gameLog) {
                    gameLog.classList.toggle('hidden');
                }
            });
        }

        // Close history window
        if (closeLogBtn) {
            closeLogBtn.addEventListener('click', () => {
                const gameLog = document.querySelector('.game-log');
                if (gameLog) {
                    gameLog.classList.add('hidden');
                }
            });
        }

        // Log filtering
        if (logFilter) {
            logFilter.addEventListener('change', () => {
                this.displayGameHistory(logFilter.value);
            });
        }

        // Clear game history
        if (clearLogBtn) {
            clearLogBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to clear all game history?')) {
                    this.logEntries = [];
                    localStorage.removeItem('gameHistory');
                    this.displayGameHistory();
                }
            });
        }

        // Multiplayer button
        multiplayerBtn.addEventListener('click', () => {
            modal.classList.add('active');
        });

        // Back to single player
        backToSingleBtn.addEventListener('click', () => {
            this.startSinglePlayer();
            backToSingleBtn.classList.add('hidden');
            multiplayerBtn.classList.remove('hidden');
        });

        // Start multiplayer game
        startGameBtn.addEventListener('click', () => {
            const player1Input = document.getElementById('player1Name');
            const player2Input = document.getElementById('player2Name');
            
            if (player1Input && player2Input) {
                this.player1Name = player1Input.value.trim() || 'Player 1';
                this.player2Name = player2Input.value.trim() || 'Player 2';
            }

            this.startMultiplayer();
            modal.classList.remove('active');
            backToSingleBtn.classList.remove('hidden');
            multiplayerBtn.classList.add('hidden');
        });

        // Handle player name click in single player mode
        if (player1Score) {
            player1Score.addEventListener('click', () => {
                if (this.currentMode === 'single') {
                    nameInput.value = this.player1Name;
                    namePopup.classList.remove('hidden');
                }
            });
        }

        // Handle name update
        if (saveNameBtn && nameInput) {
            saveNameBtn.addEventListener('click', () => {
                const newName = nameInput.value.trim() || 'Player 1';
                this.player1Name = newName;
                localStorage.setItem('singlePlayerName', newName);
                
                const player1Element = document.querySelector('.player1');
                const scoreSpan = document.getElementById('score1');
                if (player1Element && scoreSpan) {
                    player1Element.textContent = `${newName}: `;
                    player1Element.appendChild(scoreSpan);
                }
                
                namePopup.classList.add('hidden');
            });
        }

        // Handle cancel name update
        if (cancelNameBtn) {
            cancelNameBtn.addEventListener('click', () => {
                namePopup.classList.add('hidden');
            });
        }

        // Close popup when clicking outside
        if (namePopup) {
            namePopup.addEventListener('click', (e) => {
                if (e.target === namePopup) {
                    namePopup.classList.add('hidden');
                }
            });
        }
    }

    startSinglePlayer() {
        document.getElementById('game2').classList.add('hidden');
        this.game1 = new Game('gameCanvas', 'mouse', this.player1Name);
        this.currentMode = 'single';
        
        // Show best score in single player mode
        const bestScoreElement = document.querySelector('.best');
        if (bestScoreElement) {
            bestScoreElement.classList.remove('hidden');
        }
        
        // Update player name display
        const player1ScoreElement = document.querySelector('.player1');
        const scoreSpan = document.getElementById('score1');
        if (player1ScoreElement && scoreSpan) {
            player1ScoreElement.textContent = `${this.player1Name}: `;
            player1ScoreElement.appendChild(scoreSpan);
        }
    }

    startMultiplayer() {
        // Clear any existing scores from localStorage
        localStorage.removeItem('player1FinalScore');
        localStorage.removeItem('player2FinalScore');
        
        // Reset scores in UI
        const score1 = document.getElementById('score1');
        const score2 = document.getElementById('score2_2');
        
        if (score1) score1.textContent = '0';
        if (score2) score2.textContent = '0';
        
        // Hide best scores in multiplayer mode
        const bestScoreElements = document.querySelectorAll('.best');
        bestScoreElements.forEach(element => {
            element.classList.add('hidden');
        });
        
        // Show second game
        document.getElementById('game2').classList.remove('hidden');
        
        // Create new games with fresh scores
        this.game1 = new Game('gameCanvas', 'wasd', this.player1Name);
        this.game2 = new Game('gameCanvas2', 'arrows', this.player2Name);
        
        // Update player name displays
        const player1Element = document.querySelector('.player1');
        const player2Element = document.querySelector('.player2');
        
        if (player1Element && score1) {
            player1Element.textContent = `${this.player1Name}: `;
            player1Element.appendChild(score1);
        }
        
        if (player2Element && score2) {
            player2Element.textContent = `${this.player2Name}: `;
            player2Element.appendChild(score2);
        }
        
        // Set mode
        this.currentMode = 'sideBySide';
        
        // Refresh the game log display with current filter
        const logFilter = document.getElementById('logFilter');
        this.displayGameHistory(logFilter ? logFilter.value : 'all');
    }

    addLogEntry(text, details = {}) {
        // Load existing entries from localStorage first
        this.logEntries = JSON.parse(localStorage.getItem('gameHistory')) || [];
        
        const entry = {
            timestamp: new Date().toISOString(),
            text: text,
            gameType: this.currentMode,
            playerName: this.currentMode === 'single' ? this.player1Name : null,
            level: this.game1 ? this.game1.level : 1,
            score: details.score || 0,
            details: details
        };

        this.logEntries.unshift(entry);
        
        // Save to localStorage
        localStorage.setItem('gameHistory', JSON.stringify(this.logEntries));
        
        // Update display
        this.displayGameHistory();
    }

    displayGameHistory(filter = 'all') {
        const logContainer = document.getElementById('logEntries');
        if (!logContainer) return;

        // Always load the latest data from localStorage
        this.logEntries = JSON.parse(localStorage.getItem('gameHistory')) || [];

        logContainer.innerHTML = '';
        const filteredEntries = this.logEntries.filter(entry => {
            if (filter === 'all') return true;
            if (filter === 'single') return entry.gameType === 'single';
            if (filter === 'multi') return entry.gameType === 'sideBySide';
            return true;
        });

        filteredEntries.forEach(entry => {
            const logEntry = document.createElement('div');
            logEntry.className = 'log-entry';

            const timestamp = new Date(entry.timestamp).toLocaleString();
            const gameType = entry.gameType === 'single' ? 'Single Player' : 'Multiplayer';
            
            let detailsHtml = '';
            if (entry.gameType === 'single') {
                detailsHtml = `
                    <div class="details">
                        Player: ${entry.playerName}<br>
                        Level: ${entry.level}<br>
                        Score: ${entry.score}
                    </div>
                `;
            } else if (entry.details.player1 && entry.details.player2) {
                detailsHtml = `
                    <div class="details">
                        ${entry.details.player1.name}: ${entry.details.player1.score}<br>
                        ${entry.details.player2.name}: ${entry.details.player2.score}
                    </div>
                `;
            }

            logEntry.innerHTML = `
                <div class="timestamp">${timestamp}</div>
                <div class="game-type">${gameType}</div>
                <div class="score">${entry.text}</div>
                ${detailsHtml}
            `;

            logContainer.appendChild(logEntry);
        });
    }

    finishGame(game) {
        const details = {
            score: game.finalScore,
            level: game.level,
            playerName: game.playerName
        };

        if (this.currentMode === 'single') {
            this.addLogEntry(
                `Game Over - Score: ${game.finalScore} - Level: ${game.level}`,
                details
            );
        }
    }
}

// Start the game manager when the page loads
window.onload = () => {
    // Make the GameManager instance globally accessible
    window.gameManager = new GameManager();
}; 