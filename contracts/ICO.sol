// SPDX-License-Identifier: MIT
pragma solidity ^0.8.1;

import "./ERC20.sol";

contract ICO {
  address public token;
  address public admin;
  uint public end;
  uint public price;
  uint public availableTokens;
  uint public minPurchase;
  uint public maxPurchase;
  mapping(address => bool) public investors;
  struct Sale {
    address investor;
    uint quantity;
  }
  Sale[] public sales;
  bool public released;

  constructor(string memory _name, string memory _symbol, uint8 _decimals, uint _totalSupply) {
    token = address(new ERC20(_name, _symbol, _decimals, _totalSupply));
    admin = msg.sender;
  }

  function start(uint duration, uint _price, uint _availableTokens, uint _minPurchase, uint _maxPurchase) external onlyAdmin icoNotActive {
    require(duration > 0, "duration of ICO should be > 0");
    uint totalSupply = ERC20(token).totalSupply();
    require(_availableTokens > 0 && _availableTokens <= totalSupply, "tokens to ICO must be > 0 and <= total supply");
    require(_minPurchase > 0, "minimim purchase should be > 0");
    require(_maxPurchase > 0 && _maxPurchase <= _availableTokens, "maximum purchase should be > 0 and <= tokens available to ICO");
    end = duration + block.timestamp;
    price = _price;
    availableTokens = _availableTokens;
    minPurchase = _minPurchase;
    maxPurchase = _maxPurchase;
  }

  function approveInvestor(address investor) external onlyAdmin {
    investors[investor] = true;
  }

  function buy() payable external onlyInvestor icoActive {
    require(msg.value % price == 0, "need to send multiple of price");
    require(msg.value >= minPurchase && msg.value <= maxPurchase, "need to send value between minPurchase and maxPurchase");
    uint quantity = price * msg.value;
    require(quantity <= availableTokens, "not enough tokens left");
    sales.push(Sale(msg.sender, quantity));
    availableTokens -= quantity;
  }

  function release() external onlyAdmin icoEnded tokenNotReleased {
    released = true;
    ERC20 _token = ERC20(token);
    for (uint i = 0; i < sales.length; i++) {
      _token.transfer(sales[i].investor, sales[i].quantity);
    }
  }

  function withdraw(address payable to, uint amount) external onlyAdmin icoEnded tokenReleased {
    to.transfer(amount);
  }

  modifier onlyAdmin {
    require(msg.sender == admin, "only admin");
    _;
  }

  /* end > 0 => meaning that start function was already called */
  modifier icoNotActive() {
    require(end == 0, "ICO is already active");
    _;
  }

  modifier icoActive() {
    require(end > 0 && block.timestamp < end && availableTokens > 0, "ICO not active");
    _;
  }

  modifier icoEnded() {
    require(end > 0 && (block.timestamp >= end || availableTokens == 0), "ICO still running");
    _;
  }

  modifier onlyInvestor() {
    require(investors[msg.sender] == true, "only investor");
    _;
  }

  modifier tokenNotReleased() {
    require(released == false, "tokens already released to investors");
    _;
  }

  modifier tokenReleased() {
    require(released == true, "tokens should be released to investors");
    _;
  }
}
