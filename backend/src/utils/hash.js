// src/utils/hash.js
import { ethers } from "ethers";

/**
 * Menghitung applicationHash konsisten dengan Solidity:
 * keccak256(abi.encodePacked(nisn, schoolId, academicYear))
 */
export const generateApplicationHash = (nisn, schoolId, academicYear) => {
  return ethers.solidityPackedKeccak256(
    ["string", "string", "string"],
    [nisn, schoolId, academicYear]
  );
};
