<?php
require $_SERVER['DOCUMENT_ROOT'].'/local/vendor/autoload.php';

AddEventHandler('main', 'OnBeforeProlog', function() {
    $host = $_SERVER['HTTP_HOST'];
    if ($host !== 'kraskipro.com') return;

    LocalRedirect('site-not-working.php');
});