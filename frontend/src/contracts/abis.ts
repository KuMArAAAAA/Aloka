export const ALOKA_ESCROW_ABI = [
  "function rewardToken() view returns (address)",
  "function isSchoolValidator(address validator) view returns (bool)",
  "function applications(uint256 applicationId) view returns (address student, bytes32 applicationHash, uint256 amount, uint8 status)",
  "function nextApplicationId() view returns (uint256)",
  "function totalFunded() view returns (uint256)",
  "function totalDistributed() view returns (uint256)",
  "function owner() view returns (address)",
  "function setSchoolValidator(address validator, bool allowed) external",
  "function fund(uint256 amount) external",
  "function submitApplication(bytes32 applicationHash) external returns (uint256 applicationId)",
  "function verifyApplication(uint256 applicationId, uint256 amount) external",
  "function rejectApplication(uint256 applicationId) external",
  "function distributeAid(uint256 applicationId) external",
  "event ValidatorUpdated(address indexed validator, bool allowed)",
  "event Funded(address indexed funder, uint256 amount)",
  "event ApplicationSubmitted(uint256 indexed applicationId, address indexed student, bytes32 applicationHash)",
  "event ApplicationVerified(uint256 indexed applicationId, address indexed validator)",
  "event ApplicationRejected(uint256 indexed applicationId, address indexed validator)",
  "event AidDistributed(uint256 indexed applicationId, address indexed student, uint256 amount)"
];

export const MOCK_IDR_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function mint(address to, uint256 amount) external",
  "function owner() view returns (address)",
  "function isMinter(address account) view returns (bool)"
];
