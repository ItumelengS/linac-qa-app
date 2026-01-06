/**
 * Linac QA System - Frontend JavaScript
 */

// Update row color based on status selection
function updateRowColor(select) {
    const row = select.closest('tr');
    row.classList.remove('pass', 'fail');
    if (select.value === 'pass') {
        row.classList.add('pass');
    } else if (select.value === 'fail') {
        row.classList.add('fail');
    }
}

// Calculate deviation for output readings
function calcDeviation(baseId) {
    const readingInput = document.querySelector(`input[onchange*="${baseId}"]`);
    const refInput = readingInput?.nextElementSibling;
    const devSpan = document.getElementById(`dev_${baseId}`);
    
    if (!readingInput || !refInput || !devSpan) return;
    
    const reading = parseFloat(readingInput.value);
    const reference = parseFloat(refInput.value);
    
    if (reading && reference) {
        const deviation = ((reading - reference) / reference * 100).toFixed(2);
        devSpan.textContent = deviation + '%';
        
        const absDeviation = Math.abs(parseFloat(deviation));
        if (absDeviation <= 2) {
            devSpan.style.color = '#10b981'; // success
        } else if (absDeviation <= 3) {
            devSpan.style.color = '#f59e0b'; // warning
        } else {
            devSpan.style.color = '#ef4444'; // danger
        }
    }
}

// Confirm before destructive actions
function confirmDelete(message) {
    return confirm(message || 'Are you sure you want to delete this item?');
}

// Auto-hide alerts after 5 seconds
document.addEventListener('DOMContentLoaded', function() {
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(alert => {
        setTimeout(() => {
            alert.style.opacity = '0';
            alert.style.transition = 'opacity 0.5s';
            setTimeout(() => alert.remove(), 500);
        }, 5000);
    });
});
