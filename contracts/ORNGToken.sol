// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title ORNGToken
 * @notice OpenRNG utility token — ERC-20 with dynamic burn + capped annual inflation.
 *
 *  Three pillars:
 *    1. BURN-PER-REQUEST  — RNG contract burns tokens on each request (dynamic rate)
 *    2. STAKE-FOR-DISCOUNT — holders stake to unlock lower tiers (separate staking contract)
 *    3. VERIFIER REWARDS   — capped inflation funds decentralized verification
 *
 *  Supply model:
 *    - Initial supply: 1,000,000,000 ORNG (minted to deployer at construction)
 *    - Burn: any holder or approved spender may burn via ERC20Burnable
 *    - Mint: MINTER_ROLE can mint up to MAX_ANNUAL_INFLATION_BPS (200 = 2%) of
 *            initialSupply per fiscal year. Year resets every 365.25 days from deploy.
 *    - Governance can LOWER the cap but never RAISE it above 2%.
 *
 *  Patent: "Method and System for Gaming Random Number Generation"
 *  Chain: Polygon PoS
 */
contract ORNGToken is ERC20, ERC20Burnable, AccessControl {
    // ──────────────────────────────────────────────
    // Roles
    // ──────────────────────────────────────────────
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");

    // ──────────────────────────────────────────────
    // Constants
    // ──────────────────────────────────────────────
    uint256 public constant INITIAL_SUPPLY = 1_000_000_000 ether; // 1B tokens (18 decimals)
    uint16  public constant MAX_ANNUAL_INFLATION_BPS = 200;        // 2% hard ceiling — immutable
    uint256 private constant YEAR = 365.25 days;
    uint256 private constant BPS_DENOMINATOR = 10_000;

    // ──────────────────────────────────────────────
    // State
    // ──────────────────────────────────────────────
    uint256 public immutable deployTimestamp;

    /// @notice Current inflation cap (governance can lower, never above MAX)
    uint16  public annualInflationBps;

    /// @notice Total minted in the current fiscal year
    uint256 public mintedThisYear;

    /// @notice Start of the current fiscal year (resets every 365.25 days)
    uint256 public currentYearStart;

    /// @notice Cumulative tokens burned (informational — not used for logic)
    uint256 public totalBurned;

    // ──────────────────────────────────────────────
    // Events
    // ──────────────────────────────────────────────
    event InflationCapUpdated(uint16 oldBps, uint16 newBps);
    event YearRolled(uint256 newYearStart, uint256 previousYearMinted);

    // ──────────────────────────────────────────────
    // Errors
    // ──────────────────────────────────────────────
    error ExceedsAnnualMintCap(uint256 requested, uint256 remaining);
    error InflationCapTooHigh(uint16 requested, uint16 max);
    error InflationCapCannotIncrease(uint16 current, uint16 requested);

    // ──────────────────────────────────────────────
    // Constructor
    // ──────────────────────────────────────────────
    constructor(address admin) ERC20("OpenRNG Token", "ORNG") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(GOVERNOR_ROLE, admin);
        // MINTER_ROLE intentionally not granted here — assign to RNG/staking contracts later

        deployTimestamp = block.timestamp;
        currentYearStart = block.timestamp;
        annualInflationBps = MAX_ANNUAL_INFLATION_BPS; // start at 2%, governance can lower

        _mint(admin, INITIAL_SUPPLY);
    }

    // ──────────────────────────────────────────────
    // Minting (capped inflation)
    // ──────────────────────────────────────────────

    /**
     * @notice Mint new tokens (verifier rewards only). Capped per fiscal year.
     * @param to     Recipient (typically staking/reward contract)
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _rollYearIfNeeded();

        uint256 cap = _currentYearMintCap();
        uint256 remaining = cap > mintedThisYear ? cap - mintedThisYear : 0;

        if (amount > remaining) {
            revert ExceedsAnnualMintCap(amount, remaining);
        }

        mintedThisYear += amount;
        _mint(to, amount);
    }

    /**
     * @return Maximum tokens mintable in the current fiscal year
     */
    function currentYearMintCap() external view returns (uint256) {
        return _currentYearMintCap();
    }

    /**
     * @return Tokens still mintable in the current fiscal year
     */
    function remainingMintableThisYear() external view returns (uint256) {
        // If year should have rolled, the remaining would be full cap
        if (block.timestamp >= currentYearStart + YEAR) {
            return _currentYearMintCap();
        }
        uint256 cap = _currentYearMintCap();
        return cap > mintedThisYear ? cap - mintedThisYear : 0;
    }

    // ──────────────────────────────────────────────
    // Governance
    // ──────────────────────────────────────────────

    /**
     * @notice Lower the annual inflation cap. Can never exceed MAX_ANNUAL_INFLATION_BPS.
     * @param newBps New cap in basis points (e.g. 100 = 1%)
     */
    function setAnnualInflationBps(uint16 newBps) external onlyRole(GOVERNOR_ROLE) {
        if (newBps > MAX_ANNUAL_INFLATION_BPS) {
            revert InflationCapTooHigh(newBps, MAX_ANNUAL_INFLATION_BPS);
        }
        if (newBps > annualInflationBps) {
            revert InflationCapCannotIncrease(annualInflationBps, newBps);
        }

        uint16 oldBps = annualInflationBps;
        annualInflationBps = newBps;
        emit InflationCapUpdated(oldBps, newBps);
    }

    // ──────────────────────────────────────────────
    // Burn tracking (override hooks)
    // ──────────────────────────────────────────────

    /**
     * @dev Track cumulative burn for transparency / analytics.
     *      Does not affect core ERC-20 logic.
     */
    function _update(address from, address to, uint256 value) internal override {
        super._update(from, to, value);

        // Track burns (transfers to address(0))
        if (to == address(0)) {
            totalBurned += value;
        }
    }

    // ──────────────────────────────────────────────
    // Internal helpers
    // ──────────────────────────────────────────────

    function _currentYearMintCap() internal view returns (uint256) {
        return (INITIAL_SUPPLY * annualInflationBps) / BPS_DENOMINATOR;
    }

    function _rollYearIfNeeded() internal {
        if (block.timestamp >= currentYearStart + YEAR) {
            // How many full years have passed?
            uint256 yearsPassed = (block.timestamp - currentYearStart) / YEAR;
            uint256 previousMinted = mintedThisYear;

            currentYearStart += yearsPassed * YEAR;
            mintedThisYear = 0;

            emit YearRolled(currentYearStart, previousMinted);
        }
    }
}
