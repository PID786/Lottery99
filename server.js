require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const admin = require('firebase-admin');
const bodyParser = require('body-parser');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

// Initialize Express app
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Define Mongoose Schemas
const userSchema = new mongoose.Schema({
    uid: { type: String, required: true, unique: true },
    phoneNumber: { type: String, required: true },
    balance: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

const transactionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['deposit', 'withdraw', 'win', 'bet'], required: true },
    amount: { type: Number, required: true },
    description: { type: String },
    status: { type: String, enum: ['pending', 'completed', 'rejected'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});

const gameRoundSchema = new mongoose.Schema({
    roundNumber: { type: Number, required: true, unique: true },
    result: { type: String, enum: ['red', 'green', 'violet'], required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true }
});

const betSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    roundNumber: { type: Number, required: true },
    color: { type: String, enum: ['red', 'green', 'violet'], required: true },
    amount: { type: Number, required: true },
    payout: { type: Number },
    status: { type: String, enum: ['pending', 'won', 'lost'], default: 'pending' },
    placedAt: { type: Date, default: Date.now }
});

// Create Models
const User = mongoose.model('User', userSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);
const GameRound = mongoose.model('GameRound', gameRoundSchema);
const Bet = mongoose.model('Bet', betSchema);

// Middleware to verify Firebase token
const verifyToken = async (req, res, next) => {
    const token = req.headers.authorization?.split('Bearer ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error('Error verifying token:', error);
        res.status(401).json({ error: 'Unauthorized' });
    }
};

// API Routes

// User registration/login
app.post('/api/login', async (req, res) => {
    try {
        const { token } = req.body;
        const decodedToken = await admin.auth().verifyIdToken(token);
        
        // Check if user exists in our DB
        let user = await User.findOne({ uid: decodedToken.uid });
        
        if (!user) {
            // Create new user
            user = new User({
                uid: decodedToken.uid,
                phoneNumber: decodedToken.phone_number
            });
            await user.save();
        }
        
        res.json({
            uid: user.uid,
            phoneNumber: user.phoneNumber,
            balance: user.balance
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Get user data
app.get('/api/user', verifyToken, async (req, res) => {
    try {
        const user = await User.findOne({ uid: req.user.uid });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({
            uid: user.uid,
            phoneNumber: user.phoneNumber,
            balance: user.balance
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Wallet operations
app.post('/api/wallet/deposit', verifyToken, async (req, res) => {
    try {
        const { amount } = req.body;
        
        if (!amount || amount < 100) {
            return res.status(400).json({ error: 'Minimum deposit amount is ₹100' });
        }
        
        // In a real app, this would verify payment with a payment gateway
        const user = await User.findOneAndUpdate(
            { uid: req.user.uid },
            { $inc: { balance: amount } },
            { new: true }
        );
        
        // Create transaction record
        const transaction = new Transaction({
            userId: user._id,
            type: 'deposit',
            amount: amount,
            description: 'Deposit via UPI',
            status: 'completed'
        });
        await transaction.save();
        
        res.json({
            balance: user.balance,
            transactionId: transaction._id
        });
    } catch (error) {
        console.error('Deposit error:', error);
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/wallet/withdraw', verifyToken, async (req, res) => {
    try {
        const { amount, upiId } = req.body;
        
        if (!amount || amount < 100) {
            return res.status(400).json({ error: 'Minimum withdrawal amount is ₹100' });
        }
        
        if (!upiId || !upiId.includes('@')) {
            return res.status(400).json({ error: 'Invalid UPI ID' });
        }
        
        const user = await User.findOne({ uid: req.user.uid });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        if (user.balance < amount) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }
        
        // Deduct balance
        user.balance -= amount;
        await user.save();
        
        // Create transaction record
        const transaction = new Transaction({
            userId: user._id,
            type: 'withdraw',
            amount: amount,
            description: `Withdrawal to ${upiId}`,
            status: 'pending'
        });
        await transaction.save();
        
        res.json({
            balance: user.balance,
            transactionId: transaction._id
        });
    } catch (error) {
        console.error('Withdraw error:', error);
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/wallet/transactions', verifyToken, async (req, res) => {
    try {
        const user = await User.findOne({ uid: req.user.uid });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const transactions = await Transaction.find({ userId: user._id })
            .sort({ createdAt: -1 })
            .limit(20);
        
        res.json(transactions);
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Game operations
app.get('/api/game/current', async (req, res) => {
    try {
        // Get current round (in a real app, this would be more sophisticated)
        const now = new Date();
        const roundDuration = 3 * 60 * 1000; // 3 minutes
        
        // Find the current round (where endTime > now)
        let currentRound = await GameRound.findOne({ endTime: { $gt: now } })
            .sort({ roundNumber: -1 });
        
        if (!currentRound) {
            // Create new round if none exists
            const lastRound = await GameRound.findOne().sort({ roundNumber: -1 });
            const newRoundNumber = lastRound ? lastRound.roundNumber + 1 : 100000;
            
            currentRound = new GameRound({
                roundNumber: newRoundNumber,
                result: null, // Will be set when round ends
                startTime: now,
                endTime: new Date(now.getTime() + roundDuration)
            });
            await currentRound.save();
        }
        
        const timeLeft = Math.max(0, currentRound.endTime - now);
        
        res.json({
            roundNumber: currentRound.roundNumber,
            timeLeft: Math.floor(timeLeft / 1000), // in seconds
            result: currentRound.result
        });
    } catch (error) {
        console.error('Get current game error:', error);
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/game/history', async (req, res) => {
    try {
        const history = await GameRound.find({ result: { $ne: null } })
            .sort({ roundNumber: -1 })
            .limit(20);
        
        res.json(history);
    } catch (error) {
        console.error('Get game history error:', error);
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/game/bet', verifyToken, async (req, res) => {
    try {
        const { roundNumber, color, amount } = req.body;
        
        if (!['red', 'green', 'violet'].includes(color)) {
            return res.status(400).json({ error: 'Invalid color' });
        }
        
        if (!amount || amount < 10) {
            return res.status(400).json({ error: 'Minimum bet amount is ₹10' });
        }
        
        const user = await User.findOne({ uid: req.user.uid });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        if (user.balance < amount) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }
        
        // Check if round is still open
        const round = await GameRound.findOne({ roundNumber });
        if (!round || round.endTime < new Date()) {
            return res.status(400).json({ error: 'Round is closed' });
        }
        
        // Deduct balance
        user.balance -= amount;
        await user.save();
        
        // Create transaction
        const transaction = new Transaction({
            userId: user._id,
            type: 'bet',
            amount: amount,
            description: `Bet on ${color} for round ${roundNumber}`,
            status: 'completed'
        });
        await transaction.save();
        
        // Place bet
        const bet = new Bet({
            userId: user._id,
            roundNumber,
            color,
            amount,
            status: 'pending'
        });
        await bet.save();
        
        res.json({
            balance: user.balance,
            betId: bet._id
        });
    } catch (error) {
        console.error('Place bet error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Admin endpoints
const verifyAdmin = async (req, res, next) => {
    const token = req.headers.authorization?.split('Bearer ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        
        // Check if user is admin (in a real app, this would check a database)
        if (decodedToken.uid !== process.env.ADMIN_UID) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error('Error verifying admin token:', error);
        res.status(401).json({ error: 'Unauthorized' });
    }
};

app.get('/api/admin/users', verifyAdmin, async (req, res) => {
    try {
        const users = await User.find().sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/admin/transactions', verifyAdmin, async (req, res) => {
    try {
        const { type, status } = req.query;
        const query = {};
        
        if (type) query.type = type;
        if (status) query.status = status;
        
        const transactions = await Transaction.find(query)
            .populate('userId', 'phoneNumber')
            .sort({ createdAt: -1 })
            .limit(50);
        
        res.json(transactions);
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/admin/transactions/:id/approve', verifyAdmin, async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        
        if (transaction.type !== 'withdraw') {
            return res.status(400).json({ error: 'Only withdrawals can be approved' });
        }
        
        transaction.status = 'completed';
        await transaction.save();
        
        res.json(transaction);
    } catch (error) {
        console.error('Approve transaction error:', error);
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/admin/transactions/:id/reject', verifyAdmin, async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        
        if (transaction.type !== 'withdraw') {
            return res.status(400).json({ error: 'Only withdrawals can be rejected' });
        }
        
        // Refund the amount
        await User.findByIdAndUpdate(
            transaction.userId,
            { $inc: { balance: transaction.amount } }
        );
        
        transaction.status = 'rejected';
        await transaction.save();
        
        res.json(transaction);
    } catch (error) {
        console.error('Reject transaction error:', error);
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/admin/game/result', verifyAdmin, async (req, res) => {
    try {
        const { roundNumber, result } = req.body;
        
        if (!['red', 'green', 'violet'].includes(result)) {
            return res.status(400).json({ error: 'Invalid result' });
        }
        
        const round = await GameRound.findOne({ roundNumber });
        if (!round) {
            return res.status(404).json({ error: 'Round not found' });
        }
        
        if (round.result) {
            return res.status(400).json({ error: 'Round already has a result' });
        }
        
        // Set result
        round.result = result;
        await round.save();
        
        // Calculate payouts
        const winningBets = await Bet.find({
            roundNumber,
            color: result,
            status: 'pending'
        });
        
        const multiplier = {
            red: 2,
            green: 5,
            violet: 10
        };
        
        for (const bet of winningBets) {
            const payout = bet.amount * multiplier[result];
            
            // Update user balance
            await User.findByIdAndUpdate(
                bet.userId,
                { $inc: { balance: payout } }
            );
            
            // Create transaction
            const transaction = new Transaction({
                userId: bet.userId,
                type: 'win',
                amount: payout,
                description: `Won from ${result} bet on round ${roundNumber}`,
                status: 'completed'
            });
            await transaction.save();
            
            // Update bet
            bet.payout = payout;
            bet.status = 'won';
            await bet.save();
        }
        
        // Mark losing bets
        await Bet.updateMany(
            {
                roundNumber,
                color: { $ne: result },
                status: 'pending'
            },
            { status: 'lost' }
        );
        
        res.json(round);
    } catch (error) {
        console.error('Set game result error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
