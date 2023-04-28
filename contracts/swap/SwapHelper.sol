// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "../interfaces/IUniswapV2Pair.sol";
import "../interfaces/IUniswapV2Router02.sol";
import "../interfaces/IUniswapV2Factory.sol";
import "../interfaces/ISwapHelper.sol";

/**
 * @dev `SwapHelper` is a wrapper around Uniswap Router to perform trades.
 */
contract SwapHelper is Ownable, ISwapHelper {
    // =============================================== Storage ========================================================

    /** @dev Address of the DEX router. */
    address public router;

    /** @dev Address of the DEX factory. */
    address public factory;

    /** @dev Address for DAI token. */
    address public DAI;

    // =============================================== Setters =========================================================

    /** @dev Constructor.
     * @param _router           The DEX router address.
     * @param _factory          The DEX factory address.
     * @param _dai              The address of the DAI token of the network.
     */
    constructor(
        address _router,
        address _factory,
        address _dai
    ) {
        router = _router;
        factory = _factory;
        DAI = _dai;
    }

    /** @dev Performs a swap using any token to DAI.
     * @param _token        The converting token address.
     * @param expected        The minimum expected amount of DAI to receive.
     */
    function swap(address _token, uint256 expected) public {
        uint256 tokenAmount = _tokenAmount(_token, expected);
        IERC20(_token).transferFrom(msg.sender, address(this), tokenAmount);

        address[] memory path = new address[](2);
        path[0] = _token;
        path[1] = DAI;

        uint256 allowance = IERC20(_token).allowance(address(this), router);
        if (allowance < tokenAmount) {
            IERC20(_token).approve(router, tokenAmount);
        }

        IUniswapV2Router02(router).swapTokensForExactTokens(
            expected,
            tokenAmount,
            path,
            msg.sender,
            block.timestamp + 500
        );
    }

    // =============================================== Getters =========================================================

    /** @dev Public view for the internal `_tokenAmount` function.
     * @param token      The address of the trade pair.
     * @param expected   The amount of DAI that needs to be fulfilled.
     */
    function getTokenAmount(address token, uint256 expected)
        external
        view
        returns (uint256)
    {
        return _tokenAmount(token, expected);
    }

    // =============================================== Internal ========================================================

    /** @dev Calculates the amount of tokens required to fulfill the `amount`.
     * @param _token     The address of the trade pair.
     * @param expected   The amount of DAI that needs to be fulfilled.
     */
    function _tokenAmount(address _token, uint256 expected)
        internal
        view
        returns (uint256)
    {
        require(_token != address(0), "SwapHelper: token cannot be empty");

        require(expected > 0, "SwapHelper: amount should be more than 0");

        address pair = IUniswapV2Factory(factory).getPair(_token, DAI);

        require(pair != address(0), "SwapHelper: pair cannot be empty");

        (address token0, ) = sortTokens(_token, DAI);

        (uint112 reserve0, uint112 reserve1, ) = IUniswapV2Pair(pair)
            .getReserves();

        (, uint256 dai) = _token == token0
            ? (reserve0, reserve1)
            : (reserve1, reserve0);

        uint256 tokensRequired = ((expected * 1 ether) / _tokenPrice(_token));

        uint256 slippage = (expected * 1000) / dai;

        require(slippage < 20, "SwapHelper: slippage above 2%");

        if (slippage == 0) {
            slippage = 5;
        }

        return tokensRequired + ((tokensRequired / 1000) * slippage);
    }

    function _tokenPrice(address _token) internal view returns (uint256) {
        require(_token != address(0), "SwapHelper: token cannot be empty");

        address pair = IUniswapV2Factory(factory).getPair(_token, DAI);

        require(pair != address(0), "SwapHelper: pair cannot be empty");

        (uint256 reserve0, uint256 reserve1, ) = IUniswapV2Pair(pair)
            .getReserves();

        uint256 token0 = reserve0 * (10**IERC20Metadata(_token).decimals());
        return (token0 / reserve1);
    }

    /** @dev Utility function from UniswapV2Library to sort tokens. */
    function sortTokens(address tokenA, address tokenB)
        internal
        pure
        returns (address token0, address token1)
    {
        require(tokenA != tokenB, "UniswapV2Library: IDENTICAL_ADDRESSES");
        (token0, token1) = tokenA < tokenB
            ? (tokenA, tokenB)
            : (tokenB, tokenA);
        require(token0 != address(0), "UniswapV2Library: ZERO_ADDRESS");
    }
}
