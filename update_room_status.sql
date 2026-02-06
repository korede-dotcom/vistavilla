WITH expired_bookings AS (
    SELECT room_number
    FROM hotelbookings  -- Correct table name
    WHERE status = 'success'
    AND "end" >= CURRENT_DATE + TIME '00:00:00'
    AND "end" < CURRENT_DATE + TIME '23:59:59'
    AND "end" < NOW()  -- Ensure end time has passed
)
-- Update room statuses to false for expired bookings
UPDATE roomnumbers  -- Correct table name for room numbers
SET status = false
WHERE room_number IN (SELECT room_number FROM expired_bookings);