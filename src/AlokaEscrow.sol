// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title AlokaEscrow
/// @notice MVP escrow untuk simulasi distribusi bantuan pendidikan Aloka.
contract AlokaEscrow is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Status {
        BelumAda,
        MenungguVerifikasi,
        Terverifikasi,
        Ditolak,
        Tersalurkan
    }

    IERC20 public immutable rewardToken;

    mapping(address => bool) public isSchoolValidator;

    struct Application {
        address beneficiary;
        bytes32 applicationHash;
        uint256 amount;
        Status status;
    }

    mapping(uint256 => Application) public applications;
    uint256 public nextApplicationId = 1;

    uint256 public totalFunded;
    uint256 public totalDistributed;

    event ValidatorUpdated(address indexed validator, bool allowed);
    event Funded(address indexed funder, uint256 amount);

    event ApplicationSubmitted(uint256 indexed applicationId, address indexed submitter, address indexed beneficiary, bytes32 applicationHash);
    event ApplicationVerified(uint256 indexed applicationId, address indexed validator);
    event ApplicationRejected(uint256 indexed applicationId, address indexed validator);
    event AidDistributed(uint256 indexed applicationId, address indexed beneficiary, uint256 amount);
    event BeneficiaryUpdated(uint256 indexed applicationId, address indexed newBeneficiary);

    error ZeroAddress();
    error ZeroAmount();
    error NotSchoolValidator();
    error InvalidApplication();
    error WrongStatus(Status currentStatus);
    error InsufficientEscrowBalance();

    modifier onlySchoolValidator() {
        if (!isSchoolValidator[msg.sender]) {
            revert NotSchoolValidator();
        }
        _;
    }

    constructor(IERC20 _rewardToken, address initialOwner)
        Ownable(initialOwner == address(0) ? address(this) : initialOwner)
    {
        if (address(_rewardToken) == address(0)) revert ZeroAddress();
        if (initialOwner == address(0)) revert ZeroAddress();

        rewardToken = _rewardToken;
    }

    function setSchoolValidator(address validator, bool allowed) external onlyOwner {
        if (validator == address(0)) revert ZeroAddress();

        isSchoolValidator[validator] = allowed;
        emit ValidatorUpdated(validator, allowed);
    }

    function fund(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();

        rewardToken.safeTransferFrom(msg.sender, address(this), amount);

        totalFunded += amount;
        emit Funded(msg.sender, amount);
    }

    function submitApplication(bytes32 applicationHash, address beneficiary) public returns (uint256 applicationId) {
        if (applicationHash == bytes32(0)) {
            revert InvalidApplication();
        }
        if (beneficiary == address(0)) {
            revert ZeroAddress();
        }

        applicationId = nextApplicationId++;

        applications[applicationId] = Application({
            beneficiary: beneficiary,
            applicationHash: applicationHash,
            amount: 0,
            status: Status.MenungguVerifikasi
        });

        emit ApplicationSubmitted(applicationId, msg.sender, beneficiary, applicationHash);
    }

    function submitApplication(bytes32 applicationHash) external returns (uint256 applicationId) {
        return submitApplication(applicationHash, msg.sender);
    }

    function updateBeneficiary(uint256 applicationId, address newBeneficiary) external onlyOwner {
        if (newBeneficiary == address(0)) revert ZeroAddress();
        Application storage app = applications[applicationId];
        if (app.beneficiary == address(0)) revert InvalidApplication();
        if (app.status == Status.Tersalurkan) revert WrongStatus(app.status);

        app.beneficiary = newBeneficiary;
        emit BeneficiaryUpdated(applicationId, newBeneficiary);
    }

    function verifyApplication(uint256 applicationId, uint256 amount) external onlySchoolValidator {
        Application storage app = applications[applicationId];

        if (app.beneficiary == address(0)) {
            revert InvalidApplication();
        }

        if (app.status != Status.MenungguVerifikasi) {
            revert WrongStatus(app.status);
        }

        if (amount == 0) revert ZeroAmount();

        app.amount = amount;
        app.status = Status.Terverifikasi;

        emit ApplicationVerified(applicationId, msg.sender);
    }

    function rejectApplication(uint256 applicationId) external onlySchoolValidator {
        Application storage app = applications[applicationId];

        if (app.beneficiary == address(0)) {
            revert InvalidApplication();
        }

        if (app.status != Status.MenungguVerifikasi) {
            revert WrongStatus(app.status);
        }

        app.status = Status.Ditolak;
        emit ApplicationRejected(applicationId, msg.sender);
    }

    function distributeAid(uint256 applicationId) external onlyOwner nonReentrant {
        Application storage app = applications[applicationId];

        if (app.beneficiary == address(0)) {
            revert InvalidApplication();
        }

        if (app.status != Status.Terverifikasi) {
            revert WrongStatus(app.status);
        }

        uint256 amount = app.amount;

        if (rewardToken.balanceOf(address(this)) < amount) {
            revert InsufficientEscrowBalance();
        }

        app.status = Status.Tersalurkan;
        totalDistributed += amount;

        rewardToken.safeTransfer(app.beneficiary, amount);

        emit AidDistributed(applicationId, app.beneficiary, amount);
    }
}
