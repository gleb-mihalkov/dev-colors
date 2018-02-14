<?php
    require $_SERVER['DOCUMENT_ROOT'].'/bitrix/modules/main/include/prolog_before.php';

    if (isset($_GET['drop']))
    {
        unset($_SESSION['IS_HOME_SLIDER_SCROLLED']);
    }
    else
    {
        $_SESSION['IS_HOME_SLIDER_SCROLLED'] = true;
    }

    LocalRedirect('/');
    require $_SERVER['DOCUMENT_ROOT'].'/bitrix/modules/main/include/epilog_after.php';