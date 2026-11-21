// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AlokaEscrow} from "../src/AlokaEscrow.sol";

contract DeployAlokaEscrow is Script {
    function run() external {
        address tokenAddr = vm.envAddress("MOCK_IDR_ADDRESS");

        require(tokenAddr.code.length > 0, "MOCK_IDR belum ada di chain ini");

        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(privateKey);

        vm.startBroadcast(privateKey);

        AlokaEscrow escrow = new AlokaEscrow(IERC20(tokenAddr), deployer);

        vm.stopBroadcast();

        console.log("MockIDR:", tokenAddr);
        console.log("AlokaEscrow:", address(escrow));
        console.log("Owner:", deployer);
    }
}
