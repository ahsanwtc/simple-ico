const ICO = artifacts.require("ICO");
module.exports = function(_deployer) {
  _deployer.deploy(ICO, 'My Token', 'MTK', 18, 100000);
};
