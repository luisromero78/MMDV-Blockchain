// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

/// @title Voting - Reto 1 (Nivel 2): ejecución determinista y lógica programable
/// @notice Votación simple con registro on-chain y protección 1 persona = 1 voto
contract Voting {
    struct Candidate {
        string name;
        uint256 votes;
    }

    address public owner;
    bool public votingOpen;
    Candidate[] public candidates;
    mapping(address => bool) public hasVoted;

    event CandidateAdded(uint256 indexed id, string name);
    event VoteCast(address indexed voter, uint256 indexed candidateId);
    event VotingOpened();
    event VotingClosed();

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo owner");
        _;
    }

    modifier whenOpen() {
        require(votingOpen, "Votacion cerrada");
        _;
    }

    constructor(string[] memory _names) {
        owner = msg.sender;
        for (uint i = 0; i < _names.length; i++) {
            candidates.push(Candidate({name: _names[i], votes: 0}));
            emit CandidateAdded(i, _names[i]);
        }
        votingOpen = true;
        emit VotingOpened();
    }

    function candidatesCount() external view returns (uint256) {
        return candidates.length;
    }

    function getCandidate(uint256 id) external view returns (string memory name, uint256 votes) {
        require(id < candidates.length, "ID invalido");
        Candidate storage c = candidates[id];
        return (c.name, c.votes);
    }

    function vote(uint256 candidateId) external whenOpen {
        require(!hasVoted[msg.sender], "Ya has votado");
        require(candidateId < candidates.length, "ID invalido");
        hasVoted[msg.sender] = true;
        candidates[candidateId].votes += 1;
        emit VoteCast(msg.sender, candidateId);
    }

    function closeVoting() external onlyOwner whenOpen {
        votingOpen = false;
        emit VotingClosed();
    }

    /// @dev helper puro para ilustrar gas/evm con function pure/view
    function addPure(uint256 a, uint256 b) external pure returns (uint256) {
        return a + b;
    }
}
