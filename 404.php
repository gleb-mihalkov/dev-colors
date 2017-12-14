<?
    include_once($_SERVER['DOCUMENT_ROOT'].'/bitrix/modules/main/include/urlrewrite.php');
    CHTTP::SetStatus('404 Not Found');
    @define('ERROR_404', 'Y');
    require($_SERVER['DOCUMENT_ROOT'].'/bitrix/header.php');

    $APPLICATION->SetTitle('Страница не найдена');
?>
<div class="service-page">
    <div class="service-page__inner">
        <h1 class="service-page__title">Страница не найдена</h1>
        <div class="service-page__text">Перейдите на главную страницу</div>
        <div class="service-page__bottom">
            <a href="/" class="service-page__link">
                <span>На главную</span>
            </a>
        </div>
    </div>
</div>
<? require($_SERVER['DOCUMENT_ROOT'].'/bitrix/footer.php'); ?>