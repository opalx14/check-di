// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {INativeQueryVerifier} from "./INativeQueryVerifier.sol";
import {EvmV1ReceiptDecoder} from "./EvmV1ReceiptDecoder.sol";

/// @title CheckDiAttestedRegistry
/// @notice Creditcoin CC3 registry that accepts Check-Di journey events only after Attestcoin
///         verifies the source-chain transaction and receipt containing them.
contract CheckDiAttestedRegistry {
    uint8 private constant STATUS_ACTIVE = 1;
    uint8 private constant STATUS_REVOKED = 2;
    uint8 private constant STATUS_SUPERSEDED = 3;

    address public constant NATIVE_VERIFIER_ADDRESS =
        0x0000000000000000000000000000000000000FD2;

    bytes32 public constant JOURNEY_COMMITTED_SIGNATURE = keccak256(
        "JourneyEventCommitted(bytes32,bytes32,address,bytes32,bytes32,uint64,uint8)"
    );
    bytes32 public constant JOURNEY_STATUS_SIGNATURE =
        keccak256("JourneyEventStatusChanged(bytes32,address,uint8,uint8)");

    INativeQueryVerifier public immutable verifier;
    uint64 public immutable sourceChainKey;
    address public immutable sourceContract;

    struct AttestedJourneyEvent {
        bytes32 batchIdHash;
        bytes32 previousEventHash;
        bytes32 organizationHash;
        address organization;
        bytes32 queryId;
        uint64 sourceBlockHeight;
        uint64 sourceTxIndex;
        uint64 sequenceNo;
        uint64 verifiedAt;
        uint8 status;
        bool exists;
    }

    struct JourneyPayload {
        bytes32 batchIdHash;
        bytes32 eventHash;
        bytes32 previousEventHash;
        bytes32 organizationHash;
        address organization;
        uint64 sequenceNo;
        uint8 lifecycleStatus;
    }

    struct StatusPayload {
        bytes32 eventHash;
        address changedBy;
        uint8 previousStatus;
        uint8 newStatus;
    }

    struct ProofInput {
        uint64 blockHeight;
        bytes encodedTransaction;
        bytes32 merkleRoot;
        INativeQueryVerifier.MerkleProofEntry[] siblings;
        bytes32 lowerEndpointDigest;
        bytes32[] continuityRoots;
    }

    mapping(bytes32 => bool) public processedQueries;
    mapping(bytes32 => AttestedJourneyEvent) public journeyEvents;
    mapping(bytes32 => bytes32) public batchHead;
    mapping(bytes32 => uint64) public batchEventCount;

    event JourneyEventAttested(
        bytes32 indexed batchIdHash,
        bytes32 indexed eventHash,
        address indexed organization,
        bytes32 queryId,
        uint64 sourceBlockHeight,
        uint64 sourceTxIndex,
        uint64 sequenceNo
    );
    event JourneyEventStatusAttested(
        bytes32 indexed eventHash,
        uint8 previousStatus,
        uint8 newStatus,
        bytes32 indexed queryId,
        uint64 sourceBlockHeight,
        uint64 sourceTxIndex
    );

    error InvalidSourceContract();
    error QueryAlreadyProcessed(bytes32 queryId);
    error ProofVerificationFailed();
    error SourceTransactionFailed();
    error ExpectedOneSourceEvent(uint256 matches);
    error InvalidSourceEvent();
    error EventAlreadyAttested(bytes32 eventHash);
    error PreviousHashMismatch(bytes32 expected, bytes32 received);
    error SequenceMismatch(uint64 expected, uint64 received);
    error EventNotAttested(bytes32 eventHash);
    error StatusMismatch(uint8 expected, uint8 received);
    error InvalidStatusTransition(uint8 from, uint8 to);

    constructor(uint64 sourceChainKey_, address sourceContract_) {
        if (sourceChainKey_ == 0 || sourceContract_ == address(0)) revert InvalidSourceContract();
        sourceChainKey = sourceChainKey_;
        sourceContract = sourceContract_;
        verifier = INativeQueryVerifier(NATIVE_VERIFIER_ADDRESS);
    }

    function executeJourneyProof(ProofInput calldata proof) external returns (bytes32 eventHash) {
        (
            EvmV1ReceiptDecoder.ReceiptFields memory receipt,
            bytes32 queryId,
            uint64 txIndex
        ) = _verifySourceTransaction(proof);

        eventHash = _applyJourneyReceipt(receipt, queryId, proof.blockHeight, txIndex);
    }

    function executeStatusProof(ProofInput calldata proof) external returns (bytes32 eventHash) {
        (
            EvmV1ReceiptDecoder.ReceiptFields memory receipt,
            bytes32 queryId,
            uint64 txIndex
        ) = _verifySourceTransaction(proof);

        eventHash = _applyStatusReceipt(receipt, queryId, proof.blockHeight, txIndex);
    }

    function _applyJourneyReceipt(
        EvmV1ReceiptDecoder.ReceiptFields memory receipt,
        bytes32 queryId,
        uint64 blockHeight,
        uint64 txIndex
    ) internal returns (bytes32 eventHash) {
        JourneyPayload memory payload = _decodeJourneyPayload(receipt);
        eventHash = payload.eventHash;

        if (
            payload.batchIdHash == bytes32(0) || payload.eventHash == bytes32(0)
                || payload.organization == address(0) || payload.organizationHash == bytes32(0)
                || payload.lifecycleStatus != STATUS_ACTIVE
        ) {
            revert InvalidSourceEvent();
        }
        if (journeyEvents[payload.eventHash].exists) {
            revert EventAlreadyAttested(payload.eventHash);
        }

        bytes32 expectedPrevious = batchHead[payload.batchIdHash];
        if (payload.previousEventHash != expectedPrevious) {
            revert PreviousHashMismatch(expectedPrevious, payload.previousEventHash);
        }

        uint64 expectedSequence = batchEventCount[payload.batchIdHash] + 1;
        if (payload.sequenceNo != expectedSequence) {
            revert SequenceMismatch(expectedSequence, payload.sequenceNo);
        }

        processedQueries[queryId] = true;
        journeyEvents[payload.eventHash] = AttestedJourneyEvent({
            batchIdHash: payload.batchIdHash,
            previousEventHash: payload.previousEventHash,
            organizationHash: payload.organizationHash,
            organization: payload.organization,
            queryId: queryId,
            sourceBlockHeight: blockHeight,
            sourceTxIndex: txIndex,
            sequenceNo: payload.sequenceNo,
            verifiedAt: uint64(block.timestamp),
            status: STATUS_ACTIVE,
            exists: true
        });
        batchHead[payload.batchIdHash] = payload.eventHash;
        batchEventCount[payload.batchIdHash] = payload.sequenceNo;

        emit JourneyEventAttested(
            payload.batchIdHash,
            payload.eventHash,
            payload.organization,
            queryId,
            blockHeight,
            txIndex,
            payload.sequenceNo
        );
    }

    function _applyStatusReceipt(
        EvmV1ReceiptDecoder.ReceiptFields memory receipt,
        bytes32 queryId,
        uint64 blockHeight,
        uint64 txIndex
    ) internal returns (bytes32 eventHash) {
        StatusPayload memory payload = _decodeStatusPayload(receipt);
        eventHash = payload.eventHash;

        AttestedJourneyEvent storage item = journeyEvents[payload.eventHash];
        if (!item.exists) revert EventNotAttested(payload.eventHash);
        if (payload.changedBy == address(0)) revert InvalidSourceEvent();
        if (item.status != payload.previousStatus) {
            revert StatusMismatch(item.status, payload.previousStatus);
        }
        if (
            payload.previousStatus != STATUS_ACTIVE
                || (payload.newStatus != STATUS_REVOKED && payload.newStatus != STATUS_SUPERSEDED)
        ) {
            revert InvalidStatusTransition(payload.previousStatus, payload.newStatus);
        }

        processedQueries[queryId] = true;
        item.status = payload.newStatus;

        emit JourneyEventStatusAttested(
            payload.eventHash,
            payload.previousStatus,
            payload.newStatus,
            queryId,
            blockHeight,
            txIndex
        );
    }

    function _decodeJourneyPayload(EvmV1ReceiptDecoder.ReceiptFields memory receipt)
        internal
        view
        returns (JourneyPayload memory payload)
    {
        EvmV1ReceiptDecoder.LogEntry memory sourceLog =
            _findSingleLog(receipt, JOURNEY_COMMITTED_SIGNATURE, 4);

        payload.batchIdHash = sourceLog.topics[1];
        payload.eventHash = sourceLog.topics[2];
        payload.organization = address(uint160(uint256(sourceLog.topics[3])));
        (
            payload.previousEventHash,
            payload.organizationHash,
            payload.sequenceNo,
            payload.lifecycleStatus
        ) = abi.decode(sourceLog.data, (bytes32, bytes32, uint64, uint8));
    }

    function _decodeStatusPayload(EvmV1ReceiptDecoder.ReceiptFields memory receipt)
        internal
        view
        returns (StatusPayload memory payload)
    {
        EvmV1ReceiptDecoder.LogEntry memory sourceLog =
            _findSingleLog(receipt, JOURNEY_STATUS_SIGNATURE, 3);

        payload.eventHash = sourceLog.topics[1];
        payload.changedBy = address(uint160(uint256(sourceLog.topics[2])));
        (payload.previousStatus, payload.newStatus) = abi.decode(sourceLog.data, (uint8, uint8));
    }

    function _findSingleLog(
        EvmV1ReceiptDecoder.ReceiptFields memory receipt,
        bytes32 signature,
        uint256 topicCount
    ) internal view returns (EvmV1ReceiptDecoder.LogEntry memory sourceLog) {
        uint256 matches;
        for (uint256 i = 0; i < receipt.logs.length; i++) {
            EvmV1ReceiptDecoder.LogEntry memory candidate = receipt.logs[i];
            if (
                candidate.emitter == sourceContract && candidate.topics.length == topicCount
                    && candidate.topics[0] == signature
            ) {
                sourceLog = candidate;
                matches++;
            }
        }
        if (matches != 1) revert ExpectedOneSourceEvent(matches);
    }

    function _verifySourceTransaction(ProofInput calldata proof)
        internal
        returns (EvmV1ReceiptDecoder.ReceiptFields memory receipt, bytes32 queryId, uint64 txIndex)
    {
        INativeQueryVerifier.MerkleProof memory merkleProof = INativeQueryVerifier.MerkleProof({
            root: proof.merkleRoot,
            siblings: proof.siblings
        });
        INativeQueryVerifier.ContinuityProof memory continuityProof = INativeQueryVerifier.ContinuityProof({
            lowerEndpointDigest: proof.lowerEndpointDigest,
            roots: proof.continuityRoots
        });

        txIndex = verifier.calculateTxIndex(merkleProof);
        queryId = _computeQueryId(proof.blockHeight, txIndex);
        if (processedQueries[queryId]) revert QueryAlreadyProcessed(queryId);

        bool verified = verifier.verifyAndEmit(
            sourceChainKey,
            proof.blockHeight,
            proof.encodedTransaction,
            merkleProof,
            continuityProof
        );
        if (!verified) revert ProofVerificationFailed();

        receipt = EvmV1ReceiptDecoder.decodeReceipt(proof.encodedTransaction);
        if (receipt.status != 1) revert SourceTransactionFailed();
    }

    /// @dev Mirrors the query-id packing used by the official USC example base contract:
    ///      chainKey (32 bytes) || blockHeight (8 bytes) || txIndex (32 bytes).
    function _computeQueryId(uint64 blockHeight, uint64 txIndex) internal view returns (bytes32 queryId) {
        uint64 chainKey = sourceChainKey;
        assembly {
            let ptr := mload(0x40)
            mstore(ptr, chainKey)
            mstore(add(ptr, 32), shl(192, blockHeight))
            mstore(add(ptr, 40), txIndex)
            queryId := keccak256(ptr, 72)
        }
    }
}
