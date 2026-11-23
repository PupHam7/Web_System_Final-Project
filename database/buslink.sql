-- ============================================================
-- Bus-Link database  (bus_link_db)
-- MySQL 8.x / MariaDB 10.5+  |  utf8mb4
-- Structure only (tables, constraints, views). Load seed.sql afterwards for dummy data.
-- Run this first, then seed.sql. Re-running this file wipes the database.
-- ============================================================

CREATE DATABASE IF NOT EXISTS `bus_link_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `bus_link_db`;

SET FOREIGN_KEY_CHECKS = 0;
DROP VIEW  IF EXISTS `v_sync_queue`;
DROP VIEW  IF EXISTS `v_university_student_feed`;
DROP VIEW  IF EXISTS `v_current_fare`;
DROP TABLE IF EXISTS `system_log`, `wallet_topup`, `digital_receipt`, `transaction`,
                     `conductor_assignment`, `bus_assignment`, `fare`, `route_stop`, `bus_stop`,
                     `route`, `conductor`, `bus`, `passenger`, `payment_method`, `admin`;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. ADMIN ---------------------------------------------------
CREATE TABLE `admin` (
  `admin_id`      int          NOT NULL AUTO_INCREMENT,
  `full_name`     varchar(120) NOT NULL,
  `username`      varchar(50)  NOT NULL,
  `password_hash` varchar(255) NOT NULL COMMENT 'bcrypt hash, never plain text',
  `status`        varchar(20)  NOT NULL DEFAULT 'ACTIVE',
  PRIMARY KEY (`admin_id`),
  UNIQUE KEY `uq_admin_username` (`username`),
  CONSTRAINT `chk_admin_status` CHECK (`status` IN ('ACTIVE','INACTIVE'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. PAYMENT_METHOD ------------------------------------------
CREATE TABLE `payment_method` (
  `payment_method_id` int         NOT NULL AUTO_INCREMENT,
  `method_name`       varchar(40) NOT NULL,
  `provider`          varchar(80) NOT NULL,
  `status`            varchar(20) NOT NULL DEFAULT 'ACTIVE',
  PRIMARY KEY (`payment_method_id`),
  UNIQUE KEY `uq_payment_method` (`method_name`,`provider`),
  CONSTRAINT `chk_payment_method_status` CHECK (`status` IN ('ACTIVE','INACTIVE'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. PASSENGER (card holder / student) -----------------------
CREATE TABLE `passenger` (
  `passenger_id`      int           NOT NULL AUTO_INCREMENT,
  `full_name`         varchar(120)  NOT NULL,
  `contact_no`        varchar(20)   NOT NULL,
  `qr_code`           varchar(50)   NOT NULL,
  `passenger_type`    varchar(20)   NOT NULL DEFAULT 'REGULAR',
  `student_id`        varchar(20)   NULL,
  `card_number`       varchar(30)   NOT NULL,
  `enrollment_status` varchar(20)   NULL,
  `balance`           decimal(10,2) NOT NULL DEFAULT 0.00,
  `status`            varchar(20)   NOT NULL DEFAULT 'ACTIVE',
  `created_at`        datetime      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`passenger_id`),
  UNIQUE KEY `uq_passenger_qr`      (`qr_code`),
  UNIQUE KEY `uq_passenger_card`    (`card_number`),
  UNIQUE KEY `uq_passenger_student` (`student_id`),
  KEY `idx_passenger_name` (`full_name`),
  CONSTRAINT `chk_passenger_type`       CHECK (`passenger_type` IN ('REGULAR','STUDENT')),
  CONSTRAINT `chk_passenger_enrollment` CHECK (`enrollment_status` IS NULL OR `enrollment_status` IN ('ENROLLED','NOT_ENROLLED','GRADUATED')),
  CONSTRAINT `chk_passenger_balance`    CHECK (`balance` >= 0),
  CONSTRAINT `chk_passenger_status`     CHECK (`status` IN ('ACTIVE','INACTIVE','BLOCKED')),
  CONSTRAINT `chk_passenger_student_fields` CHECK (`passenger_type` = 'STUDENT' OR (`student_id` IS NULL AND `enrollment_status` IS NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. BUS -----------------------------------------------------
CREATE TABLE `bus` (
  `bus_id`       int         NOT NULL AUTO_INCREMENT,
  `plate_number` varchar(20) NOT NULL,
  `bus_number`   varchar(20) NOT NULL,
  `capacity`     int         NOT NULL,
  `status`       varchar(20) NOT NULL DEFAULT 'ACTIVE',
  PRIMARY KEY (`bus_id`),
  UNIQUE KEY `uq_bus_plate`  (`plate_number`),
  UNIQUE KEY `uq_bus_number` (`bus_number`),
  CONSTRAINT `chk_bus_capacity` CHECK (`capacity` > 0),
  CONSTRAINT `chk_bus_status`   CHECK (`status` IN ('ACTIVE','INACTIVE','MAINTENANCE'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. CONDUCTOR -----------------------------------------------
CREATE TABLE `conductor` (
  `conductor_id` int          NOT NULL AUTO_INCREMENT,
  `full_name`    varchar(120) NOT NULL,
  `contact_info` varchar(30)  NOT NULL,
  `status`       varchar(20)  NOT NULL DEFAULT 'ACTIVE',
  PRIMARY KEY (`conductor_id`),
  CONSTRAINT `chk_conductor_status` CHECK (`status` IN ('ACTIVE','INACTIVE'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. ROUTE ---------------------------------------------------
CREATE TABLE `route` (
  `route_id`    int          NOT NULL AUTO_INCREMENT,
  `route_name`  varchar(100) NOT NULL,
  `origin`      varchar(100) NOT NULL,
  `destination` varchar(100) NOT NULL,
  `status`      varchar(20)  NOT NULL DEFAULT 'ACTIVE',
  PRIMARY KEY (`route_id`),
  UNIQUE KEY `uq_route_name` (`route_name`),
  CONSTRAINT `chk_route_endpoints` CHECK (`origin` <> `destination`),
  CONSTRAINT `chk_route_status`    CHECK (`status` IN ('ACTIVE','INACTIVE'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. BUS_STOP ------------------------------------------------
CREATE TABLE `bus_stop` (
  `bus_stop_id` int          NOT NULL AUTO_INCREMENT,
  `stop_name`   varchar(100) NOT NULL,
  `location`    varchar(150) NOT NULL,
  PRIMARY KEY (`bus_stop_id`),
  UNIQUE KEY `uq_bus_stop_name` (`stop_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. ROUTE_STOP (ordered stops on a route) --------------------
CREATE TABLE `route_stop` (
  `route_stop_id` int NOT NULL AUTO_INCREMENT,
  `route_id`      int NOT NULL,
  `bus_stop_id`   int NOT NULL,
  `stop_order`    int NOT NULL,
  PRIMARY KEY (`route_stop_id`),
  UNIQUE KEY `uq_route_stop_pair`  (`route_id`,`bus_stop_id`),
  UNIQUE KEY `uq_route_stop_order` (`route_id`,`stop_order`),
  KEY `fk_route_stop_bus_stop` (`bus_stop_id`),
  CONSTRAINT `fk_route_stop_route`    FOREIGN KEY (`route_id`)    REFERENCES `route` (`route_id`)       ON DELETE CASCADE,
  CONSTRAINT `fk_route_stop_bus_stop` FOREIGN KEY (`bus_stop_id`) REFERENCES `bus_stop` (`bus_stop_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_stop_order` CHECK (`stop_order` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. FARE (versioned by effective date) ----------------------
CREATE TABLE `fare` (
  `fare_id`        int           NOT NULL AUTO_INCREMENT,
  `route_id`       int           NOT NULL,
  `base_fare`      decimal(10,2) NOT NULL,
  `fare_type`      varchar(30)   NOT NULL,
  `effective_date` date          NOT NULL,
  PRIMARY KEY (`fare_id`),
  UNIQUE KEY `uq_fare_version` (`route_id`,`fare_type`,`effective_date`),
  CONSTRAINT `fk_fare_route`  FOREIGN KEY (`route_id`) REFERENCES `route` (`route_id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_base_fare`  CHECK (`base_fare` >= 0),
  CONSTRAINT `chk_fare_type`  CHECK (`fare_type` IN ('REGULAR','STUDENT','SPECIAL'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. BUS_ASSIGNMENT -----------------------------------------
CREATE TABLE `bus_assignment` (
  `assignment_id` int         NOT NULL AUTO_INCREMENT,
  `bus_id`        int         NOT NULL,
  `route_id`      int         NOT NULL,
  `assigned_at`   datetime    NOT NULL,
  `status`        varchar(20) NOT NULL DEFAULT 'ACTIVE',
  PRIMARY KEY (`assignment_id`),
  UNIQUE KEY `uq_bus_assignment` (`bus_id`,`route_id`,`assigned_at`),
  KEY `fk_bus_assignment_route` (`route_id`),
  CONSTRAINT `fk_bus_assignment_bus`   FOREIGN KEY (`bus_id`)   REFERENCES `bus` (`bus_id`)     ON DELETE RESTRICT,
  CONSTRAINT `fk_bus_assignment_route` FOREIGN KEY (`route_id`) REFERENCES `route` (`route_id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_bus_assignment_status` CHECK (`status` IN ('ACTIVE','INACTIVE'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. CONDUCTOR_ASSIGNMENT -----------------------------------
CREATE TABLE `conductor_assignment` (
  `assignment_id` int         NOT NULL AUTO_INCREMENT,
  `conductor_id`  int         NOT NULL,
  `bus_id`        int         NOT NULL,
  `assigned_at`   datetime    NOT NULL,
  `status`        varchar(20) NOT NULL DEFAULT 'ACTIVE',
  PRIMARY KEY (`assignment_id`),
  UNIQUE KEY `uq_conductor_assignment` (`conductor_id`,`bus_id`,`assigned_at`),
  KEY `fk_conductor_assignment_bus` (`bus_id`),
  CONSTRAINT `fk_conductor_assignment_conductor` FOREIGN KEY (`conductor_id`) REFERENCES `conductor` (`conductor_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_conductor_assignment_bus`       FOREIGN KEY (`bus_id`)       REFERENCES `bus` (`bus_id`)             ON DELETE RESTRICT,
  CONSTRAINT `chk_conductor_assignment_status` CHECK (`status` IN ('ACTIVE','INACTIVE'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. TRANSACTION (every fare payment) -----------------------
CREATE TABLE `transaction` (
  `transaction_id`    int           NOT NULL AUTO_INCREMENT,
  `client_txn_uuid`   char(36)      NOT NULL COMMENT 'generated on the conductor device; makes offline sync idempotent',
  `passenger_id`      int           NOT NULL,
  `bus_id`            int           NULL,
  `route_id`          int           NULL,
  `conductor_id`      int           NULL,
  `payment_method_id` int           NOT NULL,
  `fare_id`           int           NULL COMMENT 'fare row that priced this ride',
  `amount_paid`       decimal(10,2) NOT NULL,
  `payment_status`    varchar(20)   NOT NULL,
  `is_offline`        tinyint(1)    NOT NULL DEFAULT 0,
  `sync_status`       varchar(20)   NOT NULL,
  `synced_at`         datetime      NULL,
  `created_at`        datetime      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`transaction_id`),
  UNIQUE KEY `uq_transaction_client_uuid` (`client_txn_uuid`),
  KEY `idx_txn_passenger_time` (`passenger_id`,`created_at`),
  KEY `idx_txn_route_time`     (`route_id`,`created_at`),
  KEY `idx_txn_bus_time`       (`bus_id`,`created_at`),
  KEY `idx_txn_conductor`      (`conductor_id`),
  KEY `idx_txn_payment_method` (`payment_method_id`),
  KEY `idx_txn_fare`           (`fare_id`),
  KEY `idx_txn_sync_queue`     (`is_offline`,`sync_status`),
  CONSTRAINT `fk_txn_passenger`      FOREIGN KEY (`passenger_id`)      REFERENCES `passenger` (`passenger_id`)           ON DELETE RESTRICT,
  CONSTRAINT `fk_txn_bus`            FOREIGN KEY (`bus_id`)            REFERENCES `bus` (`bus_id`)                       ON DELETE RESTRICT,
  CONSTRAINT `fk_txn_route`          FOREIGN KEY (`route_id`)          REFERENCES `route` (`route_id`)                   ON DELETE RESTRICT,
  CONSTRAINT `fk_txn_conductor`      FOREIGN KEY (`conductor_id`)      REFERENCES `conductor` (`conductor_id`)           ON DELETE SET NULL,
  CONSTRAINT `fk_txn_payment_method` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_method` (`payment_method_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_txn_fare`           FOREIGN KEY (`fare_id`)           REFERENCES `fare` (`fare_id`)                     ON DELETE SET NULL,
  CONSTRAINT `chk_txn_amount`         CHECK (`amount_paid` >= 0),
  CONSTRAINT `chk_txn_payment_status` CHECK (`payment_status` IN ('PAID','PENDING','FAILED','CANCELLED','REFUNDED')),
  CONSTRAINT `chk_txn_sync_status`    CHECK (`sync_status` IN ('SYNCED','PENDING','FAILED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. DIGITAL_RECEIPT ----------------------------------------
CREATE TABLE `digital_receipt` (
  `receipt_id`      int         NOT NULL AUTO_INCREMENT,
  `transaction_id`  int         NOT NULL,
  `receipt_code`    varchar(50) NOT NULL,
  `issued_at`       datetime    NOT NULL,
  `delivery_method` varchar(30) NOT NULL,
  PRIMARY KEY (`receipt_id`),
  UNIQUE KEY `uq_receipt_transaction` (`transaction_id`),
  UNIQUE KEY `uq_receipt_code`        (`receipt_code`),
  CONSTRAINT `fk_receipt_transaction` FOREIGN KEY (`transaction_id`) REFERENCES `transaction` (`transaction_id`) ON DELETE CASCADE,
  CONSTRAINT `chk_receipt_delivery` CHECK (`delivery_method` IN ('SMS','EMAIL','APP','PRINT'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. SYSTEM_LOG ---------------------------------------------
CREATE TABLE `system_log` (
  `log_id`   int          NOT NULL AUTO_INCREMENT,
  `admin_id` int          NOT NULL,
  `action`   varchar(100) NOT NULL,
  `log_time` datetime     NOT NULL,
  `details`  text         NULL,
  PRIMARY KEY (`log_id`),
  KEY `idx_log_admin_time` (`admin_id`,`log_time`),
  KEY `idx_log_action`     (`action`),
  CONSTRAINT `fk_system_log_admin` FOREIGN KEY (`admin_id`) REFERENCES `admin` (`admin_id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- EXTRA: WALLET_TOPUP (e-wallet, kiosk cash, university deposits) ----
CREATE TABLE `wallet_topup` (
  `topup_id`          int           NOT NULL AUTO_INCREMENT,
  `passenger_id`      int           NOT NULL,
  `payment_method_id` int           NOT NULL,
  `source`            varchar(20)   NOT NULL,
  `amount`            decimal(10,2) NOT NULL,
  `reference_no`      varchar(50)   NOT NULL,
  `processed_by`      varchar(80)   NULL COMMENT 'kiosk ID or university accountant; NULL for e-wallet',
  `status`            varchar(20)   NOT NULL DEFAULT 'COMPLETED',
  `created_at`        datetime      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`topup_id`),
  UNIQUE KEY `uq_topup_reference` (`reference_no`),
  KEY `idx_topup_passenger_time` (`passenger_id`,`created_at`),
  KEY `idx_topup_payment_method` (`payment_method_id`),
  CONSTRAINT `fk_topup_passenger`      FOREIGN KEY (`passenger_id`)      REFERENCES `passenger` (`passenger_id`)           ON DELETE RESTRICT,
  CONSTRAINT `fk_topup_payment_method` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_method` (`payment_method_id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_topup_amount` CHECK (`amount` > 0),
  CONSTRAINT `chk_topup_source` CHECK (`source` IN ('EWALLET','KIOSK_CASH','UNIVERSITY')),
  CONSTRAINT `chk_topup_status` CHECK (`status` IN ('COMPLETED','PENDING','FAILED','REVERSED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- VIEWS
-- ============================================================
-- Fare currently in force per route and fare type
CREATE VIEW `v_current_fare` AS
SELECT f.`fare_id`, f.`route_id`, f.`fare_type`, f.`base_fare`, f.`effective_date`
FROM   `fare` f
JOIN  (SELECT `route_id`, `fare_type`, MAX(`effective_date`) AS max_date
       FROM `fare` WHERE `effective_date` <= CURRENT_DATE GROUP BY `route_id`, `fare_type`) x
  ON  x.`route_id` = f.`route_id` AND x.`fare_type` = f.`fare_type` AND x.max_date = f.`effective_date`;

-- Only the four fields the university may share with Bus-Link
CREATE VIEW `v_university_student_feed` AS
SELECT `student_id`, `full_name`, `card_number`, `enrollment_status`
FROM   `passenger`
WHERE  `passenger_type` = 'STUDENT';

-- Admin sync monitor: offline payments not yet (successfully) synced
CREATE VIEW `v_sync_queue` AS
SELECT t.`transaction_id`, t.`client_txn_uuid`, t.`created_at`, t.`sync_status`, t.`payment_status`,
       t.`amount_paid`, b.`bus_number`, r.`route_name`, c.`full_name` AS conductor
FROM   `transaction` t
LEFT JOIN `bus` b       ON b.`bus_id` = t.`bus_id`
LEFT JOIN `route` r     ON r.`route_id` = t.`route_id`
LEFT JOIN `conductor` c ON c.`conductor_id` = t.`conductor_id`
WHERE  t.`is_offline` = 1 AND t.`sync_status` <> 'SYNCED';
