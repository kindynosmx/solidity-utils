// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/ITokensRegistry.sol";

/**
 * @dev `TokensRegistry` is the storage whitelisted tokens for the PointOfSale to use as payment.
 *      These tokens must have enough liquidity and paired directly with DAI.
 */
contract TokensRegistry is Ownable, ITokensRegistry {
    // =============================================== Storage ========================================================

    /** @dev Struct to include token information
     * @params token    Address of the token.
     * @params paused   Boolean to enabled/disable the token on the platform.
     */
    struct Token {
        address token;
        bool paused;
    }

    /** @dev Tokens available for usage across the all the `PointOfSale` instances. */
    address[] private _tokens;

    /** @dev Tokens available for usage across the all the `PointOfSale` instances. */
    mapping(address => Token) private _supported;

    // =============================================== Events =========================================================

    /** @dev Emitted by the `addToken` function
     * @param token The address the token added to the registry
     */
    event TokenAdded(address indexed token);

    /** @dev Emitted by the `pauseToken` function
     * @param token The address the token paused on the registry
     */
    event TokenPaused(address indexed token);

    /** @dev Emitted by the `resumeToken` function
     * @param token The address the token resumed on the registry
     */
    event TokenResumed(address indexed token);

    // =============================================== Setters ========================================================

    /** @dev Adds a new token to the registry. Requires the token to not be supported before addition.
     * @param _token The address the token to add to the registry.
     */
    function addToken(address _token) external onlyOwner {
        require(
            !isSupported(_token),
            "TokensRegistry: the token is already supported"
        );
        require(_token != address(0), "TokensRegistry: missing token");
        _tokens.push(_token);
        Token memory t = Token(_token, false);
        _supported[_token] = t;
        emit TokenAdded(_token);
    }

    /** @dev Pauses a previously added token. Requires the token to be supported.
     * @param _token The address the token to pause.
     */
    function pauseToken(address _token) external onlyOwner {
        require(
            isSupported(_token),
            "TokenRegistry: the token is not supported"
        );
        _supported[_token].paused = true;
        emit TokenPaused(_token);
    }

    /** @dev Resumes a previously paused token. Requires the token to be supported and to be paused.
     * @param _token The address the token to resume.
     */
    function resumeToken(address _token) external onlyOwner {
        require(
            isSupported(_token),
            "TokenRegistry: the token is not supported"
        );
        require(isPaused(_token), "TokenRegistry: the token is not paused");
        _supported[_token].paused = false;
        emit TokenResumed(_token);
    }

    // =============================================== Getters ========================================================

    /** @dev Returns the addresses of all the supported tokens. */
    function getSupportedTokens() public view returns (address[] memory) {
        return _tokens;
    }

    /** @dev Returns if a token is supported.
     * @param _token Address of the token to query.
     */
    function isSupported(address _token) public view returns (bool) {
        return _supported[_token].token != address(0);
    }

    /** @dev Returns if a token is paused..
     * @param _token Address of the token to query.
     */
    function isPaused(address _token) public view returns (bool) {
        return _supported[_token].paused;
    }
}
