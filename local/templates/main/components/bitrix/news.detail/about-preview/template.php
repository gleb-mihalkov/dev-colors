<?
    if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true) die();

    $heading = $arResult['NAME'];
    $previewText = $arResult['PREVIEW_TEXT'];
?>
<div class="box box--offset-px-116">
    <div class="offset offset--text-normal">
        <h2 class="heading heading--align-center"><?= $heading; ?></h2>
    </div>
    <div class="offset offset--text-medium  text--align-center">
        <?= $previewText; ?>
    </div>
    <div class="offset offset--text-medium  text text--align-center">
        <a href="#" class="button button--type-default button--width-large">
            Читать полностью
        </a>
    </div>
</div>