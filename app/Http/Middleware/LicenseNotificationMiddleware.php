<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\Setting;
use Carbon\Carbon;

class LicenseNotificationMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Only check for authenticated users
        if (!auth()->check()) {
            return $next($request);
        }

        // Skip license check for login, setup, license, and public routes
        $excludedRoutes = ['login', 'setup', 'password', 'api/login', 'license'];
        
        foreach ($excludedRoutes as $route) {
            if ($request->is($route) || $request->is($route . '/*')) {
                return $next($request);
            }
        }

        // Get the first settings record
        $setting = Setting::first();
        
        if ($setting && $setting->license_expires_at) {
            $today = Carbon::today();
            $expiryDate = Carbon::parse($setting->license_expires_at);
            
            // Check if license has expired
            if ($today->greaterThan($expiryDate)) {
                // License expired - handled by CheckLicenseExpiration middleware
                return $next($request);
            }
            
            // Check if license expires within 7 days
            $daysUntilExpiry = $today->diffInDays($expiryDate, false);
            
            if ($daysUntilExpiry <= 7 && $daysUntilExpiry >= 0) {
                // Share license notification data with all views
                view()->share('licenseNotification', [
                    'show' => true,
                    'daysLeft' => $daysUntilExpiry,
                    'expiryDate' => $expiryDate->format('F j, Y'),
                    'expiryDateShort' => $expiryDate->format('Y-m-d'),
                    'type' => $daysUntilExpiry <= 3 ? 'warning' : 'info', // Warning if 3 days or less
                ]);
            }
        }

        return $next($request);
    }
}
