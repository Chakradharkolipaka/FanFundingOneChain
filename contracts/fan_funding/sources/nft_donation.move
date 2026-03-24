/// NFT Donation module for FanFunding on OneChain.
/// Allows creators to mint NFTs (image or video) and fans to donate OCT.
module fan_funding::nft_donation {
    use one::object::{Self, UID};
    use one::transfer;
    use one::tx_context::{Self, TxContext};
    use one::coin::{Self, Coin};
    use one::oct::OCT;
    use one::event;
    use one::balance::{Self, Balance};
    use std::string::{Self, String};

    // ─── Errors ──────────────────────────────────────────────
    const E_ZERO_AMOUNT: u64 = 0;
    const E_NOT_OWNER: u64 = 1;
    const E_INSUFFICIENT_BALANCE: u64 = 2;

    // ─── Objects ─────────────────────────────────────────────

    /// Shared registry that tracks all minted NFTs
    public struct Registry has key {
        id: UID,
        total_nfts: u64,
        total_donations: u64,
    }

    /// An NFT representing a creator's content (image or video)
    public struct FanNFT has key, store {
        id: UID,
        token_id: u64,
        name: String,
        description: String,
        token_uri: String,
        /// "image" or "video"
        media_type: String,
        /// For video NFTs, the price (in MIST) to unlock; 0 for free / image
        watch_price: u64,
        creator: address,
        total_donated: Balance<OCT>,
    }

    // ─── Events ──────────────────────────────────────────────

    public struct NFTMinted has copy, drop {
        token_id: u64,
        creator: address,
        name: String,
        token_uri: String,
        media_type: String,
    }

    public struct DonationReceived has copy, drop {
        token_id: u64,
        donor: address,
        amount: u64,
    }

    public struct FundsWithdrawn has copy, drop {
        token_id: u64,
        creator: address,
        amount: u64,
    }

    // ─── Init (creates shared Registry) ──────────────────────

    fun init(ctx: &mut TxContext) {
        let registry = Registry {
            id: object::new(ctx),
            total_nfts: 0,
            total_donations: 0,
        };
        transfer::share_object(registry);
    }

    // ─── Public Entry Functions ──────────────────────────────

    /// Mint a standard image NFT
    public entry fun mint_nft(
        registry: &mut Registry,
        name: vector<u8>,
        description: vector<u8>,
        token_uri: vector<u8>,
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        let token_id = registry.total_nfts + 1;
        registry.total_nfts = token_id;

        let nft = FanNFT {
            id: object::new(ctx),
            token_id,
            name: string::utf8(name),
            description: string::utf8(description),
            token_uri: string::utf8(token_uri),
            media_type: string::utf8(b"image"),
            watch_price: 0,
            creator: sender,
            total_donated: balance::zero<OCT>(),
        };

        event::emit(NFTMinted {
            token_id,
            creator: sender,
            name: string::utf8(name),
            token_uri: string::utf8(token_uri),
            media_type: string::utf8(b"image"),
        });

        transfer::share_object(nft);
    }

    /// Mint a video NFT with a pay-per-view price (in MIST)
    public entry fun mint_video_nft(
        registry: &mut Registry,
        name: vector<u8>,
        description: vector<u8>,
        token_uri: vector<u8>,
        watch_price: u64,
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        let token_id = registry.total_nfts + 1;
        registry.total_nfts = token_id;

        let nft = FanNFT {
            id: object::new(ctx),
            token_id,
            name: string::utf8(name),
            description: string::utf8(description),
            token_uri: string::utf8(token_uri),
            media_type: string::utf8(b"video"),
            watch_price,
            creator: sender,
            total_donated: balance::zero<OCT>(),
        };

        event::emit(NFTMinted {
            token_id,
            creator: sender,
            name: string::utf8(name),
            token_uri: string::utf8(token_uri),
            media_type: string::utf8(b"video"),
        });

        transfer::share_object(nft);
    }

    /// Donate OCT to a specific NFT
    public entry fun donate(
        registry: &mut Registry,
        nft: &mut FanNFT,
        payment: Coin<OCT>,
        _ctx: &mut TxContext,
    ) {
        let amount = coin::value(&payment);
        assert!(amount > 0, E_ZERO_AMOUNT);

        let payment_balance = coin::into_balance(payment);
        balance::join(&mut nft.total_donated, payment_balance);

        registry.total_donations = registry.total_donations + amount;

        event::emit(DonationReceived {
            token_id: nft.token_id,
            donor: tx_context::sender(_ctx),
            amount,
        });
    }

    /// Creator withdraws accumulated donations from their NFT
    public entry fun withdraw(
        nft: &mut FanNFT,
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        assert!(sender == nft.creator, E_NOT_OWNER);

        let amount = balance::value(&nft.total_donated);
        assert!(amount > 0, E_INSUFFICIENT_BALANCE);

        let withdrawn = coin::from_balance(
            balance::withdraw_all(&mut nft.total_donated),
            ctx,
        );

        event::emit(FundsWithdrawn {
            token_id: nft.token_id,
            creator: sender,
            amount,
        });

        transfer::public_transfer(withdrawn, sender);
    }

    // ─── View Functions ──────────────────────────────────────

    public fun get_nft_info(nft: &FanNFT): (u64, String, String, String, String, u64, address, u64) {
        (
            nft.token_id,
            nft.name,
            nft.description,
            nft.token_uri,
            nft.media_type,
            nft.watch_price,
            nft.creator,
            balance::value(&nft.total_donated),
        )
    }

    public fun get_registry_info(registry: &Registry): (u64, u64) {
        (registry.total_nfts, registry.total_donations)
    }
}
