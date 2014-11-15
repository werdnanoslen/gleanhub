-- phpMyAdmin SQL Dump
-- version 3.5.1
-- http://www.phpmyadmin.net
--
-- Host: db.cip.gatech.edu
-- Generation Time: Nov 15, 2014 at 03:23 AM
-- Server version: 5.5.15-log
-- PHP Version: 5.3.13

SET SQL_MODE="NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;

--
-- Database: `CONTRIB_gleanhub`
--

-- --------------------------------------------------------

--
-- Table structure for table `foodops`
--

CREATE TABLE IF NOT EXISTS `foodops` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'UID',
  `owner` int(11) NOT NULL COMMENT 'UID of user who owns this foodop',
  `visibility` enum('public','limited','closed') NOT NULL DEFAULT 'public' COMMENT 'Public ops are visible to all, limited ops are visible to owner and advisors, closed events are visible only to owner',
  `location` varchar(32) NOT NULL COMMENT 'Coordinates of food pickup area',
  `time` varchar(32) NOT NULL COMMENT 'Time or time-range of the pickup area',
  `repeat` text NOT NULL COMMENT 'Days time is valid for, if any (e.g. "M" for every monday or "SU" for every weekend)',
  `notes` text NOT NULL COMMENT 'Notes or instructions the owner may leave to the gleaner',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 AUTO_INCREMENT=1 ;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
