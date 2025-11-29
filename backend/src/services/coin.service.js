const User = require('../models/User');
const Transaction = require('../models/Transaction');
const pool = require('../config/database');

class CoinService {
  async addCoins(userId, amount, source, description) {
    // Validate amount limits to prevent integer overflow
    const MAX_COIN_AMOUNT = 1000000000; // 1 billion coins max
    const MIN_COIN_AMOUNT = -1000000000; // -1 billion coins min
    
    if (Math.abs(amount) > MAX_COIN_AMOUNT) {
      throw new Error(`Coin amount exceeds maximum limit of ${MAX_COIN_AMOUNT}`);
    }
    
    // Validate description length
    if (description && description.length > 500) {
      throw new Error('Description exceeds maximum length of 500 characters');
    }
    
    // Update user coins
    const user = await User.updateCoins(userId, amount);
    
    // Create transaction record
    await Transaction.create({
      user_id: userId,
      type: amount > 0 ? 'earned' : 'spent',
      amount: Math.abs(amount),
      source,
      description: description ? description.substring(0, 500) : description, // Truncate if too long
    });

    return user;
  }

  async spendCoins(userId, amount, source, description) {
    // Use atomic database operation to prevent race conditions
    // This ensures the check and update happen in a single transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check balance and deduct coins atomically
      const result = await client.query(`
        UPDATE users 
        SET coins = coins - $1,
            total_earned_coins = total_earned_coins
        WHERE id = $2 AND coins >= $1
        RETURNING id, coins, total_earned_coins
      `, [amount, userId]);
      
      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        throw new Error('Insufficient coins or user not found');
      }
      
      // Create transaction record
      await client.query(`
        INSERT INTO transactions (user_id, type, amount, source, description)
        VALUES ($1, $2, $3, $4, $5)
      `, [userId, 'spent', amount, source, description]);
      
      await client.query('COMMIT');
      
      return {
        coins: parseFloat(result.rows[0].coins),
        total_earned_coins: parseFloat(result.rows[0].total_earned_coins),
      };
    } catch (error) {
      await client.query('ROLLBACK');
      
      // Provide better error messages
      if (error.message.includes('Insufficient coins')) {
        throw error; // Re-throw as-is
      } else if (error.code && error.code.startsWith('23')) {
        // Database constraint violation
        throw new Error('Transaction failed due to data validation error');
      } else {
        console.error('Coin spending error:', {
          userId,
          amount,
          error: error.message,
          code: error.code,
        });
        throw new Error('Failed to process coin transaction. Please try again.');
      }
    } finally {
      client.release();
    }
  }

  async getBalance(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return {
      coins: parseFloat(user.coins) || 0,
      totalEarned: parseFloat(user.total_earned_coins) || 0,
    };
  }

  async getTransactions(userId, limit = 50, offset = 0) {
    return await Transaction.findByUserId(userId, limit, offset);
  }
}

module.exports = new CoinService();

