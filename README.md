# Bashenga Coin

<a href="https://pngtree.com/so/black" target="_blank">
 <img src="https://i.ibb.co/HXq1CSX/Pngtree-black-panther-mascot-logo-for-5622088.png" alt="black png from pngtree.com" width="240" height="300" border="0" />
</a>

Bashenga Coin is a simple implementation of a blockchain-based cryptocurrency. This project was created for educational purposes and should not be used in a production environment.

## Getting Started

### Prerequisites

To run Bashenga Coin, you need to have Node.js installed on your machine. You can download it from the official website: https://nodejs.org/

### Installing

1. Clone this repository to your local machine.

```sh
git clone https://github.com/BenMishael/bashenga-coin.git
```

2. Go to the folder "bashenga-coin":

```sh
cd bashenga-coin
```

4. Install the required packages by running `npm install`.

```sh
npm install
```

5. Open 3 terminals simultaneously and type for each one of them those commands:

- For Terminal 1:
```sh
node ./p2p-full-nodes.js 3001 3002 3003
```

- For Terminal 2:
```sh
node ./p2p-wallet.js 3002 3003 3001
```

- For Terminal 3:
```sh
node ./p2p-wallet.js 3003 3001 3002
```

## How it works
The Bashenga Coin project is a Node.js-based implementation of a simple cryptocurrency. It utilizes the elliptic and fully-connected-topology libraries.

When you run the commands from before, it creates a new instance of the Bashenga Coin blockchain. The app then listens for connections from other nodes and connects to any peer nodes specified in the command line arguments.

When a new transaction is broadcasted to the network, each node adds it to their local transaction pool. Every few seconds, nodes check their transaction pool for pending transactions and attempt to add them to a new block in the blockchain. Once a block is mined, the miner broadcasts it to the network, and each node updates its local copy of the blockchain accordingly.

This project uses the Segregated Witness (SegWit) protocol, which involves using the witness property of the Transaction class to store the transaction signature in DER format. The witnesses property of the Block class stores the witnesses of all transactions in the block. Additionally, it uses a Merkle tree and a Bloom filter, which are commonly used in conjunction with SegWit to optimize transaction verification and reduce the size of the blockchain.

## Contributors:
- Ben Mishael ben.mishael@gmail.com
- Shimon Desta Desta101@gmail.com