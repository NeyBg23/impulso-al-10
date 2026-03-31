CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`userName` varchar(200),
	`action` varchar(100) NOT NULL,
	`entity` varchar(100) NOT NULL,
	`entityId` int,
	`previousValues` json,
	`newValues` json,
	`ipAddress` varchar(45),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fullName` varchar(200) NOT NULL,
	`documentType` enum('CC','CE','NIT','PASAPORTE') NOT NULL DEFAULT 'CC',
	`documentNumber` varchar(30) NOT NULL,
	`phone` varchar(20) NOT NULL,
	`email` varchar(320),
	`address` text,
	`city` varchar(100),
	`occupation` varchar(150),
	`reference1Name` varchar(200),
	`reference1Phone` varchar(20),
	`reference1Relation` varchar(100),
	`reference2Name` varchar(200),
	`reference2Phone` varchar(20),
	`reference2Relation` varchar(100),
	`status` enum('pending','validated','approved','blocked') NOT NULL DEFAULT 'pending',
	`notes` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`),
	CONSTRAINT `clients_documentNumber_unique` UNIQUE(`documentNumber`)
);
--> statement-breakpoint
CREATE TABLE `collections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`loanId` int NOT NULL,
	`contactType` enum('call','message','visit','email','other') NOT NULL,
	`contactDate` timestamp NOT NULL DEFAULT (now()),
	`result` enum('contacted','no_answer','promised_payment','refused','other') NOT NULL,
	`notes` text,
	`nextContactDate` timestamp,
	`registeredBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `collections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`loanId` int,
	`type` enum('id_front','id_back','selfie','receipt','contract','other') NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` text NOT NULL,
	`mimeType` varchar(100),
	`fileSize` int,
	`description` text,
	`uploadedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `installments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`loanId` int NOT NULL,
	`installmentNumber` int NOT NULL,
	`dueDate` timestamp NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`paidAmount` decimal(15,2) NOT NULL DEFAULT '0',
	`status` enum('pending','paid','overdue','partial') NOT NULL DEFAULT 'pending',
	`paidAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `installments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `legal_consents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`consentType` enum('terms','data_policy','identity_auth') NOT NULL,
	`accepted` boolean NOT NULL DEFAULT true,
	`ipAddress` varchar(45),
	`userAgent` text,
	`deviceInfo` text,
	`acceptedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `legal_consents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `loans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`principal` decimal(15,2) NOT NULL,
	`interestRate` decimal(5,2) NOT NULL,
	`termMonths` int NOT NULL,
	`frequency` enum('weekly','biweekly','monthly') NOT NULL,
	`totalInterest` decimal(15,2) NOT NULL,
	`totalAmount` decimal(15,2) NOT NULL,
	`installmentCount` int NOT NULL,
	`installmentAmount` decimal(15,2) NOT NULL,
	`status` enum('active','paid','overdue','cancelled') NOT NULL DEFAULT 'active',
	`disbursementDate` timestamp NOT NULL DEFAULT (now()),
	`firstDueDate` timestamp NOT NULL,
	`notes` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `loans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`loanId` int NOT NULL,
	`installmentId` int,
	`amount` decimal(15,2) NOT NULL,
	`paymentDate` timestamp NOT NULL DEFAULT (now()),
	`paymentMethod` varchar(50),
	`reference` varchar(100),
	`receiptUrl` text,
	`status` enum('pending','verified','rejected','reversed') NOT NULL DEFAULT 'pending',
	`notes` text,
	`isReversed` boolean NOT NULL DEFAULT false,
	`reversedBy` int,
	`reversedAt` timestamp,
	`reversalReason` text,
	`registeredBy` int,
	`verifiedBy` int,
	`verifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `penalties` (
	`id` int AUTO_INCREMENT NOT NULL,
	`loanId` int NOT NULL,
	`installmentId` int NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`reason` text NOT NULL,
	`daysOverdue` int NOT NULL,
	`status` enum('active','paid','reversed') NOT NULL DEFAULT 'active',
	`isReversed` boolean NOT NULL DEFAULT false,
	`reversedBy` int,
	`reversedAt` timestamp,
	`reversalReason` text,
	`appliedBy` int NOT NULL,
	`appliedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `penalties_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(100) NOT NULL,
	`value` text NOT NULL,
	`description` text,
	`updatedBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `settings_key_unique` UNIQUE(`key`)
);
