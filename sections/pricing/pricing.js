document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'btn-monthly') {
        document.getElementById('btn-monthly').classList.add('active');
        document.getElementById('btn-annual').classList.remove('active');
        document.querySelectorAll('.pricing-amount[data-monthly]').forEach(el => {
            el.textContent = '$' + el.getAttribute('data-monthly');
        });
    } else if (e.target && e.target.id === 'btn-annual') {
        document.getElementById('btn-annual').classList.add('active');
        document.getElementById('btn-monthly').classList.remove('active');
        document.querySelectorAll('.pricing-amount[data-annual]').forEach(el => {
            el.textContent = '$' + el.getAttribute('data-annual');
        });
    }
});
