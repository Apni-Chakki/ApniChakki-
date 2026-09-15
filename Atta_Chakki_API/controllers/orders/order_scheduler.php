<?php
// order_scheduler.php - orders scheduling wrapper using SchedulerService
require_once __DIR__ . '/../../core/autoload.php';

use AttaChakki\Services\SchedulerService;

// Ensure timezone
SchedulerService::initTimezone();

/**
 * Backward-compatible wrapper functions delegating to SchedulerService
 */
function getOperationalHours($conn) {
    return SchedulerService::getOperationalHours($conn);
}

function calculateOrderWeight($conn, $order_id) {
    return SchedulerService::calculateOrderWeight($conn, $order_id);
}

function getLastCompletionTime($conn, $date) {
    return SchedulerService::getLastCompletionTime($conn, $date);
}

function getNextQueuePosition($conn, $date) {
    return SchedulerService::getNextQueuePosition($conn, $date);
}

function getActiveOrderCount($conn, $date) {
    return SchedulerService::getActiveOrderCount($conn, $date);
}

function getScheduleAvailability($conn, $estimated_weight_kg = 1) {
    return SchedulerService::getScheduleAvailability($conn, $estimated_weight_kg);
}

function scheduleOrder($conn, $order_id) {
    return SchedulerService::scheduleOrder($conn, $order_id);
}

function recalculateSchedule($conn, $date) {
    return SchedulerService::recalculateSchedule($conn, $date);
}

function getCapacityInfo($conn, $date) {
    return SchedulerService::getCapacityInfo($conn, $date);
}
