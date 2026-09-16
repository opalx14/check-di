// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/// @notice Narrow decoder for the EVM transaction encoding attested by Attestcoin USC v0.18.x.
/// @dev Check-Di only needs receipt status and logs. The canonical encoding is
///      abi.encode(uint8 txType, bytes[] chunks); receipt is chunk 2 for types 0-2
///      and chunk 3 for types 3-4. This intentionally avoids a broad transaction decoder.
library EvmV1ReceiptDecoder {
    struct LogEntry {
        address emitter;
        bytes32[] topics;
        bytes data;
    }

    struct ReceiptFields {
        uint8 status;
        uint64 gasUsed;
        LogEntry[] logs;
        bytes logsBloom;
    }

    error EmptyTransaction();
    error UnsupportedTransactionType(uint8 txType);
    error InvalidChunkCount(uint8 txType, uint256 chunkCount);

    function decodeReceipt(bytes memory encodedTransaction)
        internal
        pure
        returns (ReceiptFields memory receipt)
    {
        if (encodedTransaction.length == 0) revert EmptyTransaction();

        (uint8 txType, bytes[] memory chunks) = abi.decode(encodedTransaction, (uint8, bytes[]));
        if (txType > 4) revert UnsupportedTransactionType(txType);

        uint256 receiptIndex;
        if (txType <= 2) {
            if (chunks.length != 3) revert InvalidChunkCount(txType, chunks.length);
            receiptIndex = 2;
        } else {
            if (chunks.length != 4) revert InvalidChunkCount(txType, chunks.length);
            receiptIndex = 3;
        }

        (receipt.status, receipt.gasUsed, receipt.logs, receipt.logsBloom) = abi.decode(
            chunks[receiptIndex],
            (uint8, uint64, LogEntry[], bytes)
        );
    }
}
