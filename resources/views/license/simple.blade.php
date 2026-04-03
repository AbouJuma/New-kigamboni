<!DOCTYPE html>
<html>
<head>
    <title>License Management</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
    <div class="container mt-4">
        <h1>License Management</h1>
        <p>Status: {{ $licenseStatus }}</p>
        <p>Controller is working! View is loading!</p>
        @if($setting->license_expires_at)
            <p>License expires: {{ $setting->license_expires_at->format('Y-m-d') }}</p>
        @endif
    </div>
</body>
</html>
