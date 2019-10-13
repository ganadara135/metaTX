Object.defineProperty(exports, "__esModule", { value: true });
//const tslib_1 = require("tslib");
//const ethers = tslib_1.__importStar(require("ethers"));
const ethers = require("ethers");
const utils_1 = require("./utils");
// const utils = tslib_1.__importStar(require("./utils"));
const utils_2 = require("ethers/utils");
// init test wallets from package.json mnemonic
const web3 = global.web3;
const { wallet: ownerWallet, provider: ownerProvider, signer: ownerSigner } = utils_1.createTestWallet(web3, 0);
const { wallet: receiverWallet, provider: receiverProvider, signer: receiverSigner } = utils_1.createTestWallet(web3, 2);
const { wallet: userWallet, provider: userProvider, signer: userSigner } = utils_1.createTestWallet(web3, 3);
const { wallet: operatorWallet, provider: operatorProvider, signer: operatorSigner } = utils_1.createTestWallet(web3, 4);
contract('MetaERC20Wrapper', (accounts) => {
    // Initial token balance
    const INIT_BALANCE = 100;
    // 4m gas limit when gas estimation is incorrect (internal txs) 
    const txParam = { gasLimit: 4000000 };
    // Addresses
    const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'; // Zero address
    const ETH_ADDRESS = '0x0000000000000000000000000000000000000001'; // One address
    let receiverAddress; // Address of receiver
    let userAddress; // Address of user
    let tokenAddress; // Address of ERC20 token contract
    let tokenID; // BigNumber representation of ERC-20 token address
    let wrapperAddress; // Address of wrapper contract
    let ONE_ID = new utils_2.BigNumber(1);
    console.log("ONE_ID : ", ONE_ID);
    // Contracts
    let ownerMetaERC20WrapperContract;
    let userMetaERC20WrapperContract;
    let userERC20Contract;
    // Provider
    var provider = new ethers.providers.JsonRpcProvider();
    context('When MetaERC20Wrapper contract is deployed', () => {
        before(async () => {
            receiverAddress = await receiverWallet.getAddress();
            userAddress = await userWallet.getAddress();
        });
        beforeEach(async () => {
            // Deploy MetaERC20Wrapper
            let abstractMetaERC20Wrapper = await utils_1.AbstractContract.fromArtifactName('MetaERC20Wrapper');
            ownerMetaERC20WrapperContract = await abstractMetaERC20Wrapper.deploy(ownerWallet);
            userMetaERC20WrapperContract = await ownerMetaERC20WrapperContract.connect(userSigner);
            // Deploy ERC20
            let abstractERC20Mock = await utils_1.AbstractContract.fromArtifactName('MyToken');
            userERC20Contract = await abstractERC20Mock.deploy(userWallet);
            // Mint tokens to user
            await userERC20Contract.functions.mockMint(userAddress, INIT_BALANCE);
            tokenAddress = userERC20Contract.address;
            tokenID = new utils_2.BigNumber(2);
            wrapperAddress = ownerMetaERC20WrapperContract.address;
        });
        describe('deposit() function', () => {
            const depositAmount = new utils_2.BigNumber(20);
            describe('when depositing tokens', () => {
                it('should REVERT if user did not approve wrapper contract', async () => {
                    const tx = userMetaERC20WrapperContract.functions.deposit(tokenAddress, depositAmount, txParam);
                    await utils_1.expect(tx).to.be.rejected;
                });
                it('should REVERT if approval for wrapper contract is not sufficient', async () => {
                    await userERC20Contract.functions.approve(wrapperAddress, depositAmount.sub(1));
                    const tx = userMetaERC20WrapperContract.functions.deposit(tokenAddress, depositAmount, txParam);
                    await utils_1.expect(tx).to.be.rejected;
                });
                context('When token contract is approved', () => {
                    beforeEach(async () => {
                        await userERC20Contract.functions.approve(wrapperAddress, INIT_BALANCE);
                    });
                    it('should REVERT if user does not have sufficient funds', async () => {
                        const tx = userMetaERC20WrapperContract.functions.deposit(tokenAddress, INIT_BALANCE + 1, txParam);
                        await utils_1.expect(tx).to.be.rejected;
                    });
                    it('should PASS if user has sufficient funds', async () => {
                        // @ts-ignore (https://github.com/ethereum-ts/TypeChain/issues/118)
                        const tx = userMetaERC20WrapperContract.functions.deposit(tokenAddress, depositAmount, txParam);
                        await utils_1.expect(tx).to.be.fulfilled;
                    });
                    it('should REVERT if msg.value is not 0', async () => {
                        // @ts-ignore (https://github.com/ethereum-ts/TypeChain/issues/118)
                        const tx = userMetaERC20WrapperContract.functions.deposit(tokenAddress, depositAmount, { gasLimit: 1000000, value: 1 });
                        await utils_1.expect(tx).to.be.rejectedWith(utils_1.RevertError("MetaERC20Wrapper#deposit: NON_NULL_MSG_VALUE"));
                    });
                    context('When tokens are deposited', () => {
                        beforeEach(async () => {
                            await userMetaERC20WrapperContract.functions.deposit(tokenAddress, depositAmount, txParam);
                        });
                        it('should increase nTokens value by 1', async () => {
                            const nTokens = await userMetaERC20WrapperContract.functions.getNTokens();
                            utils_1.expect(nTokens).to.be.eql(new utils_2.BigNumber(2));
                        });
                        it('should set id of token to 2', async () => {
                            const id = await userMetaERC20WrapperContract.functions.getTokenID(tokenAddress);
                            utils_1.expect(id).to.be.eql(new utils_2.BigNumber(2));
                        });
                        it('should decrease ERC20 balance of user by the right amount', async () => {
                            const balance = await userERC20Contract.functions.balanceOf(userAddress);
                            utils_1.expect(balance).to.be.eql(new utils_2.BigNumber(INIT_BALANCE).sub(depositAmount));
                        });
                        it('should decrease ERC20 balance of user by the right amount', async () => {
                            const balance = await userERC20Contract.functions.balanceOf(userAddress);
                            utils_1.expect(balance).to.be.eql(new utils_2.BigNumber(INIT_BALANCE).sub(depositAmount));
                        });
                        it('should increase ERC20 balance of wrapper contract by the right amount', async () => {
                            const balance = await userERC20Contract.functions.balanceOf(wrapperAddress);
                            utils_1.expect(balance).to.be.eql(depositAmount);
                        });
                        it('should increase ERC1155 balance of user by the right amount for given token', async () => {
                            const balance = await userMetaERC20WrapperContract.functions.balanceOf(userAddress, 2);
                            utils_1.expect(balance).to.be.eql(depositAmount);
                        });
                    });
                });
            });
            describe('when depositing ETH', () => {
                it('should REVERT if msg.value is not equal to value', async () => {
                    //msg.value is smaller than value
                    let tx = userMetaERC20WrapperContract.functions.deposit(ETH_ADDRESS, depositAmount, { gasLimit: 1000000, value: depositAmount.sub(1) });
                    await utils_1.expect(tx).to.be.rejectedWith(utils_1.RevertError("MetaERC20Wrapper#deposit: INCORRECT_MSG_VALUE"));
                    // Msg.value is larger than value
                    tx = userMetaERC20WrapperContract.functions.deposit(ETH_ADDRESS, depositAmount, { gasLimit: 1000000, value: depositAmount.add(1) });
                    await utils_1.expect(tx).to.be.rejectedWith(utils_1.RevertError("MetaERC20Wrapper#deposit: INCORRECT_MSG_VALUE"));
                });
                it('should PASS if msg.value is equal to value', async () => {
                    //msg.value is smaller than value
                    let tx = userMetaERC20WrapperContract.functions.deposit(ETH_ADDRESS, depositAmount, { gasLimit: 1000000, value: depositAmount });
                    await utils_1.expect(tx).to.be.fulfilled;
                });
                context('When ETH were deposited', () => {
                    beforeEach(async () => {
                        await userMetaERC20WrapperContract.functions.deposit(ETH_ADDRESS, depositAmount, { gasLimit: 1000000, value: depositAmount });
                    });
                    it('should increase ETH balance of wrapper contract by the right amount', async () => {
                        const balance = await provider.getBalance(wrapperAddress);
                        utils_1.expect(balance).to.be.eql(depositAmount);
                    });
                    it('should increase ERC1155 balance of user by the right amount for given token', async () => {
                        const balance = await userMetaERC20WrapperContract.functions.balanceOf(userAddress, ETH_ADDRESS);
                        utils_1.expect(balance).to.be.eql(depositAmount);
                    });
                });
            });
        });
        describe('fallback function', () => {
            const depositAmount = new utils_2.BigNumber(10);
            let txData;
            it('should PASS if msg.value is equal to value', async () => {
                txData = { to: wrapperAddress, gasLimit: 1000000, value: depositAmount };
                let tx = userWallet.sendTransaction(txData);
                await utils_1.expect(tx).to.be.fulfilled;
            });
            context('When ETH were deposited', () => {
                beforeEach(async () => {
                    txData = { to: wrapperAddress, gasLimit: 1000000, value: depositAmount };
                    // Deposit via fallback
                    await userWallet.sendTransaction(txData);
                });
                it('should increase ETH balance of wrapper contract by the right amount', async () => {
                    const balance = await provider.getBalance(wrapperAddress);
                    utils_1.expect(balance.toNumber()).to.be.equal(depositAmount.toNumber());
                });
                it('should increase ERC1155 balance of user by the right amount for given token', async () => {
                    const balance = await userMetaERC20WrapperContract.functions.balanceOf(userAddress, ETH_ADDRESS);
                    utils_1.expect(balance).to.be.eql(depositAmount);
                });
            });
        });
        describe('withdraw function', () => {
            const depositAmount = new utils_2.BigNumber(66);
            const withdrawAmount = depositAmount;
            describe('when withdrawing tokens', () => {
                beforeEach(async () => {
                    await userERC20Contract.functions.approve(wrapperAddress, INIT_BALANCE); // Approve tokens
                    await userMetaERC20WrapperContract.functions.deposit(tokenAddress, depositAmount); // Deposit tokens
                });
                it('should REVERT if user does not have sufficient wrapped tokens', async () => {
                    const tx = userMetaERC20WrapperContract.functions.withdraw(tokenAddress, userAddress, depositAmount.add(1), txParam);
                    await utils_1.expect(tx).to.be.rejectedWith(utils_1.RevertError("SafeMath#sub: UNDERFLOW"));
                });
                it('should REVERT if token is not registered', async () => {
                    const tx = userMetaERC20WrapperContract.functions.withdraw(userAddress, userAddress, depositAmount, txParam);
                    await utils_1.expect(tx).to.be.rejectedWith(utils_1.RevertError('MetaERC20Wrapper#getTokenID: UNREGISTERED_TOKEN'));
                });
                it('should REVERT if recipient is 0x0', async () => {
                    const tx = userMetaERC20WrapperContract.functions.withdraw(tokenAddress, ZERO_ADDRESS, depositAmount, txParam);
                    await utils_1.expect(tx).to.be.rejected;
                });
                it('should PASS if user has sufficient wrapped tokens', async () => {
                    const tx = userMetaERC20WrapperContract.functions.withdraw(tokenAddress, userAddress, depositAmount, txParam);
                    await utils_1.expect(tx).to.be.fulfilled;
                });
                it('should PASS when withdrawing to another address', async () => {
                    const tx = userMetaERC20WrapperContract.functions.withdraw(tokenAddress, receiverAddress, depositAmount, txParam);
                    await utils_1.expect(tx).to.be.fulfilled;
                });
                context('When tokens are withdrawn', () => {
                    beforeEach(async () => {
                        await userMetaERC20WrapperContract.functions.withdraw(tokenAddress, userAddress, depositAmount, txParam);
                    });
                    it('should decrease ERC20 balance of wrapper contract by the right amount', async () => {
                        const balance = await userERC20Contract.functions.balanceOf(wrapperAddress);
                        utils_1.expect(balance).to.be.eql(depositAmount.sub(withdrawAmount));
                    });
                    it('should increase ERC20 balance of user by the right amount', async () => {
                        const balance = await userERC20Contract.functions.balanceOf(userAddress);
                        utils_1.expect(balance).to.be.eql(new utils_2.BigNumber(INIT_BALANCE).sub(depositAmount).add(withdrawAmount));
                    });
                    it('should decrease ERC1155 balance of user by the right amount for given token', async () => {
                        const balance = await userMetaERC20WrapperContract.functions.balanceOf(userAddress, tokenAddress);
                        utils_1.expect(balance).to.be.eql(depositAmount.sub(withdrawAmount));
                    });
                });
            });
            describe('when withdrawing ETH', () => {
                const depositAmount = new utils_2.BigNumber(17);
                const withdrawAmount = depositAmount;
                beforeEach(async () => {
                    // Depositing ETH
                    await userMetaERC20WrapperContract.functions.deposit(ETH_ADDRESS, depositAmount, { gasLimit: 1000000, value: depositAmount });
                });
                it('should REVERT if user does not have sufficient wrapped tokens', async () => {
                    const tx = userMetaERC20WrapperContract.functions.withdraw(ETH_ADDRESS, userAddress, depositAmount.add(1), txParam);
                    await utils_1.expect(tx).to.be.rejectedWith(utils_1.RevertError("SafeMath#sub: UNDERFLOW"));
                });
                it('should REVERT if recipient is 0x0', async () => {
                    const tx = userMetaERC20WrapperContract.functions.withdraw(ETH_ADDRESS, ZERO_ADDRESS, depositAmount, txParam);
                    await utils_1.expect(tx).to.be.rejectedWith(utils_1.RevertError("MetaERC20Wrapper#withdraw: INVALID_RECIPIENT"));
                });
                it('should PASS if user has sufficient wrapped tokens', async () => {
                    const tx = userMetaERC20WrapperContract.functions.withdraw(ETH_ADDRESS, userAddress, depositAmount, txParam);
                    await utils_1.expect(tx).to.be.fulfilled;
                });
                it('should PASS when withdrawing to another address', async () => {
                    const tx = userMetaERC20WrapperContract.functions.withdraw(ETH_ADDRESS, receiverAddress, depositAmount, txParam);
                    await utils_1.expect(tx).to.be.fulfilled;
                });
                context('When ETH are withdrawn', () => {
                    let receiverPreBalance;
                    beforeEach(async () => {
                        receiverPreBalance = await provider.getBalance(receiverAddress);
                        await userMetaERC20WrapperContract.functions.withdraw(ETH_ADDRESS, receiverAddress, depositAmount, txParam);
                    });
                    it('should decrease ETH balance of wrapper contract by the right amount', async () => {
                        const balance = await provider.getBalance(wrapperAddress);
                        utils_1.expect(balance.toNumber()).to.be.eql(depositAmount.sub(withdrawAmount).toNumber());
                    });
                    it('should increase ERC20 balance of receiver by the right amount', async () => {
                        const balance = await provider.getBalance(receiverAddress);
                        utils_1.expect(balance).to.be.eql(receiverPreBalance.add(withdrawAmount));
                    });
                    it('should decrease ERC1155 balance of user by the right amount for given token', async () => {
                        const balance = await userMetaERC20WrapperContract.functions.balanceOf(userAddress, tokenAddress);
                        utils_1.expect(balance).to.be.eql(depositAmount.sub(withdrawAmount));
                    });
                });
            });
        });
        describe('onERC1155Received function', () => {
            const depositAmount = new utils_2.BigNumber(66);
            const withdrawAmount = depositAmount;
            const data = ethers.utils.toUtf8Bytes("");
            receiverAddress = userAddress;
            describe('when withdrawing tokens', () => {
                beforeEach(async () => {
                    await userERC20Contract.functions.approve(wrapperAddress, INIT_BALANCE); // Approve tokens
                    await userMetaERC20WrapperContract.functions.deposit(tokenAddress, depositAmount); // Deposit tokens
                });
                it('should REVERT if user does not have sufficient wrapped tokens', async () => {
                    //@ts-ignore
                    const tx = userMetaERC20WrapperContract.functions.safeTransferFrom(userAddress, wrapperAddress, tokenID, depositAmount.add(1), data);
                    await utils_1.expect(tx).to.be.rejectedWith(utils_1.RevertError("SafeMath#sub: UNDERFLOW"));
                });
                it('should REVERT if token is not registered', async () => {
                    //@ts-ignore
                    const tx = userMetaERC20WrapperContract.functions.safeTransferFrom(userAddress, wrapperAddress, 666, 0, data);
                    await utils_1.expect(tx).to.be.rejectedWith(utils_1.RevertError('MetaERC20Wrapper#getIdAddress: UNREGISTERED_TOKEN'));
                });
                it('should PASS if user has sufficient wrapped tokens', async () => {
                    //@ts-ignore
                    const tx = userMetaERC20WrapperContract.functions.safeTransferFrom(userAddress, wrapperAddress, tokenID, depositAmount, data);
                    await utils_1.expect(tx).to.be.fulfilled;
                });
                context('When tokens are withdrawn', () => {
                    beforeEach(async () => {
                        //@ts-ignore
                        await userMetaERC20WrapperContract.functions.safeTransferFrom(userAddress, wrapperAddress, tokenID, depositAmount, data);
                    });
                    it('should decrease ERC20 balance of wrapper contract by the right amount', async () => {
                        const balance = await userERC20Contract.functions.balanceOf(wrapperAddress);
                        utils_1.expect(balance).to.be.eql(depositAmount.sub(withdrawAmount));
                    });
                    it('should increase ERC20 balance of user by the right amount', async () => {
                        const balance = await userERC20Contract.functions.balanceOf(userAddress);
                        utils_1.expect(balance).to.be.eql(new utils_2.BigNumber(INIT_BALANCE).sub(depositAmount).add(withdrawAmount));
                    });
                    it('should decrease ERC1155 balance of user by the right amount for given token', async () => {
                        const balance = await userMetaERC20WrapperContract.functions.balanceOf(userAddress, tokenAddress);
                        utils_1.expect(balance).to.be.eql(depositAmount.sub(withdrawAmount));
                    });
                });
            });
            describe('when withdrawing ETH', () => {
                const depositAmount = new utils_2.BigNumber(17);
                const withdrawAmount = depositAmount;
                beforeEach(async () => {
                    // Depositing ETH
                    await userMetaERC20WrapperContract.functions.deposit(ETH_ADDRESS, depositAmount, { gasLimit: 1000000, value: depositAmount });
                });
                it('should REVERT if user does not have sufficient wrapped tokens', async () => {
                    //@ts-ignore
                    const tx = userMetaERC20WrapperContract.functions.safeTransferFrom(userAddress, wrapperAddress, ONE_ID, depositAmount.add(1), data);
                    await utils_1.expect(tx).to.be.rejectedWith(utils_1.RevertError("SafeMath#sub: UNDERFLOW"));
                });
                it('should PASS if user has sufficient wrapped tokens', async () => {
                    //@ts-ignore
                    const tx = userMetaERC20WrapperContract.functions.safeTransferFrom(userAddress, wrapperAddress, ONE_ID, depositAmount, data);
                    await utils_1.expect(tx).to.be.fulfilled;
                });
                context('When ETH are withdrawn', () => {
                    let receiverPreBalance;
                    beforeEach(async () => {
                        receiverPreBalance = await provider.getBalance(receiverAddress);
                        //@ts-ignore
                        await userMetaERC20WrapperContract.functions.safeTransferFrom(userAddress, wrapperAddress, ONE_ID, depositAmount, data);
                    });
                    it('should decrease ETH balance of wrapper contract by the right amount', async () => {
                        const balance = await provider.getBalance(wrapperAddress);
                        utils_1.expect(balance.toNumber()).to.be.eql(depositAmount.sub(withdrawAmount).toNumber());
                    });
                    it('should decrease ERC1155 balance of user by the right amount for given token', async () => {
                        const balance = await userMetaERC20WrapperContract.functions.balanceOf(userAddress, tokenAddress);
                        utils_1.expect(balance).to.be.eql(depositAmount.sub(withdrawAmount));
                    });
                });
            });
        });
        describe('onERC1155BatchReceived function', () => {
            const depositAmount = new utils_2.BigNumber(66);
            const withdrawAmount = depositAmount;
            const data = ethers.utils.toUtf8Bytes("");
            const noTokens = 4;
            let depositAmounts;
            let tokenContracts;
            let tokenIDs;
            receiverAddress = userAddress;
            beforeEach(async () => {
                let abstractERC20Mock = await utils_1.AbstractContract.fromArtifactName('ERC20Mock');
                depositAmounts = [];
                tokenContracts = [];
                tokenIDs = [];
                for (let i = 0; i < noTokens; i++) {
                    const userERC20Contract = await abstractERC20Mock.deploy(userWallet);
                    await userERC20Contract.functions.mockMint(userAddress, INIT_BALANCE);
                    tokenIDs.push(new utils_2.BigNumber(2 + i));
                    tokenContracts.push(userERC20Contract);
                    depositAmounts.push(depositAmount);
                }
            });
            describe('when withdrawing tokens', () => {
                beforeEach(async () => {
                    for (let i = 0; i < noTokens; i++) {
                        await tokenContracts[i].functions.approve(wrapperAddress, INIT_BALANCE); // Approve tokens
                        await userMetaERC20WrapperContract.functions.deposit(tokenContracts[i].address, depositAmount); // Deposit tokens
                    }
                });
                it('should REVERT if user does not have sufficient wrapped tokens', async () => {
                    //@ts-ignore
                    const tx = userMetaERC20WrapperContract.functions.safeBatchTransferFrom(userAddress, wrapperAddress, tokenIDs, depositAmounts.map(val => val.add(1)), data);
                    await utils_1.expect(tx).to.be.rejectedWith(utils_1.RevertError("SafeMath#sub: UNDERFLOW"));
                });
                it('should PASS if user has sufficient wrapped tokens', async () => {
                    //@ts-ignore
                    const tx = userMetaERC20WrapperContract.functions.safeBatchTransferFrom(userAddress, wrapperAddress, tokenIDs, depositAmounts, data);
                    await utils_1.expect(tx).to.be.fulfilled;
                });
                context('When tokens are withdrawn', () => {
                    beforeEach(async () => {
                        //@ts-ignore
                        await userMetaERC20WrapperContract.functions.safeBatchTransferFrom(userAddress, wrapperAddress, tokenIDs, depositAmounts, data);
                    });
                    it('should decrease ERC20 balance of wrapper contract by the right amount', async () => {
                        for (let i = 0; i < noTokens; i++) {
                            const balance = await tokenContracts[i].functions.balanceOf(wrapperAddress);
                            utils_1.expect(balance).to.be.eql(new utils_2.BigNumber(0));
                        }
                    });
                    it('should increase ERC20 balance of user by the right amount', async () => {
                        for (let i = 0; i < noTokens; i++) {
                            const balance = await tokenContracts[i].functions.balanceOf(userAddress);
                            utils_1.expect(balance).to.be.eql(new utils_2.BigNumber(INIT_BALANCE).sub(depositAmount).add(withdrawAmount));
                        }
                    });
                    it('should decrease ERC1155 balance of user by the right amount for given token', async () => {
                        for (let i = 0; i < noTokens; i++) {
                            const balance = await userMetaERC20WrapperContract.functions.balanceOf(userAddress, tokenContracts[i].address);
                            utils_1.expect(balance).to.be.eql(depositAmount.sub(withdrawAmount));
                        }
                    });
                });
            });
        });
    });
});
//# sourceMappingURL=MetaERC20Wrapper.spec.js.map