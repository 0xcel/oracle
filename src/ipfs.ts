import { create } from 'ipfs-http-client';

const GLOBAL_URL = 'https://ipfs.io';

// Creates and returns a new IPFS client that will be used to connect to the IPFS node
// make reads and writes.
const createClient = (url: string) => {
    const client = create({ url });
    return client
}

// Writes data from the IPFS node. Returns the CID of the resulting data.
const write = async (data: string) => {
    console.log("CREATING IPFS CLIENT...");
    const client = createClient(GLOBAL_URL);
    console.log("CLIENT CREATED");
    const { cid } = await client.add(data);
    console.log("CID: " + cid);
    return cid;
}

// Reads data from the IPFS node given a CID. Returns the data.
const read = (cid: string) => {

}

write("Hello World");

