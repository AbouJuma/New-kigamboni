@if(isset($licenseNotification) && $licenseNotification['show'])
<div class="license-notification-container">
    <div class="alert alert-{{ $licenseNotification['type'] }} alert-dismissible fade show m-0 license-notification" role="alert">
        <div class="d-flex align-items-center justify-content-between">
            <div class="d-flex align-items-center">
                <i class="fas fa-exclamation-triangle me-2"></i>
                <div>
                    <strong>License Expiration Notice!</strong>
                    <div class="small">
                        Your license will expire in 
                        <span class="badge bg-{{ $licenseNotification['type'] }} text-white countdown-badge">
                            {{ $licenseNotification['daysLeft'] }} {{ Str::plural('day', $licenseNotification['daysLeft']) }}
                        </span>
                        on {{ $licenseNotification['expiryDate'] }}.
                    </div>
                </div>
            </div>
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
        
        @if($licenseNotification['daysLeft'] <= 3)
        <div class="mt-2 small text-danger">
            <i class="fas fa-exclamation-circle"></i> 
            <strong>Immediate action required!</strong> Please renew your license to avoid service interruption.
        </div>
        @endif
    </div>
</div>

<style>
.license-notification-container {
    position: fixed;
    top: 10px; /* 10px from top */
    left: 0;
    right: 0;
    z-index: 1030; /* Lower z-index to avoid conflicts */
    pointer-events: none; /* Allow clicks to pass through to elements underneath */
    height: 0; /* Container has no height */
}

.license-notification {
    border-radius: 0.375rem;
    border-left: 4px solid;
    pointer-events: auto; /* Re-enable pointer events for notification itself */
    margin: 0 auto;
    max-width: 450px; /* Further minimized width */
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    position: relative;
    animation: slideDown 0.15s ease-out;
    left: 50%;
    transform: translateX(-50%);
}

@keyframes slideDown {
    from {
        opacity: 0;
        transform: translateY(-10px) translateX(-50%); /* Start from top with centering */
    }
    to {
        opacity: 1;
        transform: translateY(0) translateX(-50%); /* End at final position with centering */
    }
}

.countdown-badge {
    font-size: 0.875rem;
    padding: 0.25rem 0.5rem;
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.7; }
    100% { opacity: 1; }
}

/* Remove body padding adjustment to avoid affecting other elements */
/* body {
    padding-top: 0;
    transition: padding-top 0.3s ease;
}

body.has-license-notification {
    padding-top: 80px;
} */

@media (max-width: 768px) {
    .license-notification-container {
        top: 5px; /* 5px on mobile */
    }
    
    .license-notification {
        margin: 0;
        max-width: calc(100% - 40px); /* Full width with 20px margins */
        left: 20px;
        right: 20px;
        transform: none; /* Remove centering on mobile for better positioning */
    }
    
    .license-notification .d-flex {
        flex-direction: column !important;
        align-items: flex-start !important;
    }
    
    .license-notification .btn-close {
        margin-top: 0.5rem;
        align-self: flex-end;
    }
}
</style>

<script>
document.addEventListener('DOMContentLoaded', function() {
    var notification = document.querySelector('.license-notification');
    if (notification) {
        // Update countdown every hour
        updateCountdown();
        setInterval(updateCountdown, 3600000); // 1 hour
    }
    
    function updateCountdown() {
        var expiryDate = new Date('{{ $licenseNotification['expiryDateShort'] }}');
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        expiryDate.setHours(0, 0, 0, 0);
        
        var daysLeft = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
        var badge = document.querySelector('.countdown-badge');
        
        if (badge && daysLeft >= 0) {
            badge.textContent = daysLeft + ' ' + (daysLeft === 1 ? 'day' : 'days');
            
            // Update alert type based on days left
            var alertDiv = badge.closest('.alert');
            if (daysLeft <= 3) {
                alertDiv.className = alertDiv.className.replace(/alert-\w+/, 'alert-warning');
                badge.className = badge.className.replace(/bg-\w+/, 'bg-warning');
            } else if (daysLeft <= 7) {
                alertDiv.className = alertDiv.className.replace(/alert-\w+/, 'alert-info');
                badge.className = badge.className.replace(/bg-\w+/, 'bg-info');
            }
        }
    }
});
</script>
@endif
