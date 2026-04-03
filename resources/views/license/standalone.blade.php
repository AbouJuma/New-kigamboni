<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width,initial-scale=1.0" />
    <link rel=icon href=/images/favicon.ico>
    <link rel="stylesheet" href="/css/master.css">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <title>License Management | Stocky</title>
</head>
<body class="text-left">
    <div class="container-fluid mt-4">
        <div class="row justify-content-center">
            <div class="col-md-8">
                <div class="card">
                    <div class="card-header">
                        <h4 class="card-title mb-0">
                            <i class="fas fa-key"></i> License Management
                        </h4>
                    </div>
                    <div class="card-body">
                        <!-- License Status Display -->
                        <div class="row mb-4">
                            <div class="col-12">
                                <div class="alert alert-{{ $statusClass }} alert-dismissible fade show" role="alert">
                                    <h5 class="alert-heading">
                                        <i class="fas fa-info-circle"></i> License Status: {{ $licenseStatus }}
                                    </h5>
                                    @if($setting->license_expires_at)
                                        <p class="mb-0">
                                            @if($licenseStatus === 'Expired')
                                                Your license expired on <strong>{{ $setting->license_expires_at->format('F j, Y') }}</strong>. 
                                                Please contact support for renewal.
                                            @elseif($licenseStatus === 'Expiring Soon')
                                                Your license expires in <strong>{{ $daysUntilExpiry }} days</strong> 
                                                on <strong>{{ $setting->license_expires_at->format('F j, Y') }}</strong>.
                                            @else
                                                Your license is valid until <strong>{{ $setting->license_expires_at->format('F j, Y') }}</strong>.
                                            @endif
                                        </p>
                                    @else
                                        <p class="mb-0">No license has been configured yet.</p>
                                    @endif
                                </div>
                            </div>
                        </div>

                        <!-- License Update Form -->
                        <form id="licenseForm">
                            @csrf
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label for="license_created_at">
                                            <i class="fas fa-calendar-plus"></i> License Created Date
                                        </label>
                                        <input type="date" 
                                               class="form-control" 
                                               id="license_created_at" 
                                               name="license_created_at" 
                                               value="{{ $setting->license_created_at ? $setting->license_created_at->format('Y-m-d') : '' }}"
                                               required>
                                        <small class="form-text text-muted">Date when the license was initially created.</small>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-group">
                                        <label for="license_expires_at">
                                            <i class="fas fa-calendar-times"></i> License Expiry Date
                                        </label>
                                        <input type="date" 
                                               class="form-control" 
                                               id="license_expires_at" 
                                               name="license_expires_at" 
                                               value="{{ $setting->license_expires_at ? $setting->license_expires_at->format('Y-m-d') : '' }}"
                                               required>
                                        <small class="form-text text-muted">Date when the license expires.</small>
                                    </div>
                                </div>
                            </div>

                            <div class="row">
                                <div class="col-12">
                                    <button type="submit" class="btn btn-primary">
                                        <i class="fas fa-save"></i> Update License
                                    </button>
                                    <button type="button" class="btn btn-secondary ml-2" onclick="resetForm()">
                                        <i class="fas fa-undo"></i> Reset
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- Quick Actions -->
                <div class="card mt-4">
                    <div class="card-header">
                        <h5 class="card-title mb-0">
                            <i class="fas fa-tools"></i> Quick Actions
                        </h5>
                    </div>
                    <div class="card-body">
                        <div class="row mb-3">
                            <div class="col-md-3">
                                <button class="btn btn-success btn-block" onclick="setValidLicense()">
                                    <i class="fas fa-check-circle"></i> Set Valid (30 days)
                                </button>
                            </div>
                            <div class="col-md-3">
                                <button class="btn btn-info btn-block" onclick="setYearlyLicense()">
                                    <i class="fas fa-calendar-alt"></i> Set Yearly (365 days)
                                </button>
                            </div>
                            <div class="col-md-3">
                                <button class="btn btn-primary btn-block" onclick="setWeekLicense()">
                                    <i class="fas fa-bell"></i> Set 7 Days (Test Notification)
                                </button>
                            </div>
                            <div class="col-md-3">
                                <button class="btn btn-warning btn-block" onclick="setExpiringSoon()">
                                    <i class="fas fa-exclamation-triangle"></i> Set Expiring Soon (7 days)
                                </button>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-md-3">
                                <button class="btn btn-danger btn-block" onclick="setExpiredLicense()">
                                    <i class="fas fa-times-circle"></i> Set Expired License
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Back to Home -->
                <div class="text-center mt-4">
                    <a href="/" class="btn btn-outline-primary">
                        <i class="fas fa-home"></i> Back to Home
                    </a>
                </div>
            </div>
        </div>
    </div>

    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
    $(document).ready(function() {
        // Form submission
        $('#licenseForm').on('submit', function(e) {
            e.preventDefault();
            
            $.ajax({
                url: '/license/update',
                method: 'POST',
                data: $(this).serialize(),
                success: function(response) {
                    if (response.success) {
                        showAlert('success', response.message);
                        // Update form values
                        $('#license_created_at').val(response.license_created_at);
                        $('#license_expires_at').val(response.license_expires_at);
                        // Reload page to show updated status
                        setTimeout(function() {
                            location.reload();
                        }, 2000);
                    }
                },
                error: function(xhr) {
                    var errors = xhr.responseJSON.errors;
                    var errorMessages = [];
                    for (var field in errors) {
                        errorMessages.push(errors[field].join(', '));
                    }
                    showAlert('danger', errorMessages.join('<br>'));
                }
            });
        });
    });

    function setWeekLicense() {
        var today = new Date();
        var created = new Date(today);
        created.setDate(created.getDate() - 30); // 30 days ago
        var expires = new Date(today);
        expires.setDate(expires.getDate() + 7); // 7 days from now (for testing notifications)
        
        $('#license_created_at').val(created.toISOString().split('T')[0]);
        $('#license_expires_at').val(expires.toISOString().split('T')[0]);
        $('#licenseForm').submit();
    }

    function setYearlyLicense() {
        var today = new Date();
        var created = new Date(today);
        created.setDate(created.getDate() - 30); // 30 days ago
        var expires = new Date(today);
        expires.setDate(expires.getDate() + 365); // 365 days from now (1 year)
        
        $('#license_created_at').val(created.toISOString().split('T')[0]);
        $('#license_expires_at').val(expires.toISOString().split('T')[0]);
        $('#licenseForm').submit();
    }

    function setValidLicense() {
        var today = new Date();
        var created = new Date(today);
        created.setDate(created.getDate() - 30); // 30 days ago
        var expires = new Date(today);
        expires.setDate(expires.getDate() + 30); // 30 days from now
        
        $('#license_created_at').val(created.toISOString().split('T')[0]);
        $('#license_expires_at').val(expires.toISOString().split('T')[0]);
        $('#licenseForm').submit();
    }

    function setExpiringSoon() {
        var today = new Date();
        var created = new Date(today);
        created.setDate(created.getDate() - 30);
        var expires = new Date(today);
        expires.setDate(expires.getDate() + 7); // 7 days from now
        
        $('#license_created_at').val(created.toISOString().split('T')[0]);
        $('#license_expires_at').val(expires.toISOString().split('T')[0]);
        $('#licenseForm').submit();
    }

    function setExpiredLicense() {
        var today = new Date();
        var created = new Date(today);
        created.setDate(created.getDate() - 30);
        var expires = new Date(today);
        expires.setDate(expires.getDate() - 1); // Yesterday
        
        $('#license_created_at').val(created.toISOString().split('T')[0]);
        $('#license_expires_at').val(expires.toISOString().split('T')[0]);
        $('#licenseForm').submit();
    }

    function resetForm() {
        $('#licenseForm')[0].reset();
    }

    function showAlert(type, message) {
        var alertHtml = '<div class="alert alert-' + type + ' alert-dismissible fade show" role="alert">' +
                       message +
                       '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>' +
                       '</div>';
        
        $('.card-body').first().prepend(alertHtml);
        
        // Auto-dismiss after 5 seconds
        setTimeout(function() {
            $('.alert').alert('close');
        }, 5000);
    }
    </script>
</body>
</html>
