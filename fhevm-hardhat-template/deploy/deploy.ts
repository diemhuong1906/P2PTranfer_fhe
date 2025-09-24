import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedConfidentialP2PEther = await deploy("ConfidentialP2PEther", {
    from: deployer,
    log: true,
  });
  

  console.log(`ConfidentialP2PEther contract: `, deployedConfidentialP2PEther.address);
 
};
export default func;
func.id = "deploy"; // id required to prevent reexecution
func.tags = ["ConfidentialP2PEther"];
