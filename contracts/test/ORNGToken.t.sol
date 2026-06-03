// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../ORNGToken.sol";

/// @title ORNGToken Test Suite (HH3 native Solidity tests)
contract ORNGTokenTest {
    ORNGToken token;
    address admin;
    address minter;
    address user1;

    bytes32 constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");

    uint256 constant INITIAL_SUPPLY = 1_000_000_000 ether;
    uint256 constant YEAR = 365.25 days;

    // ──────────────────────────────────────────────
    // Setup
    // ──────────────────────────────────────────────

    function setUp() public {
        admin = address(this);
        minter = address(0x1111);
        user1 = address(0x2222);

        token = new ORNGToken(admin);
        token.grantRole(MINTER_ROLE, minter);
        token.grantRole(GOVERNOR_ROLE, admin);
    }

    // ──────────────────────────────────────────────
    // Deployment
    // ──────────────────────────────────────────────

    function testInitialSupply() public view {
        require(token.totalSupply() == INITIAL_SUPPLY, "Total supply should be 1B");
    }

    function testAdminBalance() public view {
        require(token.balanceOf(admin) == INITIAL_SUPPLY, "Admin should hold all tokens");
    }

    function testNameAndSymbol() public view {
        require(
            keccak256(bytes(token.name())) == keccak256(bytes("OpenRNG Token")),
            "Name should be OpenRNG Token"
        );
        require(
            keccak256(bytes(token.symbol())) == keccak256(bytes("ORNG")),
            "Symbol should be ORNG"
        );
    }

    function testInitialInflationCap() public view {
        require(token.annualInflationBps() == 200, "Initial inflation should be 200 bps (2%)");
    }

    function testDeployTimestamp() public view {
        require(token.deployTimestamp() > 0, "Deploy timestamp should be set");
    }

    // ──────────────────────────────────────────────
    // Burning
    // ──────────────────────────────────────────────

    function testBurn() public {
        uint256 burnAmount = 1000 ether;
        token.burn(burnAmount);

        require(
            token.balanceOf(admin) == INITIAL_SUPPLY - burnAmount,
            "Balance should decrease after burn"
        );
    }

    function testTotalBurnedTracking() public {
        uint256 burnAmount = 5000 ether;
        token.burn(burnAmount);

        require(token.totalBurned() == burnAmount, "totalBurned should track burns");
    }

    function testBurnFromWithApproval() public {
        uint256 amount = 100 ether;
        token.transfer(user1, amount);

        // Simulate approval from user1 — since we can't prank in pure Solidity test,
        // we test the admin burning their own via burnFrom pattern
        token.approve(address(this), amount);
        token.burnFrom(admin, amount);

        require(token.totalBurned() == amount, "burnFrom should track in totalBurned");
    }

    function testCumulativeBurns() public {
        token.burn(100 ether);
        token.burn(200 ether);
        token.burn(300 ether);

        require(token.totalBurned() == 600 ether, "totalBurned should accumulate");
    }

    // ──────────────────────────────────────────────
    // Minting (capped inflation)
    // ──────────────────────────────────────────────

    function testMintWithinCap() public {
        // Grant minter role to this contract for direct testing
        token.grantRole(MINTER_ROLE, admin);

        uint256 mintAmount = 1_000_000 ether; // 1M (under 2% of 1B = 20M)
        token.mint(user1, mintAmount);

        require(token.balanceOf(user1) == mintAmount, "User should receive minted tokens");
    }

    function testMintTracksYearlyAmount() public {
        token.grantRole(MINTER_ROLE, admin);

        uint256 amount = 5_000_000 ether;
        token.mint(user1, amount);
        require(token.mintedThisYear() == amount, "mintedThisYear should track");

        token.mint(user1, amount);
        require(token.mintedThisYear() == amount * 2, "mintedThisYear should accumulate");
    }

    function testMintExceedingCapReverts() public {
        token.grantRole(MINTER_ROLE, admin);

        uint256 tooMuch = 21_000_000 ether; // > 20M (2% of 1B)

        try token.mint(user1, tooMuch) {
            revert("Should have reverted");
        } catch {
            // Expected
        }
    }

    function testRemainingMintable() public {
        token.grantRole(MINTER_ROLE, admin);

        uint256 cap = 20_000_000 ether; // 2% of 1B
        require(token.remainingMintableThisYear() == cap, "Should start at full cap");

        uint256 minted = 7_000_000 ether;
        token.mint(user1, minted);

        require(
            token.remainingMintableThisYear() == cap - minted,
            "Remaining should decrease after mint"
        );
    }

    // ──────────────────────────────────────────────
    // Governance
    // ──────────────────────────────────────────────

    function testLowerInflationCap() public {
        token.setAnnualInflationBps(100); // 1%
        require(token.annualInflationBps() == 100, "Cap should be lowered to 100 bps");
    }

    function testCannotRaiseCapAboveCurrent() public {
        token.setAnnualInflationBps(100); // Lower to 1%

        try token.setAnnualInflationBps(150) {
            revert("Should have reverted - cannot increase cap");
        } catch {
            // Expected
        }
    }

    function testCannotExceedMaxCap() public {
        try token.setAnnualInflationBps(300) {
            revert("Should have reverted - exceeds max 200 bps");
        } catch {
            // Expected
        }
    }

    function testSetCapToZeroDisablesMinting() public {
        token.grantRole(MINTER_ROLE, admin);
        token.setAnnualInflationBps(0);

        try token.mint(user1, 1) {
            revert("Should have reverted - minting disabled");
        } catch {
            // Expected
        }
    }

    function testLowerCapEnforcedOnMint() public {
        token.grantRole(MINTER_ROLE, admin);
        token.setAnnualInflationBps(100); // 1% → cap = 10M

        token.mint(user1, 10_000_000 ether); // Exactly at cap

        try token.mint(user1, 1) {
            revert("Should have reverted - cap reached");
        } catch {
            // Expected
        }
    }

    // ──────────────────────────────────────────────
    // Integration: burn + mint
    // ──────────────────────────────────────────────

    function testSupplyAfterBurnsAndMints() public {
        token.grantRole(MINTER_ROLE, admin);

        // Burn 10M
        token.burn(10_000_000 ether);

        // Mint 5M
        token.mint(user1, 5_000_000 ether);

        // Net: 1B - 10M + 5M = 995M
        require(
            token.totalSupply() == 995_000_000 ether,
            "Supply should be 995M after burns and mints"
        );
        require(
            token.totalBurned() == 10_000_000 ether,
            "totalBurned should be 10M"
        );
    }

    function testCurrentYearMintCap() public view {
        require(
            token.currentYearMintCap() == 20_000_000 ether,
            "Year mint cap should be 20M (2% of 1B)"
        );
    }
}
