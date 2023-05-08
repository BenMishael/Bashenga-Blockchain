// Import fully-connected-topology and elliptic library.
const topology = require('fully-connected-topology');// import the fully-connected-topology module
const EC = require('elliptic').ec; // import the elliptic curve cryptography module

// Create a new elliptic curve object using the secp256k1 curve.
const ec = new EC('secp256k1');

// Destructure process.argv to get command line arguments.
const { argv } = process;

// Extract the port number of this node and the port numbers of other nodes from the command line arguments.
const { me, peers } = extractPeersAndMyPort();

// Convert the port number of this node to its IP address (localhost).
const myIp = toLocalIp(me);

// Convert the port numbers of other nodes to their IP addresses (localhost).
const peerIps = getPeerIps(peers);

// Generate a new key pair using the elliptic curve object.
const key = ec.genKeyPair();

// Get the private key in hexadecimal format.
const privateKey = key.getPrivate('hex');

// Connect to the other nodes using fully-connected-topology.
topology(myIp, peerIps).on('connection', (socket, peerIp) => {
  // Extract the port number from the peer IP address.
  const peerPort = extractPortFromIp(peerIp);

  // If the peer port number is 3001, send this node's private key to that peer.
  if (peerPort === '3001') {
    socket.write(privateKey);
  }

  // When data is received from a peer, convert it to a string and print it to the console.
  socket.on('data', data => {
    console.log(data.toString('utf8'));
  });
});

// Extract the port numbers of this node and other nodes from the command line arguments.
function extractPeersAndMyPort() {
  return {
    me: argv[2],
    peers: argv.slice(3, argv.length),
  };
}

// Convert a port number to a local IP address (localhost).
function toLocalIp(port) {
  return `127.0.0.1:${port}`;
}

// Convert an array of port numbers to an array of local IP addresses (localhost).
function getPeerIps(peers) {
  return peers.map(peer => toLocalIp(peer));
}

// Extract the port number from a peer IP address.
function extractPortFromIp(peer) {
  return peer.toString().slice(peer.length - 4, peer.length);
}
