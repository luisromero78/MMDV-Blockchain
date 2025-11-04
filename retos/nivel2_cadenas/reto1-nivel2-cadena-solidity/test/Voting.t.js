const { expect } = require("chai");

describe("Voting", function () {
  it("deploys and allows one vote", async function () {
    const [owner, voter] = await ethers.getSigners();

    const Voting = await ethers.getContractFactory("Voting");
    const voting = await Voting.connect(owner).deploy(["Alice", "Bob"]);
    await voting.waitForDeployment();            // <-- v6

    await voting.connect(voter).vote(0);

    const [, votes] = await voting.getCandidate(0);
    expect(Number(votes)).to.equal(1);           // cast por si viene BigInt
  });
});

