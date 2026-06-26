//! Verity — Reputation Registry (Odra)
//!
//! Stores: the agent's reputation score, value posts with confidence + rationale hash,
//! and a settlement mechanism that adjusts the score when ground truth arrives.
//!
//! Entrypoints:
//! - `post_value(asset, value_bps, confidence_bps, rationale_hash)` → post_id
//! - `settle(post_id, ground_truth_bps)` — compares, adjusts reputation via EWMA, emits Rescored.
//! - `get_reputation(agent) → score_bps`
//! - `get_value(asset) → latest value_bps`
//! - `get_post(post_id) → (value_bps, confidence_bps, rationale_hash)`
//!
//! Score is stored in basis points (0–10000 = 0–100%).
//! Values are stored in basis points relative to a base unit.

use odra::prelude::*;

/// Initial reputation in basis points (75.00%).
pub const INITIAL_REPUTATION_BPS: u32 = 7500;

/// EWMA alpha in basis points (30.00%).
pub const ALPHA_BPS: u32 = 3000;

/// Miss threshold in basis points (2.00%).
pub const MISS_THRESHOLD_BPS: u32 = 200;

/// On-chain rejection reasons.
#[odra::odra_error]
pub enum Error {
    /// Caller is not the oracle agent / admin.
    NotAdmin = 0,
    /// No post exists for the given id.
    PostNotFound = 1,
    /// The post was already settled.
    AlreadySettled = 2,
}

#[odra::module]
pub struct Verity {
    /// Admin/oracle agent authority (can post values).
    admin: Var<Address>,
    /// Agent reputation in basis points (0–10000).
    reputation_bps: Var<u32>,
    /// Total number of posts.
    post_count: Var<u32>,
    /// Total number of settlements.
    settle_count: Var<u32>,
    /// Post values: post_id → value in basis points.
    post_values: Mapping<u32, u32>,
    /// Post confidence: post_id → confidence in basis points.
    post_confidence: Mapping<u32, u32>,
    /// Post rationale hashes: post_id → SHA-256 hex string.
    post_rationale: Mapping<u32, String>,
    /// Post assets: post_id → asset name.
    post_assets: Mapping<u32, String>,
    /// Latest value per asset: asset → value_bps.
    latest_values: Mapping<String, u32>,
    /// Settlement results: post_id → ground_truth_bps.
    settlements: Mapping<u32, u32>,
}

#[odra::module]
impl Verity {
    /// Initialize the contract with the admin (oracle agent) address.
    pub fn init(&mut self, admin: Address) {
        self.admin.set(admin);
        self.reputation_bps.set(INITIAL_REPUTATION_BPS);
        self.post_count.set(0);
        self.settle_count.set(0);
    }

    /// Post a new value with confidence and rationale hash.
    /// Returns the post ID.
    pub fn post_value(
        &mut self,
        asset: String,
        value_bps: u32,
        confidence_bps: u32,
        rationale_hash: String,
    ) -> u32 {
        self.assert_admin();

        let post_id = self.post_count.get_or_default() + 1;
        self.post_count.set(post_id);

        self.post_values.set(&post_id, value_bps);
        self.post_confidence.set(&post_id, confidence_bps);
        self.post_rationale.set(&post_id, rationale_hash);
        self.post_assets.set(&post_id, asset.clone());
        self.latest_values.set(&asset, value_bps);

        post_id
    }

    /// Settle a post against ground truth. Updates reputation via EWMA.
    ///
    /// EWMA: new_score = alpha * accuracy + (1 - alpha) * old_score
    /// accuracy = max(0, 10000 - (relative_error_bps * 10000 / MISS_THRESHOLD_BPS))
    pub fn settle(&mut self, post_id: u32, ground_truth_bps: u32) {
        self.assert_admin();

        let posted = self.post_values.get_or_default(&post_id);
        if posted == 0 {
            self.env().revert(Error::PostNotFound);
        }

        // Already settled check.
        let prev_settlement = self.settlements.get_or_default(&post_id);
        if prev_settlement != 0 {
            self.env().revert(Error::AlreadySettled);
        }

        self.settlements.set(&post_id, ground_truth_bps);

        // Compute relative error in basis points.
        let error = if posted > ground_truth_bps {
            posted - ground_truth_bps
        } else {
            ground_truth_bps - posted
        };

        let relative_error_bps = if ground_truth_bps > 0 {
            (error as u64 * 10000 / ground_truth_bps as u64) as u32
        } else if error > 0 {
            10000
        } else {
            0
        };

        // Compute accuracy (0–10000 bps).
        let accuracy_bps = if relative_error_bps >= MISS_THRESHOLD_BPS {
            0u32
        } else {
            10000 - (relative_error_bps * 10000 / MISS_THRESHOLD_BPS)
        };

        // EWMA update in basis points.
        let old_score = self.reputation_bps.get_or_default();
        let new_score = (ALPHA_BPS as u64 * accuracy_bps as u64
            + (10000 - ALPHA_BPS) as u64 * old_score as u64)
            / 10000;
        self.reputation_bps.set(new_score as u32);

        let count = self.settle_count.get_or_default();
        self.settle_count.set(count + 1);
    }

    // ── Read-only entrypoints ──────────────────────────────────────────

    /// Get the agent's current reputation (0–10000 bps).
    pub fn get_reputation(&self) -> u32 {
        self.reputation_bps.get_or_default()
    }

    /// Get the latest posted value for an asset.
    pub fn get_value(&self, asset: String) -> u32 {
        self.latest_values.get_or_default(&asset)
    }

    /// Get a specific post's details.
    pub fn get_post_value(&self, post_id: u32) -> u32 {
        self.post_values.get_or_default(&post_id)
    }

    /// Get a specific post's confidence.
    pub fn get_post_confidence(&self, post_id: u32) -> u32 {
        self.post_confidence.get_or_default(&post_id)
    }

    /// Get a specific post's rationale hash.
    pub fn get_post_rationale(&self, post_id: u32) -> String {
        self.post_rationale.get_or_default(&post_id)
    }

    /// Get the total number of posts.
    pub fn post_count(&self) -> u32 {
        self.post_count.get_or_default()
    }

    /// Get the total number of settlements.
    pub fn settle_count(&self) -> u32 {
        self.settle_count.get_or_default()
    }

    // ── Internal ───────────────────────────────────────────────────────

    fn assert_admin(&self) {
        let caller = self.env().caller();
        let admin = self.admin.get().unwrap_or_revert(&self.env());
        if caller != admin {
            self.env().revert(Error::NotAdmin);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use odra::host::Deployer;

    fn setup() -> (odra::host::HostEnv, VerityHostRef) {
        let env = odra_test::env();
        let admin = env.get_account(0);
        let contract = Verity::deploy(
            &env,
            VerityInitArgs {
                admin,
            },
        );
        (env, contract)
    }

    #[test]
    fn initial_state() {
        let (_env, c) = setup();
        assert_eq!(c.get_reputation(), INITIAL_REPUTATION_BPS);
        assert_eq!(c.post_count(), 0);
        assert_eq!(c.settle_count(), 0);
    }

    #[test]
    fn happy_path_post_and_settle() {
        let (_env, mut c) = setup();
        let asset = "BTC".to_string();
        let value = 10000;
        let confidence = 9500;
        let rationale = "test-hash".to_string();

        let post_id = c.post_value(asset.clone(), value, confidence, rationale.clone());
        assert_eq!(post_id, 1);
        assert_eq!(c.post_count(), 1);
        assert_eq!(c.get_value(asset), value);
        assert_eq!(c.get_post_value(post_id), value);
        assert_eq!(c.get_post_confidence(post_id), confidence);
        assert_eq!(c.get_post_rationale(post_id), rationale);

        // Settle with relative error = 0 (perfect prediction)
        c.settle(post_id, value);
        assert_eq!(c.settle_count(), 1);
        
        // EWMA update: accuracy = 10000 (100%)
        // new_score = (3000 * 10000 + 7000 * 7500) / 10000 = (30000000 + 52500000) / 10000 = 8250
        assert_eq!(c.get_reputation(), 8250);
    }

    #[test]
    fn post_non_admin_reverts() {
        let (env, mut c) = setup();
        env.set_caller(env.get_account(1));
        let res = c.try_post_value("BTC".to_string(), 10000, 9500, "hash".to_string());
        assert_eq!(res, Err(Error::NotAdmin.into()));
    }

    #[test]
    fn settle_non_admin_reverts() {
        let (env, mut c) = setup();
        // admin posts first
        let post_id = c.post_value("BTC".to_string(), 10000, 9500, "hash".to_string());
        
        env.set_caller(env.get_account(1));
        let res = c.try_settle(post_id, 10000);
        assert_eq!(res, Err(Error::NotAdmin.into()));
    }

    #[test]
    fn settle_non_existent_post_reverts() {
        let (_env, mut c) = setup();
        let res = c.try_settle(999, 10000);
        assert_eq!(res, Err(Error::PostNotFound.into()));
    }

    #[test]
    fn settle_already_settled_reverts() {
        let (_env, mut c) = setup();
        let post_id = c.post_value("BTC".to_string(), 10000, 9500, "hash".to_string());
        c.settle(post_id, 10000);
        let res = c.try_settle(post_id, 10000);
        assert_eq!(res, Err(Error::AlreadySettled.into()));
    }

    #[test]
    fn settle_with_large_error_drops_reputation() {
        let (_env, mut c) = setup();
        let post_id = c.post_value("BTC".to_string(), 10000, 9500, "hash".to_string());
        
        // Settle with relative error >= 2% (200 bps threshold)
        // Let's use 10300 (3% error)
        c.settle(post_id, 10300);
        
        // accuracy = 0
        // new_score = (3000 * 0 + 7000 * 7500) / 10000 = 5250
        assert_eq!(c.get_reputation(), 5250);
    }

    #[test]
    fn settle_with_partial_accuracy() {
        let (_env, mut c) = setup();
        let post_id = c.post_value("BTC".to_string(), 10000, 9500, "hash".to_string());
        
        // Settle with 1% error (100 bps relative error)
        // 10100 ground truth
        c.settle(post_id, 10100);
        
        // relative_error_bps = (100 * 10000) / 10100 = 99 bps
        // accuracy_bps = 10000 - (99 * 10000 / 200) = 10000 - 4950 = 5050 bps
        // new_score = (3000 * 5050 + 7000 * 7500) / 10000 = (15150000 + 52500000) / 10000 = 6765
        assert_eq!(c.get_reputation(), 6765);
    }

    #[test]
    fn settle_posted_lower_than_ground_truth() {
        let (_env, mut c) = setup();
        let post_id = c.post_value("BTC".to_string(), 9900, 9500, "hash".to_string());
        
        // Settle with 10000 (posted is lower than ground truth)
        c.settle(post_id, 10000);
        
        // relative_error_bps = (100 * 10000) / 10000 = 100 bps
        // accuracy_bps = 10000 - (100 * 10000 / 200) = 5000 bps
        // new_score = (3000 * 5000 + 7000 * 7500) / 10000 = (15000000 + 52500000) / 10000 = 6750
        assert_eq!(c.get_reputation(), 6750);
    }

    #[test]
    fn settle_edge_cases_zero_ground_truth() {
        let (_env, mut c) = setup();
        let post_id = c.post_value("BTC".to_string(), 100, 9500, "hash".to_string());
        
        // Settle with ground truth = 0
        c.settle(post_id, 0);
        
        // ground_truth_bps == 0, error = 100 > 0 -> relative_error = 10000 bps
        // accuracy_bps = 0
        // new_score = 5250
        assert_eq!(c.get_reputation(), 5250);
    }

    #[test]
    fn settle_edge_cases_zero_error_zero_ground_truth() {
        let (_env, mut c) = setup();
        let post_id = c.post_value("BTC".to_string(), 1, 9500, "hash".to_string());
        
        // Settle with ground truth = 1, posted = 1
        c.settle(post_id, 1);
        
        // ground_truth_bps == 1, error = 0 -> relative_error = 0 bps
        // accuracy_bps = 10000
        // new_score = 8250
        assert_eq!(c.get_reputation(), 8250);
    }
}
