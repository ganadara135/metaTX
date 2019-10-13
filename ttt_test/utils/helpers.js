Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const ethers = tslib_1.__importStar(require("ethers"));
// createTestWallet creates a new wallet
exports.createTestWallet = (web3, addressIndex = 0) => {
    const provider = new Web3DebugProvider(web3.currentProvider);
    const wallet = ethers.Wallet
        .fromMnemonic(process.env.npm_package_config_mnemonic, `m/44'/60'/0'/0/${addressIndex}`)
        .connect(provider);
    const signer = provider.getSigner(addressIndex);
    return { wallet, provider, signer };
};
// Check if tx was Reverted with specified message
function RevertError(errorMessage) {
    let prefix = 'VM Exception while processing transaction: revert ';
    return prefix + errorMessage;
}
exports.RevertError = RevertError;
class Web3DebugProvider extends ethers.providers.JsonRpcProvider {
    constructor(web3Provider, network) {
        // HTTP has a host; IPC has a path.
        super(web3Provider.host || web3Provider.path || '', network);
        this.reqCounter = 0;
        this.reqLog = [];
        if (web3Provider) {
            if (web3Provider.sendAsync) {
                this._sendAsync = web3Provider.sendAsync.bind(web3Provider);
            }
            else if (web3Provider.send) {
                this._sendAsync = web3Provider.send.bind(web3Provider);
            }
        }
        if (!web3Provider || !this._sendAsync) {
            ethers.errors.throwError('invalid web3Provider', ethers.errors.INVALID_ARGUMENT, { arg: 'web3Provider', value: web3Provider });
        }
        ethers.utils.defineReadOnly(this, '_web3Provider', web3Provider);
    }
    send(method, params) {
        this.reqCounter++;
        return new Promise((resolve, reject) => {
            let request = {
                method: method,
                params: params,
                id: this.reqCounter,
                jsonrpc: '2.0'
            };
            this.reqLog.push(request);
            this._sendAsync(request, function (error, result) {
                if (error) {
                    reject(error);
                    return;
                }
                if (result.error) {
                    // @TODO: not any
                    let error = new Error(result.error.message);
                    error.code = result.error.code;
                    error.data = result.error.data;
                    reject(error);
                    return;
                }
                resolve(result.result);
            });
        });
    }
    getPastRequest(reverseIndex = 0) {
        if (this.reqLog.length === 0) {
            return { jsonrpc: '2.0', id: 0, method: null, params: null };
        }
        return this.reqLog[this.reqLog.length - reverseIndex - 1];
    }
}
exports.Web3DebugProvider = Web3DebugProvider;
//# sourceMappingURL=helpers.js.map