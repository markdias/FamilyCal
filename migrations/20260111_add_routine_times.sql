-- Migration to add start_time and end_time to routines table
ALTER TABLE routines 
ADD COLUMN start_time TIME,
ADD COLUMN end_time TIME;
