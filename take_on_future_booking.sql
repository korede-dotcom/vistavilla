-- Identify future bookings
WITH future_bookings AS (
    SELECT room_number
    FROM hotelbookings  -- Correct table name
    WHERE status = 'success'
    AND "end" > CURRENT_DATE + TIME '23:59:59'  -- Booking ends in the future
)

-- Update room statuses to true for rooms with future bookings
UPDATE roomnumbers  -- Correct table name for room numbers
SET status = true
WHERE room_number IN (SELECT room_number FROM future_bookings)
AND status = false;  -- Only update if the room is currently marked unavailable
