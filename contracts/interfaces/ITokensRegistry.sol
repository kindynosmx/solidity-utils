// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface ITokensRegistry {
    function addToken(address _token) external;

    function pauseToken(address _token) external;

    function resumeToken(address _token) external;

    function getSupportedTokens() external view returns (address[] memory);

    function isSupported(address _token) external view returns (bool);

    function isPaused(address _token) external view returns (bool);
}
