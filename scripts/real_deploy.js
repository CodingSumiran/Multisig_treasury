import { ethers } from "ethers";
import { readFileSync } from "fs";
import 'dotenv/config';

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const wallet = new ethers.Wallet(process.env.SEPOLIA_PRIVATE_KEY, provider);
  
  console.log("Deploying with:", wallet.address);

  const artifact = JSON.parse(
    readFileSync("./artifacts/contracts/MultiSigTreasury.sol/MultiSigTreasury.json", "utf8")
  );

  // 실제 조원들 주소!
  const owners = [
    "0x79722aCD6bd0aB02E4Bf59dd72d605357Bb18999",  // 너 (이승은)
    "0x451A5493Eb07f707e208350d0A1e0cd277Cac0ba",  // 두번째
    "0x1f7c0A340EC5f80203fa4Ec980512eA140896fac"   // 조원2
  ];
  const required = 2;  // 2명 승인 필요

  console.log("Owners:", owners);
  console.log("Required approvals:", required);

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const treasury = await factory.deploy(owners, required);

  await treasury.waitForDeployment();

  const address = await treasury.getAddress();
  console.log("✅ MultiSigTreasury deployed to:", address);
  console.log("View on Etherscan: https://sepolia.etherscan.io/address/" + address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});