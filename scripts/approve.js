import { ethers } from "ethers";
import { readFileSync } from "fs";
import 'dotenv/config';

async function main() {
    const args = process.argv.slice(2);
    
    if (args.length < 1) {
        console.log("사용법: node scripts/approve.js <거래ID>");
        process.exit(1);
    }

    const txId = parseInt(args[0]);

    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    const wallet = new ethers.Wallet(process.env.SEPOLIA_PRIVATE_KEY, provider);
    const vaultAddress = process.env.VAULT_ADDRESS;

    const vaultArtifact = JSON.parse(readFileSync("./artifacts/contracts/MultiSigTreasury.sol/MultiSigTreasury.json", "utf8"));
    const vault = new ethers.Contract(vaultAddress, vaultArtifact.abi, wallet);

    const txInfo = await vault.getTransaction(txId);
    const alreadyApproved = await vault.isApproved(txId, wallet.address);

    console.log("========================================");
    console.log("✅ 거래 승인");
    console.log("========================================");
    console.log("거래 ID:", txId);
    console.log("금액:", ethers.formatEther(txInfo.value), "ETH");
    console.log("현재 승인:", txInfo.approvals.toString(), "/ 2");
    console.log("승인자:", wallet.address.slice(0,10) + "...");

    if (alreadyApproved) {
        console.log("\n⚠️ 이미 승인한 거래입니다!");
        return;
    }

    if (txInfo.executed) {
        console.log("\n⚠️ 이미 실행된 거래입니다!");
        return;
    }

    const tx = await vault.approve(txId);
    console.log("\n⏳ 승인 중...");
    await tx.wait();

    const txInfoAfter = await vault.getTransaction(txId);
    const [canExec, reason] = await vault.canExecute(txId);

    console.log("\n✅ 승인 완료!");
    console.log("   현재 승인:", txInfoAfter.approvals.toString(), "/ 2");
    
    if (canExec) {
        console.log("\n🟢 이제 실행 가능!");
        console.log("   👉 node scripts/execute.js", txId);
    } else if (txInfoAfter.approvals >= 2n) {
        const remaining = Number(txInfoAfter.timelockUntil) - Math.floor(Date.now()/1000);
        if (remaining > 0) {
            console.log(`\n⏱️ 타임락 대기 중: ${remaining}초 후 실행 가능`);
        }
    } else {
        console.log("\n🟡 1명 더 승인 필요");
        console.log("   (.env에서 조원 키로 변경 후 다시 실행)");
    }
}

main().catch(console.error);
