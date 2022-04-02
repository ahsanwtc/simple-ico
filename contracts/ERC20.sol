// SPDX-License-Identifier: MIT
pragma solidity ^0.8.1;

interface IERC20 {
  function totalSupply() external view returns (uint256); 
  function balanceOf(address who) external view returns (uint256);
  function allowance(address owner, address spender) external view returns (uint256);
  function transfer(address to, uint256 value) external returns (bool);
  function approve(address spender, uint256 value) external returns (bool);
  function transferFrom(address from, address to, uint256 value) external returns (bool);

  event Transfer(address indexed from, address indexed to, uint256 value);
  event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract ERC20 is IERC20 {
  string public name;
  string public symbol;
  uint8 public decimals;
  uint256 private _totalSupply;
  mapping(address => uint) public balances;
  mapping(address => mapping(address => uint)) public allowed;

  constructor(string memory _name, string memory _symbol, uint8 _decimals, uint supply) {
    name = _name;
    symbol = _symbol;
    decimals = _decimals;
    _totalSupply = supply;
    balances[msg.sender] = supply;
  }

  function transfer(address to, uint256 value) external override returns (bool) {
    require(balances[msg.sender] >= value, "not enough balance");
    balances[msg.sender] -= value;
    balances[to] += value;
    emit Transfer(msg.sender, to, value);
    return true;
  }

  function transferFrom(address from, address to, uint256 value) external override returns (bool) {
    uint _allowance = allowed[from][msg.sender];
    require(_allowance >= value, "not enough allowance");
    require(balances[from] >= value, "not enough balance");
    allowed[from][msg.sender] -= value;
    balances[to] += value;
    balances[from] -= value;
    emit Transfer(from, to, value);
    return true;
  }

  function approve(address spender, uint256 value) external override returns (bool) {
    require(msg.sender != spender, "sender can't be spender");
    allowed[msg.sender][spender] = value;
    emit Approval(msg.sender, spender, value);
    return true;
  }

  function allowance(address owner, address spender) external view override returns (uint256) {
    return allowed[owner][spender];
  }

  function totalSupply() external view override returns (uint256) {
    return _totalSupply;
  }

  function balanceOf(address who) external view override returns (uint256) {
    return balances[who];
  }
}