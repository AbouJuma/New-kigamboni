<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Setting;
use Carbon\Carbon;

class TestLicenseCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'license:test {type=valid : Type of license test (valid|yearly|week|expired|tomorrow)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test license expiration functionality';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $type = $this->argument('type');
        $setting = Setting::first();
        
        if (!$setting) {
            $this->error('No settings record found. Please ensure the application is properly installed.');
            return 1;
        }

        // Set license created date (30 days ago)
        $setting->license_created_at = Carbon::now()->subDays(30);
        
        switch ($type) {
            case 'expired':
                $setting->license_expires_at = Carbon::yesterday();
                $this->info('License set to EXPIRED (yesterday)');
                break;
            case 'tomorrow':
                $setting->license_expires_at = Carbon::tomorrow();
                $this->info('License set to EXPIRE TOMORROW');
                break;
            case 'week':
                $setting->license_expires_at = Carbon::now()->addDays(7);
                $this->info('License set to EXPIRE IN 7 DAYS (for testing notifications)');
                break;
            case 'yearly':
                $setting->license_expires_at = Carbon::now()->addDays(365);
                $this->info('License set to YEARLY (365 days from now)');
                break;
            case 'valid':
            default:
                $setting->license_expires_at = Carbon::now()->addDays(30);
                $this->info('License set to VALID (30 days from now)');
                break;
        }
        
        $setting->save();
        
        $this->info('License test data updated successfully!');
        $this->line('License created: ' . $setting->license_created_at->format('Y-m-d'));
        $this->line('License expires: ' . $setting->license_expires_at->format('Y-m-d'));
        $this->line('Today: ' . Carbon::today()->format('Y-m-d'));
        
        // Check if license is expired
        $isExpired = Carbon::today()->greaterThan($setting->license_expires_at);
        $this->line('License status: ' . ($isExpired ? 'EXPIRED' : 'VALID'));
        
        $this->line('');
        $this->info('You can manage license settings at: /license');
        
        return 0;
    }
}
