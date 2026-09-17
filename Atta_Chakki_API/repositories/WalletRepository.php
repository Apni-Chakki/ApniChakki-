<?php
namespace AttaChakki\Repositories;

// repository for User Wallets, Business Accounts, and Ledger Transactions
class WalletRepository extends BaseRepository
{
    // get wallet details for a user
    public function getUserWallet(int $userId): ?array
    {
        return $this->selectOne(
            "SELECT id, user_id, balance, updated_at FROM user_wallets WHERE user_id = ?",
            [$userId]
        );
    }

    // create wallet for a user if not exists
    public function createUserWallet(int $userId, float $initialBalance = 0.00): int
    {
        return $this->insert(
            "INSERT INTO user_wallets (user_id, balance) VALUES (?, ?)",
            [$userId, $initialBalance]
        );
    }

    // update user wallet balance
    public function updateUserBalance(int $userId, float $newBalance): int
    {
        return $this->execute(
            "UPDATE user_wallets SET balance = ? WHERE user_id = ?",
            [$newBalance, $userId]
        );
    }

    // get active primary business bank account
    public function getPrimaryBusinessAccount(): ?array
    {
        return $this->selectOne(
            "SELECT id, account_name, bank_name, account_number, iban, balance, is_primary, is_active 
             FROM business_accounts 
             WHERE is_primary = 1 AND is_active = 1 
             LIMIT 1"
        );
    }

    // update business account balance
    public function updateBusinessBalance(int $accountId, float $newBalance): int
    {
        return $this->execute(
            "UPDATE business_accounts SET balance = ? WHERE id = ?",
            [$newBalance, $accountId]
        );
    }

    // log a transaction in wallet_transactions table
    public function logWalletTransaction(int $userId, string $type, float $amount, string $description, float $balanceBefore, float $balanceAfter): int
    {
        return $this->insert(
            "INSERT INTO wallet_transactions (user_id, transaction_type, amount, description, balance_before, balance_after, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, NOW())",
            [$userId, $type, $amount, $description, $balanceBefore, $balanceAfter]
        );
    }

    // record a payment entry in payments table
    public function recordPayment(int $orderId, float $amount, string $method, ?string $transactionId = null): int
    {
        return $this->insert(
            "INSERT INTO payments (order_id, amount, payment_method, transaction_id, created_at) 
             VALUES (?, ?, ?, ?, NOW())",
            [$orderId, $amount, $method, $transactionId]
        );
    }
}
