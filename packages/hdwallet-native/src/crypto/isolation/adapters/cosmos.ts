import { SecP256K1 } from "..";
import * as Digest from "../core/digest";

type IsolatedKey = SecP256K1.ECDSAKeyInterface;
export class WalletAdapter {
    _isolatedKey: IsolatedKey;
    constructor(isolatedKey: IsolatedKey) {
        this._isolatedKey = isolatedKey;
    }
    get publicKey(): string {
        return Buffer.from(this._isolatedKey.publicKey).toString("hex");
    }
    sign(signMessage: string): Buffer {
        const signBuf = Buffer.from(signMessage.normalize("NFKD"), "utf8");
        const signBufHash = Digest.Algorithms["sha256"](signBuf);
        return Buffer.from(this._isolatedKey.ecdsaSign(signBufHash));
    }
}

export default WalletAdapter;
