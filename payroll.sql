/* Chọn cơ sở dữ liệu để làm việc */
USE payroll;

/* Tắt kiểm tra khóa ngoại để có thể xóa và tạo lại bảng */
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

/* -- 1. FIX LỖI 1050: Xóa các bảng nếu chúng đã tồn tại trước khi tạo mới
-- Phải xóa theo thứ tự: bảng con (có khóa ngoại) trước, bảng cha sau.
*/
DROP TABLE IF EXISTS `attendance`;
DROP TABLE IF EXISTS `salaries`;
DROP TABLE IF EXISTS `employees`;
DROP TABLE IF EXISTS `positions`;
DROP TABLE IF EXISTS `departments`;

/* -- 2. Tạo lại cấu trúc các bảng -- */
CREATE TABLE `departments` (
  `DepartmentID` int NOT NULL,
  `DepartmentName` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  PRIMARY KEY (`DepartmentID`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

CREATE TABLE `positions` (
  `PositionID` int NOT NULL,
  `PositionName` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  PRIMARY KEY (`PositionID`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

CREATE TABLE `employees` (
  `EmployeeID` int NOT NULL,
  `FullName` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `DepartmentID` int NULL DEFAULT NULL,
  `PositionID` int NULL DEFAULT NULL,
  `Status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  PRIMARY KEY (`EmployeeID`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

CREATE TABLE `attendance` (
  `AttendanceID` int NOT NULL AUTO_INCREMENT,
  `EmployeeID` int NULL DEFAULT NULL,
  `WorkDays` int NOT NULL,
  `AbsentDays` int NULL DEFAULT 0,
  `LeaveDays` int NULL DEFAULT 0,
  `AttendanceMonth` date NOT NULL,
  `CreatedAt` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`AttendanceID`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

CREATE TABLE `salaries` (
  `SalaryID` int NOT NULL AUTO_INCREMENT,
  `EmployeeID` int NULL DEFAULT NULL,
  `SalaryMonth` date NOT NULL,
  `BaseSalary` decimal(12, 2) NOT NULL,
  `Bonus` decimal(12, 2) NULL DEFAULT 0.00,
  `Deductions` decimal(12, 2) NULL DEFAULT 0.00,
  `NetSalary` decimal(12, 2) NOT NULL,
  `CreatedAt` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`SalaryID`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic;

/* -- 3. Thêm các ràng buộc khóa ngoại -- */
ALTER TABLE `attendance` ADD CONSTRAINT `fk_attendance_employees_1` FOREIGN KEY (`EmployeeID`) REFERENCES `employees` (`EmployeeID`);
ALTER TABLE `employees` ADD CONSTRAINT `fk_employees_departments_1` FOREIGN KEY (`DepartmentID`) REFERENCES `departments` (`DepartmentID`);
ALTER TABLE `employees` ADD CONSTRAINT `fk_employees_positions_1` FOREIGN KEY (`PositionID`) REFERENCES `positions` (`PositionID`);
ALTER TABLE `salaries` ADD FOREIGN KEY (`EmployeeID`) REFERENCES `employees` (`EmployeeID`);


/* -- 4. Chèn dữ liệu
-- FIX LỖI TÊN BẢNG: Đã bỏ hậu tố "_payroll" để khớp với tên bảng đã tạo
*/

-- BẢNG DEPARTMENTS
INSERT INTO `departments` (DepartmentID, DepartmentName)
VALUES
(1, 'Phòng Nhân sự'),
(2, 'Phòng Kế toán'),
(3, 'Phòng Kỹ thuật'),
(4, 'Phòng Kinh doanh'),
(5, 'Phòng Hành chính'),
(6, 'Phòng Marketing'),
(7, 'Phòng Sản xuất'),
(8, 'Phòng Bảo trì'),
(9, 'Phòng Nghiên cứu & Phát triển'),
(10, 'Phòng Dịch vụ khách hàng');

-- BẢNG POSITIONS
INSERT INTO `positions` (PositionID, PositionName)
VALUES
(1, 'Nhân viên'),
(2, 'Trưởng nhóm'),
(3, 'Phó phòng'),
(4, 'Trưởng phòng'),
(5, 'Giám đốc'),
(6, 'Thư ký'),
(7, 'Kỹ sư'),
(8, 'Nhân viên thử việc'),
(9, 'Thực tập sinh'),
(10, 'Cố vấn kỹ thuật');

-- BẢNG EMPLOYEES
INSERT INTO `employees` (EmployeeID, FullName, DepartmentID, PositionID, Status)
VALUES
(1, 'Nguyễn Văn An', 1, 1, 'Đang làm việc'),
(2, 'Lê Thị Bình', 2, 3, 'Đang làm việc'),
(3, 'Trần Quốc Cường', 3, 7, 'Đang làm việc'),
(4, 'Phạm Hồng Dung', 4, 2, 'Đang làm việc'),
(5, 'Võ Thành Đạt', 5, 4, 'Nghỉ phép'),
(6, 'Đặng Minh Hạnh', 6, 1, 'Đang làm việc'),
(7, 'Lưu Trung Hiếu', 7, 5, 'Đang làm việc'),
(8, 'Ngô Thu Lan', 8, 8, 'Thử việc'),
(9, 'Bùi Văn Minh', 9, 9, 'Thực tập'),
(10, 'Hoàng Thị Oanh', 10, 6, 'Đang làm việc');

-- BẢNG ATTENDANCE (Tên bảng đã đúng)
INSERT INTO `attendance` (EmployeeID, WorkDays, AbsentDays, LeaveDays, AttendanceMonth)
VALUES
(1, 22, 1, 0, '2024-09-01'),
(2, 21, 0, 1, '2024-09-01'),
(3, 23, 0, 0, '2024-09-01'),
(4, 22, 2, 0, '2024-09-01'),
(5, 18, 3, 2, '2024-09-01'),
(6, 24, 0, 0, '2024-09-01'),
(7, 20, 1, 1, '2024-09-01'),
(8, 19, 2, 0, '2024-09-01'),
(9, 16, 0, 2, '2024-09-01'),
(10, 22, 1, 0, '2024-09-01');

-- BẢNG SALARIES (Tên bảng đã đúng)
INSERT INTO `salaries` (EmployeeID, SalaryMonth, BaseSalary, Bonus, Deductions, NetSalary)
VALUES
(1, '2024-09-01', 12000000, 500000, 200000, 12300000),
(2, '2024-09-01', 10000000, 800000, 100000, 10700000),
(3, '2024-09-01', 15000000, 600000, 0, 15600000),
(4, '2024-09-01', 11000000, 400000, 100000, 11300000),
(5, '2024-09-01', 9000000, 0, 300000, 8700000),
(6, '2024-09-01', 9500000, 500000, 0, 10000000),
(7, '2024-09-01', 18000000, 1000000, 0, 19000000),
(8, '2024-09-01', 7000000, 200000, 0, 7200000),
(9, '2024-09-01', 5000000, 0, 0, 5000000),
(10, '2024-09-01', 8500000, 300000, 100000, 8700000);

/* Bật lại kiểm tra khóa ngoại sau khi đã hoàn tất */
SET FOREIGN_KEY_CHECKS = 1;