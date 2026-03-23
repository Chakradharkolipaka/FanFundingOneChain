/// Pay-Per-View module for FanFunding on OneChain.
/// Allows fans to pay to watch video NFTs and receive a ViewTicket as proof.
module fan_funding::pay_per_view {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::event;
    use sui::clock::{Self, Clock};
    use std::string::{Self, String};

    use fan_funding::nft_donation::FanNFT;

    // ─── Errors ──────────────────────────────────────────────
    const E_NOT_VIDEO: u64 = 100;
    const E_INSUFFICIENT_PAYMENT: u64 = 101;
    const E_FREE_CONTENT: u64 = 102;

    // ─── Objects ─────────────────────────────────────────────

    /// Proof that a viewer has paid to watch a video NFT
    struct ViewTicket has key, store {
        id: UID,
        token_id: u64,
        viewer: address,
        paid_amount: u64,
        timestamp_ms: u64,
    }

    // ─── Events ──────────────────────────────────────────────

    struct ViewPurchased has copy, drop {
        token_id: u64,
        viewer: address,
        amount: u64,
        timestamp_ms: u64,
    }

    // ─── Public Entry Functions ──────────────────────────────

    /// Pay to watch a video NFT. The payment goes to the NFT's donation pool.
    /// A ViewTicket is transferred to the viewer as proof of purchase.
    public entry fun pay_to_watch(
        nft: &mut FanNFT,
        payment: Coin<SUI>,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        // Read NFT info to validate
        let (token_id, _name, _desc, _uri, media_type, watch_price, _creator, _donated) =
            fan_funding::nft_donation::get_nft_info(nft);

        // Must be a video NFT
        assert!(media_type == std::string::utf8(b"video"), E_NOT_VIDEO);
        // Must have a price > 0
        assert!(watch_price > 0, E_FREE_CONTENT);

        let paid = coin::value(&payment);
        assert!(paid >= watch_price, E_INSUFFICIENT_PAYMENT);

        // Send the payment to the NFT donation pool (reuses donate logic)
        let payment_balance = coin::into_balance(payment);
        // We directly add balance to the NFT's donation pool via nft_donation::donate
        // But since we can't call entry functions from here, we transfer payment to creator
        // Instead, we transfer coin to creator directly
        let creator = _creator;
        let coin_to_send = coin::from_balance(payment_balance, ctx);
        transfer::public_transfer(coin_to_send, creator);

        let now_ms = clock::timestamp_ms(clock);
        let viewer = tx_context::sender(ctx);

        let ticket = ViewTicket {
            id: object::new(ctx),
            token_id,
            viewer,
            paid_amount: paid,
            timestamp_ms: now_ms,
        };

        event::emit(ViewPurchased {
            token_id,
            viewer,
            amount: paid,
            timestamp_ms: now_ms,
        });

        transfer::transfer(ticket, viewer);
    }

    // ─── View Functions ──────────────────────────────────────

    public fun get_ticket_info(ticket: &ViewTicket): (u64, address, u64, u64) {
        (ticket.token_id, ticket.viewer, ticket.paid_amount, ticket.timestamp_ms)
    }
}
