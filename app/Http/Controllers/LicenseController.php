<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Carbon\Carbon;
use Illuminate\Http\Request;

class LicenseController extends Controller
{
    /**
     * Simple test method
     */
    public function test()
    {
        return 'License controller is working!';
    }

    /**
     * Display the license management page.
     */
    public function index()
    {
        try {
            $setting = Setting::first();
            
            if (!$setting) {
                return 'No settings found - redirecting to setup';
            }

            $licenseStatus = 'No License Set';
            $statusClass = 'secondary';
            
            if ($setting->license_expires_at) {
                $today = Carbon::today();
                $expiryDate = Carbon::parse($setting->license_expires_at);
                
                if ($today->greaterThan($expiryDate)) {
                    $licenseStatus = 'Expired';
                    $statusClass = 'danger';
                } elseif ($today->copy()->addDays(7)->greaterThan($expiryDate)) {
                    $licenseStatus = 'Expiring Soon';
                    $statusClass = 'warning';
                } else {
                    $licenseStatus = 'Valid';
                    $statusClass = 'success';
                }
            }

            // Get Modules data for the layout
            $ModulesData = \App\Http\Controllers\BaseController::get_Module_Info();

            return view('license.standalone', [
                'setting' => $setting,
                'licenseStatus' => $licenseStatus,
                'statusClass' => $statusClass,
                'daysUntilExpiry' => $setting->license_expires_at ? 
                    Carbon::today()->diffInDays(Carbon::parse($setting->license_expires_at), false) : null,
                'ModulesInstalled' => $ModulesData['ModulesInstalled'],
                'ModulesEnabled' => $ModulesData['ModulesEnabled'],
            ]);
        } catch (\Exception $e) {
            return 'Error in license controller: ' . $e->getMessage();
        }
    }

    /**
     * Update the license dates.
     */
    public function update(Request $request)
    {
        $request->validate([
            'license_created_at' => 'required|date',
            'license_expires_at' => 'required|date|after_or_equal:license_created_at',
        ]);

        $setting = Setting::first();
        
        if (!$setting) {
            return response()->json(['error' => 'Settings not found'], 404);
        }

        $setting->update([
            'license_created_at' => $request->license_created_at,
            'license_expires_at' => $request->license_expires_at,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'License dates updated successfully!',
            'license_created_at' => $setting->license_created_at->format('Y-m-d'),
            'license_expires_at' => $setting->license_expires_at->format('Y-m-d'),
        ]);
    }

    /**
     * Get current license status (for AJAX calls).
     */
    public function status()
    {
        $setting = Setting::first();
        
        if (!$setting || !$setting->license_expires_at) {
            return response()->json([
                'status' => 'no_license',
                'message' => 'No license configured'
            ]);
        }

        $today = Carbon::today();
        $expiryDate = Carbon::parse($setting->license_expires_at);
        
        if ($today->greaterThan($expiryDate)) {
            return response()->json([
                'status' => 'expired',
                'message' => 'License expired on ' . $expiryDate->format('Y-m-d'),
                'expired' => true
            ]);
        } elseif ($today->copy()->addDays(7)->greaterThan($expiryDate)) {
            return response()->json([
                'status' => 'expiring_soon',
                'message' => 'License expires on ' . $expiryDate->format('Y-m-d'),
                'days_left' => $today->diffInDays($expiryDate)
            ]);
        } else {
            return response()->json([
                'status' => 'valid',
                'message' => 'License is valid until ' . $expiryDate->format('Y-m-d'),
                'days_left' => $today->diffInDays($expiryDate)
            ]);
        }
    }
}
