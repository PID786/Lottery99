import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, Alert } from 'react-native';
import auth from '@react-native-firebase/auth';

const App = () => {
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const [currentBet, setCurrentBet] = useState(10);
  const [bets, setBets] = useState({ red: 0, green: 0, violet: 0 });
  const [round, setRound] = useState(123456);
  const [timeLeft, setTimeLeft] = useState(180);
  const [history, setHistory] = useState([]);
  const [showWallet, setShowWallet] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [confirm, setConfirm] = useState(null);

  // Mock game history
  useEffect(() => {
    const mockHistory = [];
    const colors = ['red', 'green', 'violet'];
    
    for (let i = 0; i < 10; i++) {
      mockHistory.push({
        round: round - i - 1,
        result: colors[Math.floor(Math.random() * colors.length)],
        time: new Date(Date.now() - (i * 180 * 1000)).toLocaleTimeString()
      });
    }
    
    setHistory(mockHistory);
  }, []);

  // Game timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // End round and start new one
          endRound();
          setRound(prevRound => prevRound + 1);
          return 180;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const placeBet = (color) => {
    if (!user) {
      setShowLogin(true);
      return;
    }
    
    if (currentBet > balance) {
      Alert.alert('Insufficient Balance', 'You do not have enough balance to place this bet.');
      return;
    }
    
    setBets(prev => ({
      ...prev,
      [color]: prev[color] + currentBet
    }));
    
    setBalance(prev => prev - currentBet);
  };

  const endRound = () => {
    // Determine result
    const random = Math.random();
    let result;
    
    if (random < 0.45) result = 'red';
    else if (random < 0.75) result = 'green';
    else result = 'violet';
    
    // Calculate winnings
    const multiplier = {
      red: 2,
      green: 5,
      violet: 10
    };
    
    if (bets[result] > 0) {
      const winnings = bets[result] * multiplier[result];
      setBalance(prev => prev + winnings);
      Alert.alert('You Won!', `You won ₹${winnings} on ${result}!`);
    } else {
      Alert.alert('Round Ended', `The result was ${result}. Better luck next time!`);
    }
    
    // Update history
    setHistory(prev => [{
      round: round,
      result: result,
      time: new Date().toLocaleTimeString()
    }, ...prev.slice(0, 9)]);
    
    // Reset bets
    setBets({ red: 0, green: 0, violet: 0 });
  };

  const sendOtp = async () => {
    if (!phone || phone.length !== 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid 10-digit phone number');
      return;
    }
    
    // In a real app, this would send OTP via Firebase
    setShowOtp(true);
    Alert.alert('OTP Sent', 'OTP 123456 has been sent to your phone (demo)');
  };

  const verifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter a 6-digit OTP');
      return;
    }
    
    // In a real app, this would verify OTP via Firebase
    if (otp === '123456') {
      // Mock successful login
      setUser({
        uid: 'demo-user-' + Math.random().toString(36).substring(7),
        phoneNumber: '+91' + phone
      });
      setBalance(1000); // Default balance for demo
      setShowLogin(false);
      setShowOtp(false);
    } else {
      Alert.alert('Invalid OTP', 'Please enter the correct OTP (123456 for demo)');
    }
  };

  const deposit = () => {
    Alert.alert('Deposit', 'In a real app, this would open a payment gateway');
  };

  const withdraw = () => {
    Alert.alert('Withdraw', 'In a real app, this would submit a withdrawal request');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>Lottery99</Text>
        <TouchableOpacity style={styles.balanceContainer} onPress={() => setShowWallet(true)}>
          <Text style={styles.balance}>₹{balance.toFixed(2)}</Text>
          <Text style={styles.walletText}>Wallet</Text>
        </TouchableOpacity>
      </View>
      
      {/* Game Timer */}
      <View style={styles.timerContainer}>
        <Text style={styles.timer}>{formatTime(timeLeft)}</Text>
        <Text style={styles.round}>Round: {round}</Text>
      </View>
      
      {/* History */}
      <View style={styles.historyContainer}>
        <Text style={styles.historyTitle}>Previous Results</Text>
        <ScrollView horizontal style={styles.historyItems}>
          {history.map((item, index) => (
            <View key={index} style={[styles.historyItem, 
              { backgroundColor: item.result === 'red' ? '#e74c3c' : 
                                item.result === 'green' ? '#2ecc71' : '#9b59b6' }]}>
              <Text style={styles.historyItemText}>{item.result.charAt(0).toUpperCase()}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
      
      {/* Color Options */}
      <View style={styles.colorOptions}>
        <TouchableOpacity 
          style={[styles.colorOption, { backgroundColor: '#e74c3c' }]}
          onPress={() => placeBet('red')}>
          <Text style={styles.colorName}>RED</Text>
          <Text style={styles.multiplier}>2x</Text>
          <Text style={styles.betAmount}>₹{bets.red}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.colorOption, { backgroundColor: '#2ecc71' }]}
          onPress={() => placeBet('green')}>
          <Text style={styles.colorName}>GREEN</Text>
          <Text style={styles.multiplier}>5x</Text>
          <Text style={styles.betAmount}>₹{bets.green}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.colorOption, { backgroundColor: '#9b59b6' }]}
          onPress={() => placeBet('violet')}>
          <Text style={styles.colorName}>VIOLET</Text>
          <Text style={styles.multiplier}>10x</Text>
          <Text style={styles.betAmount}>₹{bets.violet}</Text>
        </TouchableOpacity>
      </View>
      
      {/* Bet Controls */}
      <View style={styles.betControls}>
        <View style={styles.amountButtons}>
          {[10, 50, 100, 500, 1000].map(amount => (
            <TouchableOpacity 
              key={amount}
              style={styles.amountButton}
              onPress={() => setCurrentBet(amount)}>
              <Text style={styles.amountButtonText}>{amount}</Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <View style={styles.currentAmount}>
          <TextInput
            style={styles.amountInput}
            keyboardType="numeric"
            value={currentBet.toString()}
            onChangeText={text => setCurrentBet(parseInt(text) || 0)}
          />
          <TouchableOpacity style={styles.betButton}>
            <Text style={styles.betButtonText}>BET</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Bottom Navigation */}
      <View style={styles.nav}>
        <TouchableOpacity style={styles.navButton}>
          <Text style={styles.navButtonText}>Game</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton}>
          <Text style={styles.navButtonText}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={() => setShowWallet(true)}>
          <Text style={styles.navButtonText}>Wallet</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton}>
          <Text style={styles.navButtonText}>Profile</Text>
        </TouchableOpacity>
      </View>
      
      {/* Wallet Modal */}
      <Modal visible={showWallet} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Wallet</Text>
            <TouchableOpacity onPress={() => setShowWallet(false)}>
              <Text style={styles.closeButton}>Close</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.walletBalance}>
            <Text style={styles.balanceTitle}>Current Balance</Text>
            <Text style={styles.balanceAmount}>₹{balance.toFixed(2)}</Text>
          </View>
          
          <View style={styles.walletActions}>
            <TouchableOpacity style={styles.actionButton} onPress={deposit}>
              <Text style={styles.actionButtonText}>Deposit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={withdraw}>
              <Text style={styles.actionButtonText}>Withdraw</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.transactionTitle}>Transaction History</Text>
          <ScrollView style={styles.transactionList}>
            {[
              { type: 'deposit', amount: 500, status: 'completed', date: '10 mins ago' },
              { type: 'bet', amount: 100, status: 'completed', date: '30 mins ago' },
              { type: 'win', amount: 500, status: 'completed', date: '1 hour ago' },
              { type: 'withdraw', amount: 1000, status: 'pending', date: '2 days ago' }
            ].map((txn, index) => (
              <View key={index} style={styles.transactionItem}>
                <View>
                  <Text style={styles.transactionType}>
                    {txn.type === 'deposit' ? 'Deposit' : 
                     txn.type === 'withdraw' ? 'Withdrawal' : 
                     txn.type === 'bet' ? 'Bet Placed' : 'Win'}
                  </Text>
                  <Text style={styles.transactionDate}>{txn.date}</Text>
                </View>
                <Text style={[
                  styles.transactionAmount,
                  { color: txn.type === 'win' ? '#2ecc71' : txn.type === 'deposit' ? '#3498db' : '#e74c3c' }
                ]}>
                  {txn.type === 'win' || txn.type === 'deposit' ? '+' : '-'}₹{txn.amount}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
      
      {/* Login Modal */}
      <Modal visible={showLogin} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Login / Register</Text>
            <TouchableOpacity onPress={() => setShowLogin(false)}>
              <Text style={styles.closeButton}>Close</Text>
            </TouchableOpacity>
          </View>
          
          {!showOtp ? (
            <View style={styles.loginForm}>
              <Text style={styles.inputLabel}>Mobile Number</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter 10-digit mobile number"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                maxLength={10}
              />
              
              <TouchableOpacity style={styles.loginButton} onPress={sendOtp}>
                <Text style={styles.loginButtonText}>Send OTP</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.loginForm}>
              <Text style={styles.inputLabel}>Enter OTP</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter 6-digit OTP"
                keyboardType="numeric"
                value={otp}
                onChangeText={setOtp}
                maxLength={6}
              />
              
              <TouchableOpacity style={styles.loginButton} onPress={verifyOtp}>
                <Text style={styles.loginButtonText}>Verify OTP</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2c3e50',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#e74c3c',
  },
  logo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  balance: {
    color: 'white',
    fontWeight: 'bold',
    marginRight: 10,
  },
  walletText: {
    color: 'white',
  },
  timerContainer: {
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'rgba(0,0,0,0.3)',
    margin: 10,
    borderRadius: 10,
  },
  timer: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#f39c12',
  },
  round: {
    color: 'rgba(255,255,255,0.8)',
  },
  historyContainer: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 10,
    marginHorizontal: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  historyTitle: {
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 10,
  },
  historyItems: {
    flexDirection: 'row',
  },
  historyItem: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  historyItemText: {
    color: 'white',
    fontWeight: 'bold',
  },
  colorOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 10,
    marginBottom: 10,
  },
  colorOption: {
    flex: 1,
    marginHorizontal: 5,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  colorName: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5,
  },
  multiplier: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 5,
  },
  betAmount: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  betControls: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 15,
    marginHorizontal: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  amountButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  amountButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 10,
    borderRadius: 5,
    minWidth: 60,
    alignItems: 'center',
    marginBottom: 10,
  },
  amountButtonText: {
    color: 'white',
  },
  currentAmount: {
    flexDirection: 'row',
  },
  amountInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: 'white',
    padding: 10,
    borderRadius: 5,
    marginRight: 10,
    textAlign: 'center',
  },
  betButton: {
    backgroundColor: '#f39c12',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  betButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  nav: {
    flexDirection: 'row',
    backgroundColor: '#e74c3c',
    paddingVertical: 10,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
  },
  navButtonText: {
    color: 'white',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#2c3e50',
    padding: 15,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingBottom: 15,
  },
  modalTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    color: 'white',
  },
  walletBalance: {
    alignItems: 'center',
    marginBottom: 20,
  },
  balanceTitle: {
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 5,
  },
  balanceAmount: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  walletActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 5,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  transactionTitle: {
    color: 'white',
    fontSize: 16,
    marginBottom: 10,
  },
  transactionList: {
    flex: 1,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  transactionType: {
    color: 'white',
    fontWeight: 'bold',
  },
  transactionDate: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  transactionAmount: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  loginForm: {
    flex: 1,
    justifyContent: 'center',
  },
  inputLabel: {
    color: 'white',
    marginBottom: 5,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: 'white',
    padding: 15,
    borderRadius: 5,
    marginBottom: 20,
  },
  loginButton: {
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  loginButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default App;
