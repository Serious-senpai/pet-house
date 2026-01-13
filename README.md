# PetHouse

PetHouse is a pet care website designed to assist owners in effectively managing and caring for their pets. The application offers features such as health tracking, vaccination schedules, feeding reminders, and various other utilities to ensure your pets remain healthy and happy.

# Installation
1. Install dependencies: npm install
2. Set up Supabase: 
- Create a new project on the Supabase Dashboard.
- Go to Project Settings > API to find your URL and keys.
- Update the .env file with your project details.
- Database Migration: Use the SQL files located in supabase/migrations (e.g., 008_create_payment.sql) to set up your database tables via the Supabase SQL Editor
3. Run the application: npm run dev

# Usage
After starting the application, it should be accessible at http://localhost:3000.

The system supports four distinct user roles:
- Admin: Manages the overall system, dashboard, and payments.
- Staff: Handles daily operations and pet boarding management.
- Vet: Manages health records, examinations, and medical schedules.
- Pet Owner: Books services, tracks pet health, and receives reminders.
