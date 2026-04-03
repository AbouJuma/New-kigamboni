<?php
namespace App\Http\Controllers;

use App\Http\Controllers\BaseController;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends BaseController
{

    //--------------- Function Login ----------------\\

    // public function getAccessToken(Request $request)
    // {
    //     $request->validate([
    //         'email' => 'required',
    //         'password' => 'required',
    //     ]);

    //     $credentials = request(['email', 'password']);

    //     if (Auth::attempt($credentials)) {
    //         $userStatus = Auth::User()->statut;
    //         if ($userStatus === 0) {
    //             return response()->json([
    //                 'message' => 'This user not active',
    //                 'status' => 'NotActive',
    //             ]);
    //         }

    //     } else {
    //         return response()->json([
    //             'message' => 'Incorrect Login',
    //             'status' => false,
    //         ]);
    //     }

    //     $user = auth()->user();
    //     $tokenResult = $user->createToken('Access Token');
    //     $token = $tokenResult->token;
    //     $this->setCookie('Stocky_token', $tokenResult->accessToken);

    //     return response()->json([
    //         'Stocky_token' => $tokenResult->accessToken,
    //         'username' => Auth::User()->username,
    //         'status' => true,
    //     ]);


    //     if (auth()->attempt($request->only('email', 'password'))) {
    //         $user = auth()->user();

    //         // Prepare data for the cURL request
    //         $data = [
    //             'username' => 'mwenge',
    //             'password' => '123456',
    //             'companyID' => 'UHKO1W',
    //             'serial_number' => '10TZ100712',
    //         ];

    //         // Make the API request using Laravel's Http client
    //         $response = Http::post('https://development.weberp.co.tz/v1/gateway/get-token', $data);

    //         // Check if the response is successful
    //         if ($response->successful()) {
    //             $accessToken = $response->json()['access_token']; // Assuming `access_token` is the key

    //             // Return a successful response with the token
    //             return response()->json([
    //                 'message' => 'Login successful',
    //                 'access_token' => $accessToken,
    //                 'user' => $user,
    //             ]);
    //         } else {
    //             // Handle errors from the API
    //             return response()->json([
    //                 'message' => 'Failed to retrieve access token',
    //                 'error' => $response->json(),
    //             ], $response->status());
    //         }
    //     } else {
    //         return response()->json([
    //             'message' => 'Invalid credentials',
    //         ], 401);
    //     }
    // }

   public function getAccessToken(Request $request)
{
    $request->validate([
        'email' => 'required',
        'password' => 'required',
    ]);

    $credentials = request(['email', 'password']);

    if (Auth::attempt($credentials)) {
        $userStatus = Auth::User()->statut;
        if ($userStatus === 0) {
            return response()->json([
                'message' => 'This user is not active',
                'status' => 'NotActive',
            ]);
        }
    } else {
        return response()->json([
            'message' => 'Incorrect Login',
            'status' => false,
        ]);
    }

    $user = auth()->user();

    // Prepare data for POST request
    $data = [
        'username' => 'mwenge',
        'password' => '123456',
        'companyID' => 'UHKO1W',
        'serial_number' => '10TZ100712',
    ];

    // Send POST request to the external API
    $response = Http::post('https://development.weberp.co.tz/v1/gateway/get-token', $data);

    if ($response->successful()) {
        $apiData = $response->json(); // Assuming the response is JSON

        // Store the API response in the session
        session(['apiData' => $apiData]);

        return response()->json([
            'message' => 'Login successful',
            'apiData' => $apiData,
            'user' => $user,
        ]);
    } else {
        return response()->json([
            'message' => 'Failed to retrieve data from the API',
            'error' => $response->json(),
        ], $response->status());
    }
}



    

    //--------------- Function Logout ----------------\\

    public function logout()
    {
        if (Auth::check()) {
            $user = Auth::user()->token();
            $user->revoke();
            $this->destroyCookie('Stocky_token');
            return response()->json('success');
        }

    }

}