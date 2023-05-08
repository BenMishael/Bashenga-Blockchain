// Import required modules
const SHA256 = require('crypto-js/sha256'); // import the SHA256 hashing function from the crypto-js library
const EC = require('elliptic').ec; // import the elliptic curve cryptography library
const ec = new EC('secp256k1'); // instantiate the elliptic curve cryptography object with the secp256k1 curve
const { MerkleTree } = require('merkletreejs'); // import the Merkle Tree implementation from the merkletreejs library
const { PartitionedBloomFilter } = require('bloom-filters'); // import the Partitioned Bloom Filter implementation from the bloom-filters library

// Define constants
const MAX_TRANS_PER_BLOCK = 4; // maximum number of transactions per block
const DIFFICULTY = 2; // mining difficulty level
const MINING_REWARD = 40; // reward for mining a block
const REWARD_PER_TRANS = 3; // reward for including a transaction in a block
const TRANS_FEE = 2; // fee charged for each transaction
const START_BALANCE = 200; // starting balance for each user
const BLOOM_FILTER_SIZE = 128; // size of the bloom filter in bits
const NUM_OF_HASH_FUNCS = 4; // number of hash functions used by the bloom filter
const LOAD_FACTOR_NUM = 0.5; // load factor for the bloom filter, used to calculate the optimal size of the filter

class Transaction {
  constructor(fromAddress, toAddress, amount) {
    // Initialize the properties of the transaction object
    this.fromAddress = fromAddress;
    this.toAddress = toAddress;
    this.amount = amount;
    this.witness = null; // The witness property will store the signature of the transaction
    this.timestamp = Date.now(); // Timestamp property stores the time when the transaction was created
  }

  // The calculateHash method is used to calculate the hash of the transaction
  calculateHash = () => SHA256(this.fromAddress + this.toAddress + this.amount + this.timestamp).toString()

  // The signTransaction method is used to sign the transaction using a private key
  signTransaction = (signingKey) => {
    // Check if the public key of the signing key matches the fromAddress of the transaction
    if (signingKey.getPublic('hex') !== this.fromAddress) {
      throw new Error('You cannot sign transaction for other wallets');
    }
    // Calculate the hash of the transaction
    const hashTx = this.calculateHash();
    // Sign the hash using the private key and convert the signature to DER format
    const sig = signingKey.sign(hashTx, 'base64');
    this.witness = sig.toDER('hex'); // Set the witness property to the signature in DER format
    delete this.signature // Remove the signature property from the transaction object
  }

  // The isValid method is used to check if the transaction is valid
  isValid = () => {
    // Check if the fromAddress is null, which indicates a mining reward transaction
    if (this.fromAddress === null) return true;
    // Check if the witness property exists and is not empty
    if (!this.witness || this.witness.length === 0) {
      throw new Error('No witness in this transaction');
    }
    // Verify the signature using the public key of the fromAddress
    const publicKey = ec.keyFromPublic(this.fromAddress, 'hex');
    return publicKey.verify(this.calculateHash(), this.witness);
  }

}

class Block {
  constructor(timestamp, transactions, previousHash = '') {
    this.previousHash = previousHash; // Hash of the previous block in the chain
    this.timestamp = timestamp; // Timestamp when the block was created
    this.transactions = transactions; // List of transactions in the block
    this.hash = this.calculateHash(); // Hash of the block
    this.nonce = 0; // Nonce used in the proof of work algorithm
    this.witnesses = transactions.map(tx => tx.witness); // List of witnesses for each transaction in the block

    // create a Merkle Tree from the list of transactions
    const leaves = transactions.map(x => SHA256(x));
    this.tree = new MerkleTree(leaves, SHA256);

    // create a Partitioned Bloom Filter to store hashes of transactions in the block
    this.filter = new PartitionedBloomFilter(BLOOM_FILTER_SIZE, NUM_OF_HASH_FUNCS, LOAD_FACTOR_NUM);

    // add hashes of transactions to the filter
    for (const trx of this.transactions) {
      this.filter.add(trx.calculateHash());
    }
  }

  // check if a given transaction exists in the block
  ifTransactionExists = (transaction) => this.filter.has(transaction.calculateHash())

  // calculate the hash of the block
  calculateHash = () => SHA256(this.previousHash + this.timestamp + JSON.stringify(this.transactions.map(({ witness, ...rest }) => rest)) + this.nonce).toString()

  // mine the block using proof of work algorithm
  mineBlock = (difficulty) => {
    while (this.hash.substring(0, difficulty) !== '0'.repeat(difficulty)) {
      this.nonce++;
      this.hash = this.calculateHash();
    }
    console.log('Block mined', this.hash);
  }

  // check if all transactions in the block are valid
  hasValidTransactions = () => this.transactions.every(tx => tx.isValid())
}


class Blockchain {
  constructor() {
    this.chain = [this.createGenesisBlock()]; // Initialize the blockchain with a genesis block
    this.maxTransPerBlock = MAX_TRANS_PER_BLOCK; // Maximum transactions allowed per block
    this.difficulty = DIFFICULTY; // Difficulty of mining
    this.pendingTransactions = []; // Pending transactions to be mined in the next block
    this.miningReward = MINING_REWARD; // Mining reward for the miner who mines a block
    this.burnMoney = 0; // Amount of money burned in the blockchain
    this.miningMoney = 0; // Amount of money earned by miners through mining rewards
  }

  // Creates the genesis block of the blockchain
  createGenesisBlock = () => new Block('01/01/2023', [], '0');

  // Gets the latest block in the blockchain
  getLatestBlock = () => this.chain[this.chain.length - 1];

  // Mines the pending transactions in a new block and adds it to the blockchain
  minePendingTransaction = (miningRewardAddress) => {
    let miningReward = this.miningReward;
    // Add mining rewards and burn fees for each pending transaction
    for (const transaction of this.pendingTransactions) {
      miningReward += REWARD_PER_TRANS;
      this.burnMoney += TRANS_FEE;
      this.miningMoney += transaction.amount;
    }
    // Create a new transaction for the miner's reward
    const rewardTx = new Transaction(null, miningRewardAddress, miningReward);
    this.pendingTransactions.push(rewardTx);
    // Create a new block with the pending transactions and add it to the blockchain
    const block = new Block(Date.now(), this.pendingTransactions, this.getLatestBlock().hash);
    block.mineBlock(this.difficulty); // Mine the new block
    console.log('block successfully mined');
    this.chain.push(block);
    this.pendingTransactions = []; // Clear the list of pending transactions
  };

  // Gets the balance of a given wallet address
  getBalanceOfAddress = (address) => {
    let balance = START_BALANCE;
    for (let i = 1; i < this.chain.length; i++) {
      for (const trans of this.chain[i].transactions) {
        if (trans.fromAddress === address) {
          balance -= TRANS_FEE; // Subtract the fee for sending a transaction
        }
        if (trans.toAddress === address) {
          balance += trans.amount; // Add the amount received from a transaction
        }
      }
    }
    return balance;
  };

    // Add a new transaction to the list of pending transactions
  addTransaction = (transaction) => {
    // Make sure that the transaction has both a sender and a recipient address
    if (!transaction.fromAddress || !transaction.toAddress) {
      throw new Error('Transaction must include from and to address');
    }
    
    // Validate the transaction before adding it to the chain
    if (!transaction.isValid()) {
      throw new Error('Cannot add invalid transaction to chain');
    }
    
    // Check if the sender has enough funds to make the transaction
    if (this.getBalanceOfAddress(transaction.fromAddress) - transaction.amount - this.chain.length < 0) {
      throw new Error('Not enough money in the wallet');
    }
    
    // Check if the maximum number of transactions per block has been reached
    if (this.pendingTransactions.length >= MAX_TRANS_PER_BLOCK) {
      throw new Error(`The block is full. Maximum transactions per block is ${MAX_TRANS_PER_BLOCK}`);
    }
    
    // Check if the transaction already exists in the chain
    if (this.ifTransactionExistsInBlockchain(transaction)) {
      throw new Error('Transaction already exists in the chain');
    }
    
    // Add the transaction to the list of pending transactions
    this.pendingTransactions.push(transaction);
  };

  // Check if the blockchain is valid by verifying each block in the chain
  isChainValid = () => {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];
      
      // Check if the transactions in the block are valid
      if (!currentBlock.hasValidTransactions()) {
        return false;
      }
      
      // Check if the current block's hash is valid
      if (currentBlock.hash !== currentBlock.calculateHash()) {
        return false;
      }
      
      // Check if the current block's previous hash matches the previous block's hash
      if (currentBlock.previousHash !== previousBlock.hash) {
        return false;
      }
    }
    
    // If all checks pass, return true to indicate that the blockchain is valid
    return true;
  };

  // Check if a transaction already exists in the blockchain
  ifTransactionExistsInBlockchain = (transaction) => {
    for (const block of this.chain) {
      if (block.ifTransactionExists(transaction)) {
        return true;
      }
    }
    return false;
  };

  // Get the maximum number of transactions per block
  getNumOfTransPerBlock = () => this.maxTransPerBlock;
}

module.exports.Blockchain = Blockchain;
module.exports.Block = Block;
module.exports.Transaction = Transaction;
