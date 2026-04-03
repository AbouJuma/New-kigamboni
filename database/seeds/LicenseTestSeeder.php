<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Setting;
use Carbon\Carbon;

class LicenseTestSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        // Get the first settings record
        $setting = Setting::first();
        
        if ($setting) {
            // Set license dates for testing
            // License created 30 days ago
            $setting->license_created_at = Carbon::now()->subDays(30);
            
            // License expires tomorrow (for testing near expiration)
            // You can change this to test different scenarios:
            // - Carbon::yesterday() for expired license
            // - Carbon::now()->addDays(30) for valid license
            $setting->license_expires_at = Carbon::tomorrow();
            
            $setting->save();
            
            $this->command->info('License test data seeded successfully!');
            $this->command->info('License created: ' . $setting->license_created_at);
            $this->command->info('License expires: ' . $setting->license_expires_at);
        } else {
            $this->command->error('No settings record found. Please ensure the application is properly installed.');
        }
    }
}
