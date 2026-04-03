<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class CustomerDisplayController extends Controller
{
    private $dataFile;
    
    public function __construct()
    {
        $this->dataFile = storage_path('app/display_data.json');
    }
    
    /**
     * Get or update display data
     */
    public function handle(Request $request)
    {
        header('Content-Type: application/json');
        header('Access-Control-Allow-Origin: *');
        
        try {
            if ($request->isMethod('post')) {
                $data = $request->all();
                $data['updated_at'] = now()->toDateTimeString();
                
                Storage::put('display_data.json', json_encode($data));
                
                return response()->json([
                    'success' => true,
                    'message' => 'Updated',
                    'data' => $data
                ]);
            }
            
            // GET request
            $data = [];
            if (Storage::exists('display_data.json')) {
                $content = Storage::get('display_data.json');
                $data = json_decode($content, true) ?: [];
            }
            
            return response()->json([
                'success' => true,
                'data' => $data,
                'server_time' => now()->toDateTimeString()
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Clear display data
     */
    public function clear()
    {
        Storage::put('display_data.json', json_encode(['action' => 'clear']));
        return response()->json(['success' => true, 'message' => 'Cleared']);
    }
}
