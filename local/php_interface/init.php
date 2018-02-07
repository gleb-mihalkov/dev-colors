<?php
require $_SERVER['DOCUMENT_ROOT'].'/local/vendor/autoload.php';

AddEventHandler('main', 'OnBeforeProlog', function() {
    $host = $_SERVER['HTTP_HOST'];
    if ($host !== 'kraskipro.com') return;

    // $redirectPage = '/site-not-working.php';

    // $file = $_SERVER['PHP_SELF'];
    // if ($file == $redirectPage) return;

    // LocalRedirect($redirectPage);
});