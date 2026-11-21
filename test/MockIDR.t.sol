// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {MockIDR} from "../src/MockIDR.sol";

contract MockIDRTest is Test {
    MockIDR token;

    address owner = address(0xA11CE);
    address minter = address(0x515C0);
    address bob = address(0xB0B);

    function setUp() public {
        token = new MockIDR(1_000_000, owner);
    }

    function test_InitialSupplyKeOwner() public view {
        assertEq(token.balanceOf(owner), 1_000_000);
        assertEq(token.totalSupply(), 1_000_000);
    }

    function test_DecimalsAdalahNol() public view {
        assertEq(token.decimals(), 0);
    }

    function test_Revert_ConstructorOwnerNol() public {
        vm.expectRevert(abi.encodeWithSignature("OwnableInvalidOwner(address)", address(0)));

        new MockIDR(1_000_000, address(0));
    }

    function test_SetMinter() public {
        vm.prank(owner);

        token.setMinter(minter, true);

        assertTrue(token.isMinter(minter));
    }

    function test_EmitMinterSet() public {
        vm.expectEmit(true, false, false, true);

        emit MockIDR.MinterSet(minter, true);

        vm.prank(owner);
        token.setMinter(minter, true);
    }

    function test_Revert_SetMinterAlamatNol() public {
        vm.prank(owner);

        vm.expectRevert(MockIDR.AlamatNol.selector);

        token.setMinter(address(0), true);
    }

    function test_Revert_SetMinterBukanOwner() public {
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", bob));

        vm.prank(bob);

        token.setMinter(minter, true);
    }

    function test_MintOlehOwner() public {
        vm.prank(owner);

        token.mint(bob, 10_000);

        assertEq(token.balanceOf(bob), 10_000);
    }

    function test_MintOlehMinter() public {
        vm.prank(owner);

        token.setMinter(minter, true);

        vm.prank(minter);

        token.mint(bob, 25_000);

        assertEq(token.balanceOf(bob), 25_000);
    }

    function test_Revert_MintBukanMinter() public {
        vm.expectRevert(abi.encodeWithSelector(MockIDR.BukanMinter.selector, bob));

        vm.prank(bob);

        token.mint(bob, 1);
    }

    function test_Revert_MintMelebihiMaxSupply() public {
        uint256 max = token.MAX_SUPPLY();
        uint256 sisa = max - token.totalSupply();

        vm.prank(owner);

        vm.expectRevert(abi.encodeWithSelector(MockIDR.MelebihiMaxSupply.selector, max, sisa));

        token.mint(owner, max);
    }

    function test_Burn() public {
        vm.prank(owner);

        token.burn(400_000);

        assertEq(token.balanceOf(owner), 600_000);
        assertEq(token.totalSupply(), 600_000);
    }
}
