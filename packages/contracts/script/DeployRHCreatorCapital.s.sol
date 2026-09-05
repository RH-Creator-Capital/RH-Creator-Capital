// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/RHCreatorCapital.sol";

contract DeployRHCreatorCapital is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // For the backend signer, we'll use the deployer wallet itself for now,
        // or a specific backend signer if provided in ENV.
        address backendSigner = vm.envOr("BACKEND_SIGNER_ADDRESS", vm.addr(deployerPrivateKey));

        vm.startBroadcast(deployerPrivateKey);

        RHCreatorCapital creatorCapital = new RHCreatorCapital(backendSigner);
        
        console.log("RHCreatorCapital deployed to:", address(creatorCapital));
        console.log("Backend Signer set to:", backendSigner);

        vm.stopBroadcast();
    }
}
