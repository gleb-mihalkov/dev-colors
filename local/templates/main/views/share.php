<?php
    if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true) die();

    use App\Helpers\HtmlClass;

    $title = $arParams['TITLE'] ?? '';
    $text = $arParams['TEXT'] ?? '';
    $image = $arParams['IMAGE'] ?? '';

    $type = $arParams['TYPE'] ?? 'default';

    $itemClass = new HtmlClass();
    $itemClass->is($type === 'default', 'share--type-default');
    $itemClass->is($type === 'buttons', 'share--type-buttons');
    $itemClass->is($type === 'inline', 'share--type-inline');

    $schema = isset($_SERVER['HTTPS']) ? 'https' : 'http';
    $hostname = $schema.'://'.$_SERVER['HTTP_HOST'];

    if ($image)
    {
        $image = $hostname.$image;
    }

    $url = $hostname.$_SERVER['REQUEST_URI'];

    $url = urlencode($url);
    $title = urlencode($title);
    $text = urlencode($text);
    $image = urlencode($image);

    $vkLink = 'https://vk.com/share.php'
        .'?url='.$url
        .'&title='.$title;

    $fbLink = 'https://www.facebook.com/sharer.php'
        .'?u='.$url;
    
    $twLink = 'http://twitter.com/share'
        .'?url='.$url
        .'&text='.$title;
?>
<div class="share <?= $itemClass; ?>">
    <div class="share__title">Поделиться</div>
    <div class="share__icons">
        <a href="<?= $vkLink; ?>" target="_blank" rel="nofollow" class="share__vk"></a>
        <a href="<?= $fbLink; ?>" target="_blank" rel="nofollow" class="share__fb"></a>
        <a href="<?= $twLink; ?>" target="_blank" rel="nofollow" class="share__tw"></a>
    </div>
</div>