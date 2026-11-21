// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {MockIDR} from "../src/MockIDR.sol";
import {AlokaEscrow} from "../src/AlokaEscrow.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract AlokaEscrowTest is Test {
    MockIDR token;
    AlokaEscrow escrow;

    address student = address(0xA11CE);
    address school = address(0x5C001);
    address random = address(0xBEEF);

    uint256 constant INITIAL_SUPPLY = 1_000_000;
    uint256 constant FUND_AMOUNT = 10_000;
    uint256 constant AID_AMOUNT = 1_500;

    uint256 applicationId;
    bytes32 applicationHash;

    function setUp() public {
        token = new MockIDR(INITIAL_SUPPLY, address(this));
        escrow = new AlokaEscrow(token, address(this));

        escrow.setSchoolValidator(school, true);

        token.approve(address(escrow), FUND_AMOUNT);
        escrow.fund(FUND_AMOUNT);

        applicationHash = keccak256("data-pengajuan-siswa-001");

        vm.prank(student);
        applicationId = escrow.submitApplication(applicationHash);
    }

    // =====================================================
    // SUCCESS TESTS
    // =====================================================

    function test_Constructor_SetSemuaField() public view {
        assertEq(address(escrow.rewardToken()), address(token));
        assertEq(escrow.owner(), address(this));
        assertTrue(escrow.isSchoolValidator(school));
        assertEq(escrow.totalFunded(), FUND_AMOUNT);
        assertEq(escrow.totalDistributed(), 0);
    }

    function test_Fund_MengunciDana() public view {
        assertEq(token.balanceOf(address(escrow)), FUND_AMOUNT);
        assertEq(token.balanceOf(address(this)), INITIAL_SUPPLY - FUND_AMOUNT);
    }

    function test_Apply_MencatatPengajuan() public view {
        (address savedStudent, bytes32 savedHash, uint256 amount, AlokaEscrow.Status status) =
            escrow.applications(applicationId);

        assertEq(savedStudent, student);
        assertEq(savedHash, applicationHash);
        assertEq(amount, 0);
        assertEq(uint256(status), uint256(AlokaEscrow.Status.MenungguVerifikasi));
    }

    function test_VerifyApplication_MengubahStatus() public {
        vm.prank(school);
        escrow.verifyApplication(applicationId, AID_AMOUNT);

        (,, uint256 amount, AlokaEscrow.Status status) = escrow.applications(applicationId);

        assertEq(amount, AID_AMOUNT);
        assertEq(uint256(status), uint256(AlokaEscrow.Status.Terverifikasi));
    }

    function test_DistributeAid_MengirimDanaKeSiswa() public {
        vm.prank(school);
        escrow.verifyApplication(applicationId, AID_AMOUNT);

        escrow.distributeAid(applicationId);

        assertEq(token.balanceOf(student), AID_AMOUNT);
        assertEq(token.balanceOf(address(escrow)), FUND_AMOUNT - AID_AMOUNT);
        assertEq(escrow.totalDistributed(), AID_AMOUNT);

        (,,, AlokaEscrow.Status status) = escrow.applications(applicationId);

        assertEq(uint256(status), uint256(AlokaEscrow.Status.Tersalurkan));
    }

    function test_RejectApplication_MenolakPengajuan() public {
        vm.prank(school);
        escrow.rejectApplication(applicationId);

        (,,, AlokaEscrow.Status status) = escrow.applications(applicationId);

        assertEq(uint256(status), uint256(AlokaEscrow.Status.Ditolak));
        assertEq(token.balanceOf(student), 0);
    }

    function test_SetSchoolValidator_MenonaktifkanPetugas() public {
        escrow.setSchoolValidator(school, false);

        assertFalse(escrow.isSchoolValidator(school));
    }

    function test_SetSchoolValidator_MengaktifkanPetugas() public {
        escrow.setSchoolValidator(random, true);

        assertTrue(escrow.isSchoolValidator(random));
    }

    // =====================================================
    // ACCESS CONTROL TESTS
    // =====================================================

    function test_Revert_RandomTidakBisaVerifikasi() public {
        vm.prank(random);
        vm.expectRevert(AlokaEscrow.NotSchoolValidator.selector);
        escrow.verifyApplication(applicationId, AID_AMOUNT);
    }

    function test_Revert_RandomTidakBisaMenolak() public {
        vm.prank(random);
        vm.expectRevert(AlokaEscrow.NotSchoolValidator.selector);
        escrow.rejectApplication(applicationId);
    }

    function test_Revert_RandomTidakBisaDistribusi() public {
        vm.prank(school);
        escrow.verifyApplication(applicationId, AID_AMOUNT);

        vm.prank(random);
        vm.expectRevert();
        escrow.distributeAid(applicationId);
    }

    function test_Revert_RandomTidakBisaMenambahValidator() public {
        vm.prank(random);
        vm.expectRevert();
        escrow.setSchoolValidator(random, true);
    }

    // =====================================================
    // VALIDATION TESTS
    // =====================================================

    function test_Revert_FundJumlahNol() public {
        vm.expectRevert(AlokaEscrow.ZeroAmount.selector);
        escrow.fund(0);
    }

    function test_Revert_SetValidatorAlamatNol() public {
        vm.expectRevert(AlokaEscrow.ZeroAddress.selector);
        escrow.setSchoolValidator(address(0), true);
    }

    function test_Revert_PengajuanHashKosong() public {
        vm.prank(random);
        vm.expectRevert(AlokaEscrow.InvalidApplication.selector);
        escrow.submitApplication(bytes32(0));
    }

    function test_Revert_VerifikasiJumlahNol() public {
        vm.prank(school);
        vm.expectRevert(AlokaEscrow.ZeroAmount.selector);
        escrow.verifyApplication(applicationId, 0);
    }

    function test_Revert_VerifikasiPengajuanTidakDitemukan() public {
        vm.prank(school);
        vm.expectRevert(AlokaEscrow.InvalidApplication.selector);
        escrow.verifyApplication(999, AID_AMOUNT);
    }

    function test_Revert_TolakPengajuanTidakDitemukan() public {
        vm.prank(school);
        vm.expectRevert(AlokaEscrow.InvalidApplication.selector);
        escrow.rejectApplication(999);
    }

    // =====================================================
    // APPLICATION STATUS TESTS
    // =====================================================

    function test_Revert_VerifikasiDuaKali() public {
        vm.startPrank(school);

        escrow.verifyApplication(applicationId, AID_AMOUNT);

        vm.expectRevert(abi.encodeWithSelector(AlokaEscrow.WrongStatus.selector, AlokaEscrow.Status.Terverifikasi));

        escrow.verifyApplication(applicationId, AID_AMOUNT);
        vm.stopPrank();
    }

    function test_Revert_VerifikasiPengajuanDitolak() public {
        vm.prank(school);
        escrow.rejectApplication(applicationId);

        vm.prank(school);
        vm.expectRevert(abi.encodeWithSelector(AlokaEscrow.WrongStatus.selector, AlokaEscrow.Status.Ditolak));
        escrow.verifyApplication(applicationId, AID_AMOUNT);
    }

    function test_Revert_TolakPengajuanSudahTerverifikasi() public {
        vm.prank(school);
        escrow.verifyApplication(applicationId, AID_AMOUNT);

        vm.prank(school);
        vm.expectRevert(abi.encodeWithSelector(AlokaEscrow.WrongStatus.selector, AlokaEscrow.Status.Terverifikasi));
        escrow.rejectApplication(applicationId);
    }

    function test_Revert_DistribusiSebelumVerifikasi() public {
        vm.expectRevert(abi.encodeWithSelector(AlokaEscrow.WrongStatus.selector, AlokaEscrow.Status.MenungguVerifikasi));
        escrow.distributeAid(applicationId);
    }

    function test_Revert_DistribusiDuaKali() public {
        vm.prank(school);
        escrow.verifyApplication(applicationId, AID_AMOUNT);

        escrow.distributeAid(applicationId);

        vm.expectRevert(abi.encodeWithSelector(AlokaEscrow.WrongStatus.selector, AlokaEscrow.Status.Tersalurkan));
        escrow.distributeAid(applicationId);
    }

    function test_Revert_PengajuanDitolakTidakBisaDistribusi() public {
        vm.prank(school);
        escrow.rejectApplication(applicationId);

        vm.expectRevert(abi.encodeWithSelector(AlokaEscrow.WrongStatus.selector, AlokaEscrow.Status.Ditolak));
        escrow.distributeAid(applicationId);
    }

    function test_Revert_AplikasiTidakDitemukanSaatDistribusi() public {
        vm.expectRevert(AlokaEscrow.InvalidApplication.selector);
        escrow.distributeAid(999);
    }

    // =====================================================
    // ESCROW BALANCE TESTS
    // =====================================================

    function test_Revert_DistribusiSaldoTidakCukup() public {
        vm.prank(student);
        uint256 id = escrow.submitApplication(keccak256("pengajuan-saldo-kurang"));

        uint256 jumlahBantuan = token.balanceOf(address(escrow)) + 1;

        vm.prank(school);
        escrow.verifyApplication(id, jumlahBantuan);

        vm.expectRevert(AlokaEscrow.InsufficientEscrowBalance.selector);
        escrow.distributeAid(id);
    }

    // =====================================================
    // CONSTRUCTOR TESTS
    // =====================================================

    function test_Revert_ConstructorTokenNol() public {
        vm.expectRevert(AlokaEscrow.ZeroAddress.selector);

        new AlokaEscrow(IERC20(address(0)), address(this));
    }

    function test_Revert_ConstructorOwnerNol() public {
        vm.expectRevert(AlokaEscrow.ZeroAddress.selector);

        new AlokaEscrow(IERC20(address(token)), address(0));
    }
}
