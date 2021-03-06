import {Transaction, script as bscript, opcodes, address, networks} from "bitcoinjs-lib";
// import {bit} from "bitcoin-ops"

// tslint:disable-next-line
const OPS = require("bitcoin-ops");
// tslint:disable-next-line
const REVERSE_OPS = require("bitcoin-ops/map");

// import {BtcAtomicSwapData} from "./atomic-swap";

export class AtomicSwapScriptTemplates {

    public static checkLockScript(lockScript: Buffer | string): boolean {
        if (typeof lockScript === "string") {
            lockScript = Buffer.from(lockScript, "hex");
        }

        const script = bscript.decompile(lockScript);
        const isValidScript =
            (script.length === 17) &&
            (script[0] === opcodes.OP_IF) &&
            (script[1] === opcodes.OP_RIPEMD160) &&
            (Buffer.isBuffer(script[2])) &&
            (script[3] === opcodes.OP_EQUALVERIFY) &&
            (script[4] === opcodes.OP_DUP) &&
            (script[5] === opcodes.OP_HASH160) &&
            (Buffer.isBuffer(script[6])) &&

            (script[7] === opcodes.OP_ELSE) &&
            (Buffer.isBuffer(script[8])) &&
            (script[9] === opcodes.OP_CHECKLOCKTIMEVERIFY) &&
            (script[10] === opcodes.OP_DROP) &&
            (script[11] === opcodes.OP_DUP) &&
            (script[12] === opcodes.OP_HASH160) &&
            (Buffer.isBuffer(script[13])) &&

            (script[14] === opcodes.OP_ENDIF) &&

            (script[15] === opcodes.OP_EQUALVERIFY) &&
            (script[16] === opcodes.OP_CHECKSIG);

        return isValidScript;
    }

    public static extractLockParams(lockScript: Buffer | string) {
        if (typeof lockScript === "string") {
            lockScript = Buffer.from(lockScript, "hex");
        }

        if (!this.checkLockScript(lockScript)) {
            throw new Error("Invalid lock script");
        }

        const script = bscript.decompile(lockScript);

        const secretHashBuffer: any = script[2];
        const recipientAddressBuffer: any = script[6];
        const lockTimeBuffer: any = script[8];
        const refundAddressBuffer: any = script[13];

        const secretHashHexStr = secretHashBuffer.toString("hex");
        const recipientAddressBase58check = address.toBase58Check(recipientAddressBuffer, networks.testnet.pubKeyHash);
        const lockTime = bscript.number.decode(lockTimeBuffer, 4, true);
        const refundAddressBase58check = address.toBase58Check(refundAddressBuffer, networks.testnet.pubKeyHash);

        return {secretHashHexStr, recipientAddressBase58check, lockTime, refundAddressBase58check};
    }

    // TODO: refundAddressBase58check, recipientAddressBase58check, secretHashHexStr
    public static lockScript(refundAddress: string, recipientAddress: string, lockTime: number, secretHashHexStr: string): Buffer {

        const secretHashBuffer = Buffer.from(secretHashHexStr, "hex");
        const recipientAddressBuffer = address.fromBase58Check(recipientAddress).hash;
        const lockTimeBuffer = bscript.number.encode(lockTime);
        const refundAddressBuffer = address.fromBase58Check(refundAddress).hash;

        const script = [];

        script.push(opcodes.OP_IF);
        script.push(opcodes.OP_RIPEMD160);
        script.push(secretHashBuffer);
        script.push(opcodes.OP_EQUALVERIFY);
        script.push(opcodes.OP_DUP);
        script.push(opcodes.OP_HASH160);
        script.push(recipientAddressBuffer);

        script.push(opcodes.OP_ELSE);
        script.push(lockTimeBuffer);
        script.push(opcodes.OP_CHECKLOCKTIMEVERIFY);
        script.push(opcodes.OP_DROP);
        script.push(opcodes.OP_DUP);
        script.push(opcodes.OP_HASH160);
        script.push(refundAddressBuffer);

        script.push(opcodes.OP_ENDIF);

        script.push(opcodes.OP_EQUALVERIFY);
        script.push(opcodes.OP_CHECKSIG);

        return bscript.compile(script);
    }

    public static redeemScript(lockScript: Buffer, sig: Buffer, pubkey: Buffer, secretHex: string): Buffer[] {
        const secretB = Buffer.from(secretHex, "hex");

        const witnessScript: any = lockScript;
        const witnessScriptStack = [];

        witnessScriptStack.push(sig);
        witnessScriptStack.push(pubkey);
        witnessScriptStack.push(secretB);

        witnessScriptStack.push(Buffer.from("01", "hex"));

        return [...witnessScriptStack, witnessScript];
    }

    public static refundScript(lockScript, sig, pubkey): Buffer[] {

        const witnessScript: any = lockScript;
        const witnessScriptStack = [];

        witnessScriptStack.push(sig);
        witnessScriptStack.push(pubkey);

        witnessScriptStack.push(Buffer.from("", "hex"));

        return [...witnessScriptStack, witnessScript];

    }

}
