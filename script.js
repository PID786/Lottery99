// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDummyKeyDummyKeyDummyKeyDummy",
    authDomain: "lottery99-dummy.firebaseapp.com",
    projectId: "lottery99-dummy",
    storageBucket: "lottery99-dummy.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:dummyappiddummyappid"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// Game State
let currentUser = null;
let userBalance = 0;
let currentBetAmount = 10;
let currentBets = {
    red: 0,
    green: 0,
    violet: 0
};
let gameState = {
    round: 123456,
    timeLeft: 180, // 3 minutes in seconds
    gameInProgress: false,
    result: null
};
let gameHistory = [];
let transactionHistory = [];

// DOM Elements
const userBalanceEl = document.getElementById('userBalance');
const modalBalanceEl = document.getElementById('modalBalance');
const gameTimerEl = document.getElementById('gameTimer');
const roundNumberEl = document.getElementById('roundNumber');
const historyItemsEl = document.getElementById('historyItems');
const betAmountEl = document.getElementById('betAmount');
const redBetAmountEl = document.getElementById('redBetAmount');
const greenBetAmountEl = document.getElementById('greenBetAmount');
const violetBetAmountEl = document.getElementById('violetBetAmount');
const transactionHistoryEl = document.getElementById('transactionHistory');
const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
const walletModal = new bootstrap.Modal(document.getElementById('walletModal'));

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    checkAuthState();
    setupGameTimer();
    loadGameHistory();
    loadTransactionHistory();
    
    // Set initial bet amount
    betAmountEl.value = currentBetAmount;
});

// Authentication functions
function checkAuthState() {
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            // In a real app, we would fetch user data from database
            userBalance = 1000; // Default balance for demo
            updateBalance();
        } else {
            // Show login modal if not authenticated
            loginModal.show();
        }
    });
}

function sendOTP() {
    const phoneNumber = document.getElementById('loginMobile').value;
    if (!phoneNumber || phoneNumber.length !== 10) {
        alert('Please enter a valid 10-digit mobile number');
        return;
    }
    
    const phone = '+91' + phoneNumber;
    
    // For demo, we'll mock OTP sending
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('otpForm').style.display = 'block';
    
    // In a real app, we would use Firebase's recaptcha and send OTP
    // const appVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container');
    // auth.signInWithPhoneNumber(phone, appVerifier)
    //     .then((confirmationResult) => {
    //         window.confirmationResult = confirmationResult;
    //         document.getElementById('loginForm').style.display = 'none';
    //         document.getElementById('otpForm').style.display = 'block';
    //     })
    //     .catch((error) => {
    //         console.error(error);
    //         alert('Error sending OTP: ' + error.message);
    //     });
}

function verifyOTP() {
    const otp = document.getElementById('otp').value;
    if (!otp || otp.length !== 6) {
        alert('Please enter a valid 6-digit OTP');
        return;
    }
    
    // For demo, we'll mock OTP verification
    if (otp === '123456') {
        // Mock successful verification
        const userCredential = {
            user: {
                uid: 'demo-user-' + Math.random().toString(36).substring(7),
                phoneNumber: '+91' + document.getElementById('loginMobile').value
            }
        };
        auth.signInWithCredential(userCredential);
        loginModal.hide();
    } else {
        alert('Invalid OTP. Try 123456 for demo.');
    }
    
    // In a real app:
    // window.confirmationResult.confirm(otp)
    //     .then((result) => {
    //         loginModal.hide();
    //     })
    //     .catch((error) => {
    //         alert('Invalid OTP');
    //     });
}

// Game functions
function setupGameTimer() {
    setInterval(() => {
        gameState.timeLeft--;
        
        if (gameState.timeLeft <= 0) {
            // Game round ended, calculate result
            endRound();
            // Start new round
            gameState.round++;
            gameState.timeLeft = 180; // 3 minutes
            gameState.gameInProgress = true;
        }
        
        updateTimerDisplay();
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(gameState.timeLeft / 60);
    const seconds = gameState.timeLeft % 60;
    gameTimerEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Change color when time is running out
    if (gameState.timeLeft <= 30) {
        gameTimerEl.style.color = '#ff5555';
    } else {
        gameTimerEl.style.color = '#f39c12';
    }
    
    roundNumberEl.textContent = gameState.round;
}

function placeBet(color) {
    if (!currentUser) {
        loginModal.show();
        return;
    }
    
    if (currentBetAmount > userBalance) {
        alert('Insufficient balance');
        return;
    }
    
    currentBets[color] += currentBetAmount;
    userBalance -= currentBetAmount;
    updateBalance();
    updateBetAmounts();
    
    // Play sound
    playSound('bet');
}

function confirmBet() {
    const amount = parseInt(betAmountEl.value);
    if (isNaN(amount) {
        alert('Please enter a valid amount');
        return;
    }
    
    if (amount < 10) {
        alert('Minimum bet amount is ₹10');
        return;
    }
    
    currentBetAmount = amount;
    betAmountEl.value = currentBetAmount;
}

function setAmount(amount) {
    currentBetAmount = amount;
    betAmountEl.value = currentBetAmount;
}

function updateBetAmounts() {
    redBetAmountEl.textContent = `₹${currentBets.red}`;
    greenBetAmountEl.textContent = `₹${currentBets.green}`;
    violetBetAmountEl.textContent = `₹${currentBets.violet}`;
}

function endRound() {
    // Determine result (in a real app, this would be server-side)
    const random = Math.random();
    let result;
    
    if (random < 0.45) {
        result = 'red'; // 45% chance
    } else if (random < 0.75) {
        result = 'green'; // 30% chance
    } else {
        result = 'violet'; // 25% chance
    }
    
    gameState.result = result;
    
    // Calculate winnings
    let winnings = 0;
    const multiplier = {
        red: 2,
        green: 5,
        violet: 10
    };
    
    if (currentBets[result] > 0) {
        winnings = currentBets[result] * multiplier[result];
        userBalance += winnings;
        
        // Add transaction
        addTransaction('win', winnings, `Won from ${result} color`);
        
        // Play win sound
        playSound('win');
    } else {
        // Play lose sound
        playSound('lose');
    }
    
    // Add to history
    gameHistory.unshift({
        round: gameState.round,
        result: result,
        timestamp: new Date()
    });
    
    // Reset bets for next round
    currentBets = {
        red: 0,
        green: 0,
        violet: 0
    };
    
    // Update UI
    updateBalance();
    updateBetAmounts();
    updateGameHistory();
    
    // Show result animation
    showResultAnimation(result);
}

function showResultAnimation(result) {
    const colorMap = {
        red: '#e74c3c',
        green: '#2ecc71',
        violet: '#9b59b6'
    };
    
    const animationEl = document.createElement('div');
    animationEl.style.position = 'fixed';
    animationEl.style.top = '0';
    animationEl.style.left = '0';
    animationEl.style.width = '100%';
    animationEl.style.height = '100%';
    animationEl.style.backgroundColor = colorMap[result];
    animationEl.style.opacity = '0.7';
    animationEl.style.display = 'flex';
    animationEl.style.alignItems = 'center';
    animationEl.style.justifyContent = 'center';
    animationEl.style.fontSize = '3rem';
    animationEl.style.fontWeight = 'bold';
    animationEl.style.color = 'white';
    animationEl.style.zIndex = '1000';
    animationEl.textContent = result.toUpperCase();
    
    document.body.appendChild(animationEl);
    
    setTimeout(() => {
        animationEl.style.transition = 'opacity 1s';
        animationEl.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(animationEl);
        }, 1000);
    }, 2000);
}

function loadGameHistory() {
    // Mock data for demo
    const colors = ['red', 'green', 'violet'];
    for (let i = 0; i < 10; i++) {
        gameHistory.push({
            round: gameState.round - i - 1,
            result: colors[Math.floor(Math.random() * colors.length)],
            timestamp: new Date(Date.now() - (i * 180 * 1000))
        });
    }
    
    updateGameHistory();
}

function updateGameHistory() {
    historyItemsEl.innerHTML = '';
    gameHistory.slice(0, 10).forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'history-item';
        itemEl.style.backgroundColor = {
            red: '#e74c3c',
            green: '#2ecc71',
            violet: '#9b59b6'
        }[item.result];
        itemEl.textContent = item.result.charAt(0).toUpperCase();
        historyItemsEl.appendChild(itemEl);
    });
}

// Wallet functions
function openWallet() {
    if (!currentUser) {
        loginModal.show();
        return;
    }
    
    modalBalanceEl.textContent = userBalance.toFixed(2);
    walletModal.show();
}

function showDeposit() {
    document.getElementById('depositSection').style.display = 'block';
    document.getElementById('withdrawSection').style.display = 'none';
}

function showWithdraw() {
    document.getElementById('depositSection').style.display = 'none';
    document.getElementById('withdrawSection').style.display = 'block';
}

function processDeposit() {
    const amount = parseFloat(document.getElementById('depositAmount').value);
    if (isNaN(amount) {
        alert('Please enter a valid amount');
        return;
    }
    
    if (amount < 100) {
        alert('Minimum deposit amount is ₹100');
        return;
    }
    
    // In a real app, this would initiate a payment gateway process
    userBalance += amount;
    updateBalance();
    modalBalanceEl.textContent = userBalance.toFixed(2);
    
    // Add transaction
    addTransaction('deposit', amount, 'Deposit via UPI');
    
    alert(`Deposit of ₹${amount} successful!`);
    document.getElementById('depositAmount').value = '';
}

function processWithdraw() {
    const amount = parseFloat(document.getElementById('withdrawAmount').value);
    const upiId = document.getElementById('upiId').value;
    
    if (isNaN(amount)) {
        alert('Please enter a valid amount');
        return;
    }
    
    if (amount < 100) {
        alert('Minimum withdrawal amount is ₹100');
        return;
    }
    
    if (amount > userBalance) {
        alert('Insufficient balance');
        return;
    }
    
    if (!upiId || !upiId.includes('@')) {
        alert('Please enter a valid UPI ID');
        return;
    }
    
    // In a real app, this would be processed by admin
    userBalance -= amount;
    updateBalance();
    modalBalanceEl.textContent = userBalance.toFixed(2);
    
    // Add transaction
    addTransaction('withdraw', amount, `Withdrawal to ${upiId} (Pending)`);
    
    alert(`Withdrawal request of ₹${amount} submitted for approval!`);
    document.getElementById('withdrawAmount').value = '';
    document.getElementById('upiId').value = '';
}

function loadTransactionHistory() {
    // Mock data for demo
    const types = ['deposit', 'withdraw', 'win'];
    const methods = ['UPI', 'PayTM', 'Bank Transfer'];
    
    for (let i = 0; i < 5; i++) {
        const type = types[Math.floor(Math.random() * types.length)];
        const amount = Math.floor(Math.random() * 1000) + 100;
        const method = methods[Math.floor(Math.random() * methods.length)];
        
        transactionHistory.push({
            type: type,
            amount: amount,
            description: `${type === 'win' ? 'Won from game' : type} via ${method}`,
            timestamp: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)),
            status: type === 'withdraw' ? 'pending' : 'completed'
        });
    }
    
    updateTransactionHistory();
}

function addTransaction(type, amount, description) {
    transactionHistory.unshift({
        type: type,
        amount: amount,
        description: description,
        timestamp: new Date(),
        status: type === 'withdraw' ? 'pending' : 'completed'
    });
    
    updateTransactionHistory();
}

function updateTransactionHistory() {
    transactionHistoryEl.innerHTML = '';
    transactionHistory.slice(0, 10).forEach(txn => {
        const txnEl = document.createElement('div');
        txnEl.className = 'transaction-item';
        
        const leftDiv = document.createElement('div');
        leftDiv.innerHTML = `<strong>${txn.description}</strong><br>
                            <small>${txn.timestamp.toLocaleString()}</small>`;
        
        const rightDiv = document.createElement('div');
        rightDiv.style.textAlign = 'right';
        
        const amountSpan = document.createElement('span');
        amountSpan.style.color = txn.type === 'win' ? '#2ecc71' : 
                                txn.type === 'deposit' ? '#3498db' : '#e74c3c';
        amountSpan.textContent = `${txn.type === 'win' ? '+' : txn.type === 'deposit' ? '+' : '-'}₹${txn.amount.toFixed(2)}`;
        
        rightDiv.appendChild(amountSpan);
        
        if (txn.status === 'pending') {
            const statusSpan = document.createElement('span');
            statusSpan.style.display = 'block';
            statusSpan.style.fontSize = '0.8rem';
            statusSpan.style.color = '#f39c12';
            statusSpan.textContent = 'Pending';
            rightDiv.appendChild(statusSpan);
        }
        
        txnEl.appendChild(leftDiv);
        txnEl.appendChild(rightDiv);
        transactionHistoryEl.appendChild(txnEl);
    });
}

// UI functions
function updateBalance() {
    userBalanceEl.textContent = `₹${userBalance.toFixed(2)}`;
}

function showScreen(screen) {
    // In a full SPA, this would switch between different screens
    alert(`Showing ${screen} screen - this would be implemented in a full SPA`);
}

function playSound(type) {
    // In a real app, we would play actual sounds
    console.log(`Playing ${type} sound`);
}

// PWA setup
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('ServiceWorker registration successful');
            })
            .catch(err => {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}
