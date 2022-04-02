const { expectRevert, time } = require('@openzeppelin/test-helpers');
const ICO = artifacts.require("ICO");
const ERC20 = artifacts.require("ERC20");

/*
 * uncomment accounts to access the test accounts made available by the
 * Ethereum client
 * See docs: https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
 */
contract("ICO", accounts => {
  let ico = null, token = null;
  const [admin] = accounts;
  const name = 'My Token', symbol = 'MTK', decimals = 18, totalSupply = web3.utils.toBN(web3.utils.toWei('100000', 'ether'));

  beforeEach(async () => {
    ico = await ICO.new(name, symbol, decimals, totalSupply);
    const tokenAddress = await ico.token();
    token = await ERC20.at(tokenAddress);
  });

  it('should create an ERC20 token', async () => {
    assert((await token.name()) === name);
    assert((await token.symbol()) === symbol);
    assert((await token.decimals()).eq(web3.utils.toBN(18)));
    assert((await token.totalSupply()).eq(totalSupply));
  });

  it('should start the ICO', async () => {
    // start(uint duration, uint _price, uint _availableTokens, uint _minPurchase, uint _maxPurchase) external onlyAdmin icoNotActive;
    const duration = 10;
    const availableTokens = web3.utils.toWei('500');
    const minPurchase = web3.utils.toWei('10');
    const maxPurchase = web3.utils.toWei('50');
    const price = 1;
    await ico.start(duration, price, availableTokens, minPurchase, maxPurchase, { from: admin });

    /**
     * for a started ico
     * end > duration
     * 
     */
    assert((await ico.end()).toNumber() > duration);
    assert((await ico.availableTokens()).eq(web3.utils.toBN(availableTokens)));
    assert((await ico.minPurchase()).eq(web3.utils.toBN(minPurchase)));
    assert((await ico.maxPurchase()).eq(web3.utils.toBN(maxPurchase)));
  });

  it('should NOT start the ICO if sender is not the admin', async () => {
    const duration = 10;
    const availableTokens = web3.utils.toWei('500');
    const minPurchase = web3.utils.toWei('10');
    const maxPurchase = web3.utils.toWei('50');
    const price = 1;
    await expectRevert(
      ico.start(duration, price, availableTokens, minPurchase, maxPurchase, { from: accounts[9] }),
      'only admin'
    );
  });

  it('should NOT start the ICO if ICO is already active', async () => {
    const duration = 10;
    const availableTokens = web3.utils.toWei('500');
    const minPurchase = web3.utils.toWei('10');
    const maxPurchase = web3.utils.toWei('50');
    const price = 1;
    await ico.start(duration, price, availableTokens, minPurchase, maxPurchase, { from: admin });

    await expectRevert(
      ico.start(duration, price, availableTokens, minPurchase, maxPurchase, { from: admin }),
      'ICO is already active'
    );
  });

  it('should NOT start the ICO if duration is 0', async () => {
    const duration = 0;
    const availableTokens = web3.utils.toWei('500');
    const minPurchase = web3.utils.toWei('10');
    const maxPurchase = web3.utils.toWei('50');
    const price = 1;
    await expectRevert(
      ico.start(duration, price, availableTokens, minPurchase, maxPurchase, { from: admin }),
      'duration of ICO should be > 0'
    );
  });

  it('should NOT start the ICO if tokens for ICO are exceeding limits', async () => {
    const duration = 10;
    const availableTokens = totalSupply.add(web3.utils.toBN(1));
    const minPurchase = web3.utils.toWei('10');
    const maxPurchase = web3.utils.toWei('50');
    const price = 1;
    await expectRevert(
      ico.start(duration, price, availableTokens, minPurchase, maxPurchase, { from: admin }),
      'tokens to ICO must be > 0 and <= total supply'
    );
    
    const _availableTokens = 0;
    await expectRevert(
      ico.start(duration, price, _availableTokens, minPurchase, maxPurchase, { from: admin }),
      'tokens to ICO must be > 0 and <= total supply'
    );
  });

  it('should NOT start the ICO if min/max purchase aren\'t satisfied', async () => {
    const duration = 10;
    const availableTokens = web3.utils.toWei('500');
    const minPurchase = web3.utils.toWei('0');
    const maxPurchase = web3.utils.toWei('50');
    const price = 1;
    await expectRevert(
      ico.start(duration, price, availableTokens, minPurchase, maxPurchase, { from: admin }),
      'minimim purchase should be > 0'
    );
    
    const _minPurchase = web3.utils.toWei('10');
    const _maxPurchase = web3.utils.toWei('0');
    await expectRevert(
      ico.start(duration, price, availableTokens, _minPurchase, _maxPurchase, { from: admin }),
      'maximum purchase should be > 0 and <= tokens available to ICO'
    );

    const __maxPurchase = web3.utils.toWei(web3.utils.toBN(web3.utils.fromWei(availableTokens)).add(web3.utils.toBN(1)));
    await expectRevert(
      ico.start(duration, price, availableTokens, _minPurchase, __maxPurchase, { from: admin }),
      'maximum purchase should be > 0 and <= tokens available to ICO'
    );
  });

  context('ICO has started', () => {
    beforeEach('before the ICO', async () => {
      const duration = 10;
      const availableTokens = web3.utils.toWei('100');
      const minPurchase = web3.utils.toWei('10');
      const maxPurchase = web3.utils.toWei('50');
      const price = 1;
      await ico.start(duration, price, availableTokens, minPurchase, maxPurchase, { from: admin });
      await ico.approveInvestor(accounts[1], { from: admin });
      await ico.approveInvestor(accounts[2], { from: admin });
    });

    it('should buy tokens', async () => {
      const quantity = 20, price = 1;
      const value = web3.utils.toBN(web3.utils.toWei(`${quantity * price}`));
      await ico.buy({ from: accounts[1], value });
      const sale = await ico.sales(0);
      assert(sale.investor === accounts[1]);
      assert(sale.quantity.eq(web3.utils.toBN(value)));
      const _availableTokens = web3.utils.toBN(web3.utils.toWei('100')).sub(value);
      assert((await ico.availableTokens()).eq(_availableTokens));
    });

    it('should NOT buy tokens if sender is not approved', async () => {
      const quantity = 20, price = 1;
      const value = web3.utils.toBN(web3.utils.toWei(`${quantity * price}`));
      await expectRevert(
        ico.buy({ from: accounts[3], value }),
        'only investor'
      );
    });

    it('should NOT buy tokens if ICO is not active', async () => {
      const quantity = 20, price = 1;
      const value = web3.utils.toBN(web3.utils.toWei(`${quantity * price}`));
      await time.increase(15);
      await expectRevert(
        ico.buy({ from: accounts[1], value }),
        'ICO not active'
      );
    });

    it('should NOT buy tokens if investor doesn\'t comply limits', async () => {
      let quantity = 5, price = 1;
      let value = web3.utils.toBN(web3.utils.toWei(`${quantity * price}`));
      
      await expectRevert(
        ico.buy({ from: accounts[1], value }),
        'need to send value between minPurchase and maxPurchase'
      );
      
      quantity = 60;
      value = web3.utils.toBN(web3.utils.toWei(`${quantity * price}`));
      await expectRevert(
        ico.buy({ from: accounts[1], value }),
        'need to send value between minPurchase and maxPurchase'
      );
    });

    it('should NOT buy tokens if not enough left', async () => {
      let quantity = 50, price = 1;
      let value = web3.utils.toBN(web3.utils.toWei(`${quantity * price}`));
      await ico.buy({ from: accounts[1], value });
      
      quantity = 40;
      value = web3.utils.toBN(web3.utils.toWei(`${quantity * price}`));
      await ico.buy({ from: accounts[1], value });

      quantity = 20;
      value = web3.utils.toBN(web3.utils.toWei(`${quantity * price}`));
      await expectRevert(
        ico.buy({ from: accounts[1], value }),
        'not enough tokens left'
      );
    });

    it('should run the ICO', async () => {
      let quantity = 20, price = 1, value = web3.utils.toBN(web3.utils.toWei(`${quantity * price}`));
      await ico.buy({ from: accounts[1], value });

      quantity = 30, price = 1, value = web3.utils.toBN(web3.utils.toWei(`${quantity * price}`));
      await ico.buy({ from: accounts[2], value });

      await time.increase(15);

      await expectRevert(
        ico.buy({ from: accounts[1], value }),
        'ICO not active'
      );
      
      const account1BalanceBefore = await token.balanceOf(accounts[1]);
      const account2BalanceBefore = await token.balanceOf(accounts[2]);
      await ico.release({ from: admin });
      const account1BalanceAfter = await token.balanceOf(accounts[1]);
      const account2BalanceAfter = await token.balanceOf(accounts[2]);

      assert(account1BalanceAfter.sub(account1BalanceBefore).eq(web3.utils.toBN(web3.utils.toWei('20'))));
      assert(account2BalanceAfter.sub(account2BalanceBefore).eq(web3.utils.toBN(web3.utils.toWei('30'))));

      const balanceContract = web3.utils.toBN(
        await web3.eth.getBalance(token.address)
      );
      const balanceBefore = web3.utils.toBN(
        await web3.eth.getBalance(accounts[6])
      );
      await ico.withdraw(accounts[6], balanceContract);
      const balanceAfter = web3.utils.toBN(
        await web3.eth.getBalance(accounts[6])
      );
      assert(balanceAfter.sub(balanceBefore).eq(balanceContract));
    });

  });

});
