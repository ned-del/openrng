// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MerkleAnchor
 * @notice Immutable on-chain registry of OpenRNG Merkle batch roots.
 *         Each anchored root proves a batch of N tokens was generated
 *         via VDF+Merkle process before any token was consumed.
 *         Patent: Method and System for Gaming Random Number Generation
 */
contract MerkleAnchor {

    struct BatchRecord {
        bytes32 merkleRoot;
        uint256 blockNumber;
        uint256 timestamp;
        uint256 batchSize;
        string  clientId;
        bool    exists;
    }

    mapping(string => BatchRecord) private batches;
    address public immutable owner;
    uint256 public totalBatchesAnchored;
    uint256 public totalTokensAnchored;

    event BatchAnchored(
        string  indexed batchId,
        bytes32 merkleRoot,
        uint256 blockNumber,
        uint256 timestamp,
        string  clientId
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function anchorBatch(
        string  calldata batchId,
        bytes32 merkleRoot,
        uint256 batchSize,
        string  calldata clientId
    ) external onlyOwner returns (uint256) {
        require(!batches[batchId].exists, "Batch already anchored");
        require(merkleRoot != bytes32(0), "Invalid root");
        require(batchSize > 0, "Invalid batch size");

        batches[batchId] = BatchRecord({
            merkleRoot:  merkleRoot,
            blockNumber: block.number,
            timestamp:   block.timestamp,
            batchSize:   batchSize,
            clientId:    clientId,
            exists:      true
        });

        totalBatchesAnchored++;
        totalTokensAnchored += batchSize;

        emit BatchAnchored(batchId, merkleRoot, block.number, block.timestamp, clientId);
        return block.number;
    }

    function getBatchRoot(string calldata batchId)
        external view
        returns (bytes32 root, uint256 blockNumber, uint256 timestamp, uint256 batchSize)
    {
        BatchRecord storage r = batches[batchId];
        require(r.exists, "Batch not found");
        return (r.merkleRoot, r.blockNumber, r.timestamp, r.batchSize);
    }

    function batchExists(string calldata batchId) external view returns (bool) {
        return batches[batchId].exists;
    }

    function getStats() external view returns (uint256 totalBatches, uint256 totalTokens) {
        return (totalBatchesAnchored, totalTokensAnchored);
    }
}
