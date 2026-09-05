// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {RHCreatorCapital} from "../src/RHCreatorCapital.sol";

contract RHCreatorCapitalTest is Test {
    RHCreatorCapital public rhcc;
    
    address owner = address(1);
    address backendSigner = address(2);
    address user1 = address(3);
    address user2 = address(4);

    function setUp() public {
        vm.startPrank(owner);
        rhcc = new RHCreatorCapital(backendSigner);
        vm.stopPrank();
    }

    function test_CreateMarket() public {
        bytes32 marketId = rhcc.createMarket("123456");
        
        (
            bytes32 id,
            string memory xUserId,
            address creatorWallet,
            bool claimed,
            bool listed,
            uint256 supply,
            uint256 reserve,
            uint256 totalVolume,
            uint256 lifetimeCreatorRewards,
            uint64 createdAt
        ) = rhcc.markets(marketId);

        assertEq(id, marketId);
        assertEq(xUserId, "123456");
        assertEq(creatorWallet, address(0));
        assertEq(claimed, false);
        assertEq(listed, true);
        assertEq(supply, 0);
        assertEq(reserve, 0);
        assertEq(totalVolume, 0);
        assertEq(lifetimeCreatorRewards, 0);
        assertGt(createdAt, 0);
    }

    function test_PriceCalculation() public {
        // Test first key
        uint256 price1 = rhcc.getPrice(0, 1);
        assertEq(price1, 0, "First key should be free");

        // Test next key price when supply is 1
        uint256 price2 = rhcc.getPrice(1, 1);
        // sum(1, 1) = (1)*2*3 / 6 = 1.  sum(0, 0) = 0. price = 1/16000 eth = 0.0000625 eth
        assertEq(price2, 62500000000000, "Second key should cost 0.0000625 ETH");
    }

    function test_BuyKeys() public {
        bytes32 marketId = rhcc.createMarket("123456");

        vm.startPrank(user1);
        vm.deal(user1, 1 ether);

        // Buy 1st key
        (uint256 price, uint256 fee) = rhcc.getBuyPriceAfterFee(marketId, 1);
        assertEq(price, 0);
        assertEq(fee, 0);
        
        rhcc.buyKeys{value: price + fee}(marketId, 1, 1 ether);
        
        assertEq(rhcc.keyBalances(marketId, user1), 1);
        vm.stopPrank();
    }
}
