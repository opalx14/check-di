// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/// @title CheckDiSourceRegistry
/// @notice Emits canonical Check-Di product-journey facts on an Attestcoin-readable source chain.
/// @dev The contract stores only hashes/status. Raw documents and PII remain off-chain.
contract CheckDiSourceRegistry {
    enum LifecycleStatus {
        Unknown,
        Active,
        Revoked,
        Superseded
    }

    struct JourneyEvent {
        bytes32 batchIdHash;
        bytes32 previousEventHash;
        bytes32 organizationHash;
        address organization;
        uint64 sequenceNo;
        LifecycleStatus status;
        bool exists;
    }

    address public immutable admin;

    mapping(address => bool) public authorizedOrganizations;
    mapping(bytes32 => bytes32) public batchHead;
    mapping(bytes32 => uint64) public batchEventCount;
    mapping(bytes32 => JourneyEvent) public journeyEvents;

    event OrganizationAuthorizationChanged(address indexed organization, bool authorized);
    event JourneyEventCommitted(
        bytes32 indexed batchIdHash,
        bytes32 indexed eventHash,
        address indexed organization,
        bytes32 previousEventHash,
        bytes32 organizationHash,
        uint64 sequenceNo,
        uint8 lifecycleStatus
    );
    event JourneyEventStatusChanged(
        bytes32 indexed eventHash,
        address indexed changedBy,
        uint8 previousStatus,
        uint8 newStatus
    );

    error AdminOnly();
    error OrganizationNotAuthorized(address organization);
    error InvalidHash();
    error EventAlreadyExists(bytes32 eventHash);
    error PreviousHashMismatch(bytes32 expected, bytes32 received);
    error EventNotFound(bytes32 eventHash);
    error StatusActorNotAllowed(address actor);
    error InvalidStatusTransition(uint8 from, uint8 to);

    constructor() {
        admin = msg.sender;
        authorizedOrganizations[msg.sender] = true;
        emit OrganizationAuthorizationChanged(msg.sender, true);
    }

    modifier onlyAdmin() {
        if (msg.sender != admin) revert AdminOnly();
        _;
    }

    modifier onlyAuthorizedOrganization() {
        if (!authorizedOrganizations[msg.sender]) {
            revert OrganizationNotAuthorized(msg.sender);
        }
        _;
    }

    function setOrganizationAuthorization(address organization, bool authorized) external onlyAdmin {
        if (organization == address(0)) revert InvalidHash();
        authorizedOrganizations[organization] = authorized;
        emit OrganizationAuthorizationChanged(organization, authorized);
    }

    /// @notice Commit one finalized Check-Di event hash to the source chain.
    /// @param batchIdHash keccak256/bytes32 identifier used only as a stable batch key on EVM.
    /// @param eventHash Existing Check-Di canonical SHA-256 event hash represented as bytes32.
    /// @param previousEventHash Previous finalized Check-Di event hash; bytes32(0) for GENESIS.
    /// @param organizationHash Stable off-chain organization identifier hash, never raw PII.
    function commitJourneyEvent(
        bytes32 batchIdHash,
        bytes32 eventHash,
        bytes32 previousEventHash,
        bytes32 organizationHash
    ) external onlyAuthorizedOrganization returns (uint64 sequenceNo) {
        if (batchIdHash == bytes32(0) || eventHash == bytes32(0) || organizationHash == bytes32(0)) {
            revert InvalidHash();
        }
        if (journeyEvents[eventHash].exists) revert EventAlreadyExists(eventHash);

        bytes32 expectedPrevious = batchHead[batchIdHash];
        if (previousEventHash != expectedPrevious) {
            revert PreviousHashMismatch(expectedPrevious, previousEventHash);
        }

        sequenceNo = batchEventCount[batchIdHash] + 1;
        journeyEvents[eventHash] = JourneyEvent({
            batchIdHash: batchIdHash,
            previousEventHash: previousEventHash,
            organizationHash: organizationHash,
            organization: msg.sender,
            sequenceNo: sequenceNo,
            status: LifecycleStatus.Active,
            exists: true
        });
        batchHead[batchIdHash] = eventHash;
        batchEventCount[batchIdHash] = sequenceNo;

        emit JourneyEventCommitted(
            batchIdHash,
            eventHash,
            msg.sender,
            previousEventHash,
            organizationHash,
            sequenceNo,
            uint8(LifecycleStatus.Active)
        );
    }

    /// @notice Mirror Check-Di's terminal lifecycle transitions without deleting history.
    function setJourneyEventStatus(bytes32 eventHash, LifecycleStatus newStatus) external {
        JourneyEvent storage item = journeyEvents[eventHash];
        if (!item.exists) revert EventNotFound(eventHash);
        if (msg.sender != item.organization && msg.sender != admin) {
            revert StatusActorNotAllowed(msg.sender);
        }
        if (
            item.status != LifecycleStatus.Active
                || (newStatus != LifecycleStatus.Revoked && newStatus != LifecycleStatus.Superseded)
        ) {
            revert InvalidStatusTransition(uint8(item.status), uint8(newStatus));
        }

        LifecycleStatus previous = item.status;
        item.status = newStatus;
        emit JourneyEventStatusChanged(eventHash, msg.sender, uint8(previous), uint8(newStatus));
    }
}
