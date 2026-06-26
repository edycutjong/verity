//! Livenet deploy script for the Verity reputation-registry contract.
//!
//! Deploys to Casper Testnet via the Odra livenet backend. Run:
//!   cargo run --bin verity_livenet --features livenet
//!
//! Required env (see ../LIVE_TESTNET.md):
//!   ODRA_CASPER_LIVENET_SECRET_KEY_PATH  — PEM of a faucet-funded Testnet key
//!   ODRA_CASPER_LIVENET_NODE_ADDRESS     — e.g. https://node.testnet.cspr.cloud
//!   ODRA_CASPER_LIVENET_CHAIN_NAME       — casper-test
//!   ODRA_CASPER_LIVENET_EVENTS_URL       — e.g. https://node.testnet.cspr.cloud/events
//! Optional:
//!   VERITY_INSTALL_GAS   — install gas in motes (default 300 CSPR)

use odra::host::Deployer;
use odra::prelude::Addressable;
use verity::verity::{Verity, VerityInitArgs};

fn main() {
    let env = odra_casper_livenet_env::env();

    let install_gas: u64 = std::env::var("VERITY_INSTALL_GAS")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(300_000_000_000u64);

    // The deployer becomes `admin` (the oracle agent key).
    let admin = env.caller();

    env.set_gas(install_gas);
    let contract = Verity::deploy(&env, VerityInitArgs { admin });

    println!("✅ Verity deployed to Casper Testnet");
    println!("   contract address : {:?}", contract.address());
    println!("   admin            : {:?}", admin);
    println!();
    println!("Set VERITY_CONTRACT_HASH in .env.local to the hash above (strip any prefix).");
}
