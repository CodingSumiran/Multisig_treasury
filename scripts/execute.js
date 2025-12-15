import { ethers } from "ethers";
import { readFileSync } from "fs";
import 'dotenv/config';

async function main() {
    const args = process.argv.slice(2);
    
    if (args.length < 1) {
        console.log("사용법: node scripts/execute.js <거래ID>");
        process.exit(1);
    }

    const txId = parseInt(args[0]);

    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    const wallet = new ethers.Wallet(process.env.SEPOLIA_PRIVATE_KEY, provider);
    const vaultAddress = process.env.VAULT_ADDRESS;

    const vaultArtifact = JSON.parse(readFileSync("./artifacts/contracts/MultiSigTreasury.sol/MultiSigTreasury.json", "utf8"));
    const vault = new ethers.Contract(vaultAddress, vaultArtifact.abi, wallet);

    const [canExec, reason] = await vault.canExecute(txId);
    const txInfo = await vault.getTransaction(txId);

    console.log("========================================");
    console.log("🚀 거래 실행");
    console.log("========================================");
    console.log("거래 ID:", txId);
    console.log("금액:", ethers.formatEther(txInfo.value), "ETH");
    console.log("승인 수:", txInfo.approvals.toString(), "/ 2");

    // 타임락 확인
    const now = Math.floor(Date.now() / 1000);
    const timelockUntil = Number(txInfo.timelockUntil);
    if (timelockUntil > now) {
        const remaining = timelockUntil - now;
        console.log(`\n❌ 타임락 대기 중: ${remaining}초 남음`);
        console.log(`   ${remaining}초 후에 다시 실행하세요!`);
        return;
    }

    if (!canExec) {
        console.log("\n❌ 실행 불가:", reason);
        return;
    }

    // 잔액 확인
    const balance = await vault.getBalance();
    if (balance < txInfo.value) {
        console.log("\n❌ 금고 잔액 부족!");
        console.log("   필요:", ethers.formatEther(txInfo.value), "ETH");
        console.log("   잔액:", ethers.formatEther(balance), "ETH");
        return;
    }

    console.log("\n⏳ 실행 중...");
    const tx = await vault.execute(txId);
    await tx.wait();

    console.log("\n✅ 실행 완료! ETH 전송됨!");
    console.log("   TX:", tx.hash);
    console.log("   새 잔액:", ethers.formatEther(await vault.getBalance()), "ETH");
}

main().catch(console.error);
