import { ethers } from "ethers";


// import * as google from "@googleapis/forms";
// import { forms } from "@googleapis/forms";



// const forms = google.forms({
//     version: 'v1',
// });


// async function getFormsData() {
//     const res = await forms.forms.get({formId: formID});
//     console.log(res.data);
//     return res.data;
// }



const providerRPC = {
    oxcel: {
        name: '0xcel',
        rpc: 'RPC-API-ENDPOINT-HERE', // Insert your RPC URL here
        chainId: 2018, // // figure out testnet chainId,
    },
};


const provider = new ethers.JsonRpcProvider(
    providerRPC.oxcel.rpc, 
    {
        chainId: providerRPC.oxcel.chainId,
        name: providerRPC.oxcel.name,
    }
);

let mnemonic = ethers.Mnemonic.fromPhrase("inhale clown tiger ask machine print volcano blouse north carry pony report prosper check add autumn hope salt fold pigeon scale cushion around hint")

let signer = ethers.HDNodeWallet.fromMnemonic(mnemonic)


let tx = ethers.Transaction.from(
    {
        nonce: 0,
        gasPrice: ethers.parseUnits("10", "gwei"),
        gasLimit: 21000,
        to: "0x0000000000000000000000000000000000000000",
        value: ethers.parseUnits("1", "ether"),
    }
);

signtx(tx);



async function signtx(unsignedtx: ethers.Transaction) {
    console.log(tx)
    let signedtx_serialized = await signer.signTransaction(tx);
    console.log(signedtx_serialized)
    let signedtx = ethers.Transaction.from(signedtx_serialized)

    // signedtx.from = "0x85f0ad9533aea4fdc870a8b93b0f7e71c018efcd"

    console.log(signedtx)
}
