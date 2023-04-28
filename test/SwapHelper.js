const { expect } = require("chai");
const { ethers } = require("hardhat");
const UniswapV2Factory = require("@uniswap/v2-core/build/UniswapV2Factory.json");
const UniswapV2Router02 = require("@uniswap/v2-periphery/build/UniswapV2Router02.json");
const WETH9 = require("@uniswap/v2-periphery/build/WETH9.json");

describe("SwapHelper", () => {
  before(async () => {
    await hre.network.provider.send("hardhat_reset");

    const [owner] = await ethers.getSigners();

    this.developer = owner;

    const factory = new ethers.ContractFactory(
      UniswapV2Factory.abi,
      UniswapV2Factory.bytecode,
      this.developer
    );
    this.factory = await factory.deploy(this.developer.address);
    await this.factory.deployed();

    const weth = new ethers.ContractFactory(
      WETH9.abi,
      WETH9.bytecode,
      this.developer
    );
    this.weth = await weth.deploy();
    await this.weth.deployed();

    const router = new ethers.ContractFactory(
      UniswapV2Router02.abi,
      UniswapV2Router02.bytecode,
      this.developer
    );
    this.router = await router.deploy(this.factory.address, this.weth.address);
    await this.router.deployed();

    const MockToken = await ethers.getContractFactory("MockToken");
    const SwapHelper = await ethers.getContractFactory("SwapHelper");

    this.token1 = await MockToken.deploy(
      "Token1",
      "TKN1",
      ethers.utils.parseEther("1000000")
    );
    await this.token1.deployed();

    this.token2 = await MockToken.deploy(
      "Token2",
      "TKN2",
      ethers.utils.parseEther("1000000")
    );
    await this.token2.deployed();

    this.dai = await MockToken.deploy(
      "Dai",
      "DAI",
      ethers.utils.parseEther("1000000")
    );
    await this.dai.deployed();

    await this.token1.approve(
      this.router.address,
      ethers.utils.parseEther("10000000000000000000000")
    );
    await this.token2.approve(
      this.router.address,
      ethers.utils.parseEther("10000000000000000000000")
    );
    await this.dai.approve(
      this.router.address,
      ethers.utils.parseEther("10000000000000000000000")
    );

    const timestamp = Math.floor(Date.now() / 1000) + 300;

    await this.router.addLiquidity(
      this.token1.address,
      this.dai.address,
      ethers.utils.parseEther("100000"),
      ethers.utils.parseEther("100000"),
      ethers.utils.parseEther("100000"),
      ethers.utils.parseEther("100000"),
      this.developer.address,
      timestamp
    );

    await this.router.addLiquidity(
      this.token2.address,
      this.dai.address,
      ethers.utils.parseEther("500000"),
      ethers.utils.parseEther("100000"),
      ethers.utils.parseEther("500000"),
      ethers.utils.parseEther("100000"),
      this.developer.address,
      timestamp
    );

    await this.router.addLiquidityETH(
      this.dai.address,
      ethers.utils.parseEther("200000"),
      ethers.utils.parseEther("200000"),
      ethers.utils.parseEther("100"),
      this.developer.address,
      timestamp,
      { value: ethers.utils.parseEther("100") }
    );

    this.helper = await SwapHelper.deploy(
      this.router.address,
      this.factory.address,
      this.dai.address
    );
    await this.helper.deployed();
  });

  it("should make sure everything is deployed correctly", async () => {
    await expect(await this.token1.balanceOf(this.developer.address)).to.eq(
      ethers.utils.parseEther("900000")
    );

    await expect(await this.token2.balanceOf(this.developer.address)).to.eq(
      ethers.utils.parseEther("500000")
    );

    await expect(await this.dai.balanceOf(this.developer.address)).to.eq(
      ethers.utils.parseEther("600000")
    );
  });

  it("should return token 1 amount for DAI equally", async () => {
    await expect(
      this.helper.getTokenAmount(
        this.token1.address,
        ethers.utils.parseEther("5000")
      )
    ).to.revertedWith("SwapHelper: slippage above 2%");

    await expect(
      await this.helper.getTokenAmount(
        this.token1.address,
        ethers.utils.parseEther("1500")
      )
    ).to.eq(ethers.utils.parseEther("1522.5"));

    await expect(
      await this.helper.getTokenAmount(
        this.token1.address,
        ethers.utils.parseEther("150")
      )
    ).to.eq(ethers.utils.parseEther("150.15"));

    await expect(
      await this.helper.getTokenAmount(
        this.token1.address,
        ethers.utils.parseEther("15")
      )
    ).to.eq(ethers.utils.parseEther("15.075"));

    await expect(
      await this.helper.getTokenAmount(
        this.token1.address,
        ethers.utils.parseEther("1.5")
      )
    ).to.eq(ethers.utils.parseEther("1.5075"));

    await expect(
      await this.helper.getTokenAmount(
        this.token1.address,
        ethers.utils.parseEther("0.15")
      )
    ).to.eq(ethers.utils.parseEther("0.15075"));
  });

  it("should return token 2 amount for DAI to half", async () => {
    await expect(
      this.helper.getTokenAmount(
        this.token2.address,
        ethers.utils.parseEther("5000")
      )
    ).to.revertedWith("SwapHelper: slippage above 2%");

    await expect(
      await this.helper.getTokenAmount(
        this.token2.address,
        ethers.utils.parseEther("1500")
      )
    ).to.eq(ethers.utils.parseEther("7612.5"));

    await expect(
      await this.helper.getTokenAmount(
        this.token2.address,
        ethers.utils.parseEther("150")
      )
    ).to.eq(ethers.utils.parseEther("750.75"));

    await expect(
      await this.helper.getTokenAmount(
        this.token2.address,
        ethers.utils.parseEther("15")
      )
    ).to.eq(ethers.utils.parseEther("75.375"));

    await expect(
      await this.helper.getTokenAmount(
        this.token2.address,
        ethers.utils.parseEther("1.5")
      )
    ).to.eq(ethers.utils.parseEther("7.5375"));

    await expect(
      await this.helper.getTokenAmount(
        this.token2.address,
        ethers.utils.parseEther("0.15")
      )
    ).to.eq(ethers.utils.parseEther("0.75375"));
  });

  it("should return ETH amount for DAI to 1 / 20", async () => {
    await expect(
      this.helper.getTokenAmount(
        this.weth.address,
        ethers.utils.parseEther("5000")
      )
    ).to.revertedWith("SwapHelper: slippage above 2%");

    await expect(
      await this.helper.getTokenAmount(
        this.weth.address,
        ethers.utils.parseEther("1500")
      )
    ).to.eq(ethers.utils.parseEther("0.75525"));

    await expect(
      await this.helper.getTokenAmount(
        this.weth.address,
        ethers.utils.parseEther("150")
      )
    ).to.eq(ethers.utils.parseEther("0.075375"));

    await expect(
      await this.helper.getTokenAmount(
        this.weth.address,
        ethers.utils.parseEther("15")
      )
    ).to.eq(ethers.utils.parseEther("0.0075375"));

    await expect(
      await this.helper.getTokenAmount(
        this.weth.address,
        ethers.utils.parseEther("1.5")
      )
    ).to.eq(ethers.utils.parseEther("0.00075375"));

    await expect(
      await this.helper.getTokenAmount(
        this.weth.address,
        ethers.utils.parseEther("0.15")
      )
    ).to.eq(ethers.utils.parseEther("0.000075375"));
  });

  it("should swap token 1 for exactly 10 DAI", async () => {
    await this.token1.approve(
      this.helper.address,
      ethers.utils.parseEther("10000000000000000000000")
    );

    let token1 = await this.token1.balanceOf(this.developer.address);
    let dai = await this.dai.balanceOf(this.developer.address);
    await expect(token1).to.eq(ethers.utils.parseEther("900000"));
    await expect(dai).to.eq(ethers.utils.parseEther("600000"));

    await this.helper.swap(this.token1.address, ethers.utils.parseEther("10"));

    token1 = await this.token1.balanceOf(this.developer.address);
    dai = await this.dai.balanceOf(this.developer.address);
    await expect(token1).to.eq(ethers.utils.parseEther("899989.95"));
    await expect(dai).to.eq(ethers.utils.parseEther("600010"));
  });

  it("should swap token 2 for exactly 10 DAI", async () => {
    await this.token2.approve(
      this.helper.address,
      ethers.utils.parseEther("10000000000000000000000")
    );

    let token1 = await this.token2.balanceOf(this.developer.address);
    let dai = await this.dai.balanceOf(this.developer.address);
    await expect(token1).to.eq(ethers.utils.parseEther("500000"));
    await expect(dai).to.eq(ethers.utils.parseEther("600010"));

    await this.helper.swap(this.token2.address, ethers.utils.parseEther("10"));

    token1 = await this.token2.balanceOf(this.developer.address);
    dai = await this.dai.balanceOf(this.developer.address);
    await expect(token1).to.eq(ethers.utils.parseEther("499949.75"));
    await expect(dai).to.eq(ethers.utils.parseEther("600020"));
  });

  it("should swap weth for exactly 10 DAI", async () => {
    await this.weth.approve(
      this.helper.address,
      ethers.utils.parseEther("10000000000000000000000")
    );
    await this.weth.deposit({ value: ethers.utils.parseEther("10") });
    let weth = await this.weth.balanceOf(this.developer.address);
    let dai = await this.dai.balanceOf(this.developer.address);

    await expect(dai).to.eq(ethers.utils.parseEther("600020"));
    await expect(weth).to.eq(ethers.utils.parseEther("10"));

    await this.helper.swap(this.weth.address, ethers.utils.parseEther("10"));

    weth = await this.weth.balanceOf(this.developer.address);
    dai = await this.dai.balanceOf(this.developer.address);
    await expect(weth).to.eq(ethers.utils.parseEther("9.994975"));
    await expect(dai).to.eq(ethers.utils.parseEther("600030"));
  });
});
