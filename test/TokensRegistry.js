const { expect } = require("chai");
const { ethers } = require("hardhat");

const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

describe("TokensRegistry", () => {
  before(async () => {
    const Registry = await ethers.getContractFactory("TokensRegistry");
    this.registry = await Registry.deploy();
    await this.registry.deployed();
  });

  it("should revert add token with an empty address", async () => {
    await expect(
      this.registry.addToken("0x0000000000000000000000000000000000000000")
    ).to.revertedWith("TokensRegistry: missing token");
  });

  it("should add a token", async () => {
    await expect(this.registry.addToken(DAI))
      .to.emit(this.registry, "TokenAdded")
      .withArgs(DAI);
  });

  it("should revert to add an already added token", async () => {
    await expect(this.registry.addToken(DAI)).to.revertedWith(
      "TokensRegistry: the token is already supported"
    );
  });

  it("should return true for a supported token", async () => {
    await expect(await this.registry.isSupported(DAI)).to.eq(true);
  });

  it("should return false for a not supported token", async () => {
    await expect(await this.registry.isSupported(WETH)).to.eq(false);
  });

  it("should return false for a not paused token", async () => {
    await expect(await this.registry.isPaused(DAI)).to.eq(false);
  });

  it("should pause a supported token", async () => {
    await expect(this.registry.pauseToken(DAI))
      .to.emit(this.registry, "TokenPaused")
      .withArgs(DAI);
  });

  it("should fail when trying to pause a non supported token", async () => {
    await expect(this.registry.pauseToken(WETH)).to.revertedWith(
      "TokenRegistry: the token is not supported"
    );
  });

  it("should return true for a paused token", async () => {
    await expect(await this.registry.isPaused(DAI)).to.eq(true);
  });

  it("should unpause a paused token", async () => {
    await expect(this.registry.resumeToken(DAI))
      .to.emit(this.registry, "TokenResumed")
      .withArgs(DAI);
  });

  it("should fail when trying to unpause an non paused token", async () => {
    await expect(this.registry.resumeToken(DAI)).to.revertedWith(
      "TokenRegistry: the token is not paused"
    );
  });

  it("should fail when trying to unpause an non supported token", async () => {
    await expect(this.registry.resumeToken(WETH)).to.revertedWith(
      "TokenRegistry: the token is not supported"
    );
  });

  it("should return false for a resumed token token", async () => {
    await expect(await this.registry.isPaused(DAI)).to.eq(false);
  });

  it("should return all supported tokens", async () => {
    await expect(await this.registry.getSupportedTokens()).to.have.members([
      DAI,
    ]);
    await this.registry.addToken(WETH);
    await expect(await this.registry.getSupportedTokens()).to.have.members([
      DAI,
      WETH,
    ]);
  });
});
