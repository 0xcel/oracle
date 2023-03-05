import { ethers } from "ethers";
import {createHash} from "crypto";
const Web3 = require("web3");
// Bearer token:
let BearerToken = "AAAAAAAAAAAAAAAAAAAAAMuFfAEAAAAAYDTDc%2BARrFKsYA89XfYBMhz4Mv4%3DrmKQ5BkwZrWYoVVB1atRXnq1olLl46yXlqC5pgSGQVdImwXUut"
// Get Tweet objects by ID, using bearer token authentication
// https://developer.twitter.com/en/docs/twitter-api/tweets/lookup/quick-start

const needle = require('needle');

const token = BearerToken;
// urls for creating stream of recent tweets
const rulesURL = 'https://api.twitter.com/2/tweets/search/stream/rules';
const streamURL = 'https://api.twitter.com/2/tweets/search/stream?expansions=author_id&user.fields=username';
// filter data in stream to only be tweets w/ given hashtag
const rules = [{
        'value': '#0xcel',
        'tag': '0xcel hashtag'
    },
];

const node_url = 'http://0.0.0.0:8545'

// mnemonic for oracle signer
let mnemonic = ethers.Mnemonic.fromPhrase("inhale clown tiger ask machine print volcano blouse north carry pony report prosper check add autumn hope salt fold pigeon scale cushion around hint")
let signer = ethers.HDNodeWallet.fromMnemonic(mnemonic)
// web3 client of local node
let eth_client = new Web3(node_url)


async function getAllRules() {

    const response = await needle('get', rulesURL, {
        headers: {
            "authorization": `Bearer ${token}`
        }
    })

    if (response.statusCode !== 200) {
        console.log("Error:", response.statusMessage, response.statusCode)
        throw new Error(response.body);
    }

    return (response.body);
}

async function deleteAllRules(rules : any) {

    if (!Array.isArray(rules.data)) {
        return null;
    }

    const ids = rules.data.map((rule : any) => rule.id);

    const data = {
        "delete": {
            "ids": ids
        }
    }

    const response = await needle('post', rulesURL, data, {
        headers: {
            "content-type": "application/json",
            "authorization": `Bearer ${token}`
        }
    })

    if (response.statusCode !== 200) {
        throw new Error(response.body);
    }

    return (response.body);

}

async function setRules() {

    const data = {
        "add": rules
    }

    const response = await needle('post', rulesURL, data, {
        headers: {
            "content-type": "application/json",
            "authorization": `Bearer ${token}`
        }
    })

    if (response.statusCode !== 201) {
        throw new Error(response.body);
    }

    return (response.body);

}

function streamConnect(retryAttempt : any) {

    const stream = needle.get(streamURL, {
        headers: {
            "User-Agent": "v2FilterStreamJS",
            "Authorization": `Bearer ${token}`
        },
        timeout: 20000
    });

    stream.on('data', async (data : any) => {
        try {
            const json = JSON.parse(data);
            let sender_username = getSender(json)
            let txData = await getTxDataIPFS(json)
            console.log(`tx data ${txData} found for sender ${sender_username} with sender address ${addressFromUsername(sender_username)}`)
            // construct transaction according to data from ipfs
            let tx = await makeTx(txData, addressFromUsername(sender_username))
            // broadcast tx to node
            broadcast_tx(tx, addressFromUsername(sender_username))
            // A successful connection resets retry count.
            retryAttempt = 0;
        } catch (e) {
            if (data.detail === "This stream is currently at the maximum allowed connection limit.") {
                console.log(data.detail)
                process.exit(1)
            } else {
                // Keep alive signal received. Do nothing.
            }
        }
    }).on('err', (error : any) => {
        if (error.code !== 'ECONNRESET') {
            console.log(error.code);
            process.exit(1);
        } else {
            // This reconnection logic will attempt to reconnect when a disconnection is detected.
            // To avoid rate limits, this logic implements exponential backoff, so the wait time
            // will increase if the client cannot reconnect to the stream. 
            setTimeout(() => {
                console.warn("A connection error occurred. Reconnecting...")
                streamConnect(++retryAttempt);
            }, 2 ** retryAttempt)
        }
    });

    return stream;

}

function getSender(json : any) {
    let users = json['includes']['users']
    for (let i = 0; i < users.length; i++) {
        // check if user is author of tweet
        if (users[i].id === json['data']['author_id']) {
            return users[i].username
        }
    }
}

async function getTxDataIPFS(json : any){
    let URL = json['data']['text'].split("\n\n")[0]
    // get request with needle
    console.log(URL)
    const response = await fetch(URL)
    const body = await response.json()
    return body
}

async function makeTx(txData : any, sender_address : any) {
    console.log("making tx")
    try{
        let nonce = await getNonce(sender_address)
        let tx = ethers.Transaction.from(
            {
                nonce: nonce,
                gasPrice: ethers.parseUnits("10", "gwei"),
                gasLimit: 21000,
                to: addressFromUsernameOrHex(txData.to),
                value: ethers.parseUnits(txData.value, "ether"),
                chainId: 9000,
            }
        )

        let serialized_tx = await signer.signTransaction(tx);
        console.log('tx', serialized_tx)
        return serialized_tx
    } catch(e) {
        console.log('error', e)
    }
}

async function getNonce(address : any) {
    return eth_client.eth.getTransactionCount(address, "latest", (error : any, nonce : any) => {
        if (error) {
            console.log(error);
        } else {
            console.log('nonce', nonce)
            return nonce
        }
    });
}

// get the twitter-ethereum address of the to-field of tx-data posted to IPFS
function addressFromUsernameOrHex(addressOrUsername : any) {
    // check if the address is formatted as hex, if so return address
    if (addressOrUsername.substring(0, 2) == '0x' && addressOrUsername.length == 42) {
        return addressOrUsername
    }
    // return address derived from user-name
    return addressFromUsername(addressOrUsername)
}

function addressFromUsername(username : any) {
    // create sha-256 hash of twitter username
    let full_hash = createHash('sha256').update(username).digest('hex');
    return "0x" + full_hash.substring(full_hash.length - 40, full_hash.length)
}

async function broadcast_tx(tx : any, address_override : any) {
    // make request
    fetch(node_url, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
            jsonrpc: "2.0",
            id: 1,
            method: "eth_sendRawTransaction",
            params: [tx, address_override]
        })
    })
    .then(response => response.json())
    .then(response => console.log(JSON.stringify(response.statusCode)))
}

(async () => {
    let currentRules;

    try {
        // Gets the complete list of rules currently applied to the stream
        currentRules = await getAllRules();
        // Delete all rules. Comment the line below if you want to keep your existing rules.
        await deleteAllRules(currentRules);

        // Add rules to the stream. Comment the line below if you don't want to add new rules.
        await setRules();

    } catch (e) {
        console.error(e);
        process.exit(1);
    }

    // Listen to the stream.
    streamConnect(0);
})();
