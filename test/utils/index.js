var _a;
//Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const chai = tslib_1.__importStar(require("chai"));
const chai_as_promised_1 = tslib_1.__importDefault(require("chai-as-promised"));
const ChaiBigNumber = require('chai-bignumber');
const chai_string_1 = tslib_1.__importDefault(require("chai-string"));
const ethers = tslib_1.__importStar(require("ethers"));
tslib_1.__exportStar(require("./contract"), exports);
tslib_1.__exportStar(require("./helpers"), exports);
// const chai = require("chai");
// const chai_as_promised_1 = require("chai-as-promised");
// const ChaiBigNumber = require('chai-bignumber');
// const chai_string_1 = require("chai-string");
// const ethers = require("ethers");
// (require("./contract"), exports);
// (require("./helpers"), exports);

const BigNumber = ethers.utils.BigNumber;
exports.BigNumber = BigNumber;
_a = chai
    .use(chai_string_1.default)
    .use(chai_as_promised_1.default)
    .use(ChaiBigNumber()), exports.assert = _a.assert, exports.expect = _a.expect;
//# sourceMappingURL=index.js.map