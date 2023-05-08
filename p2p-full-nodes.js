const topology = require('fully-connected-topology'); // import the fully-connected-topology module
const EC = require('elliptic').ec; // import the elliptic curve cryptography module
const ec = new EC('secp256k1'); // create an instance of the elliptic curve cryptography module
const { Blockchain, Transaction } = require('./blockchain'); // import the Blockchain and Transaction classes from the blockchain.js file
const fs = require('fs'); // import the file system module
const TOTAL_NUM_OF_WALLETS = 3 // set the total number of wallets to 3
const TRANSACTION_POOL_DIR = "./transactionpool.json"// set transactionpool file location to "./transactionpool.json"

// extract the process arguments and assign them to the me and peers variables
const { exit, argv } = process;
const { me, peers } = extractPeersAndMyPort();

// create an empty object to store sockets
const sockets = {};

// create a new instance of the Blockchain class (Bashenga Coin)
const bashenga = new Blockchain();

// get the local IP address and port number from the me variable
const myIp = toLocalIp(me);
// convert the peer port numbers to local IP addresses
const peerIps = getPeerIps(peers);

// create an empty key variable
let key;
// create an empty wallets object
const wallets = {};

// generate a new key pair using elliptic curve cryptography and add it to the wallets object
key = ec.genKeyPair();
wallets[me] = {
  privateKey: key.getPrivate('hex'),
  publicKey: key.getPublic('hex'),
  key,
};

// create an empty transaction pool array
let transactionpool = [];

// read the transaction pool data from the transactionpool.json file and add it to the transactionpool array
fs.readFile(TRANSACTION_POOL_DIR, 'utf8', (err, data) => {
  if (err) {
    console.error(err);
    return;
  }
  transactionpool = JSON.parse(data);
});

// set a random interval to execute the following code block
const random = Math.random() * 5000 + 5000;
let count = 0;

// run the following code repeatedly at random intervals
setInterval(() => {
  // check if the number of wallets created is less than the total number required
  if (Object.keys(wallets).length < TOTAL_NUM_OF_WALLETS) return;

  // iterate over the number of transactions per block
  for (let i = 0; i < bashenga.getNumOfTransPerBlock(); i++) {
    // create a new transaction using the sender and receiver's public keys and transaction amount
    const tx = new Transaction(
      wallets[transactionpool[count].fromAddress].publicKey,
      wallets[transactionpool[count].toAddress].publicKey,
      transactionpool[count].amount
    );

    // sign the transaction using the sender's private key
    tx.signTransaction(wallets[transactionpool[count].fromAddress].key);

    try {
      // add the transaction to the blockchain
      bashenga.addTransaction(tx);
      // notify the sender that the transaction was successful
      sockets[transactionpool[count].fromAddress].write('The transaction was successful');
    } catch (err) {
      // notify the sender of any errors that occurred while adding the transaction
      sockets[transactionpool[count].fromAddress].write(err.toString());
    }
    // move on to the next transaction in the transaction pool
    count++;
  }

  // mine the pending transactions using the miner's public key
  bashenga.minePendingTransaction(wallets[me].publicKey);

  // if all transactions have been processed, display the blockchain's statistics
  if (count === transactionpool.length) {
    let sum = 0;
    Object.keys(wallets).forEach(wallet => {
      sum += bashenga.getBalanceOfAddress(wallets[wallet].publicKey);
    });
    console.log(
      `Money were mined: ${bashenga.miningMoney}\nMoney were burned: ${
        bashenga.burnMoney
      }\nSum of money in all wallets: ${sum}\nBloom Filter: ${bashenga.ifTransactionExistsInBlockchain(
        new Transaction('3002', '3003', 742)
      )}`
    );
    // terminate the program
    exit(0);
  }
}, random);

// connect to peers using the topology library
topology(myIp, peerIps).on('connection', (socket, peerIp) => {
  // extract the port number from the peer's IP address
  const peerPort = extractPortFromIp(peerIp);
  // add the socket to the sockets object using the port number as the key
  sockets[peerPort] = socket;
  // when the socket receives data, extract the private key from the data and store it in the wallets object
  socket.on('data', data => {
    key = ec.keyFromPrivate(data.toString('utf8'));

    wallets[peerPort] = {
      privateKey: key.getPrivate('hex'),
      publicKey: key.getPublic('hex'),
      key,
    };
  });
});

// Extracts the port number for the current node and the list of peer nodes from the process arguments.
  function extractPeersAndMyPort() {
      return {
        me: argv[2], // the first argument after the script name is the port number for the current node
        peers: argv.slice(3, argv.length), // the rest of the arguments are the port numbers for the peer nodes
      };
  }
  
  // Converts a port number to a local IP address in the format '127.0.0.1:port'.
  function toLocalIp(port) {
    return `127.0.0.1:${port}`;
  }
  
  // Converts an array of port numbers to an array of local IP addresses in the format '127.0.0.1:port'.
  function getPeerIps(peers) {
    return peers.map(peer => toLocalIp(peer));
  }
  
  // Extracts the port number from a local IP address in the format '127.0.0.1:port'.
  function extractPortFromIp(peer) {
    const portStartIndex = peer.lastIndexOf(":") + 1;
    return peer.slice(portStartIndex);
  }

module.exports.any

//node ./p2p-full-nodes.js 3001 3002 3003
//node ./p2p-wallet.js 3002 3003 3001
//node ./p2p-wallet.js 3003 3001 3002