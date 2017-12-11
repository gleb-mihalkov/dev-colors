<?php
    if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true) die();

    use App\Helpers\HtmlClass;
    use App\Model\Home;

    $items = Home::getList($arResult['ITEMS']);

    $staticItem = null;
    $temp = [];

    foreach ($items as $item)
    {
        if ($item->isStatic)
        {
            $staticItem = $item;
            continue;
        }

        $temp[] = $item;
    }

    $items = $temp;
    $itemsCount = count($items);

    $itemsClass = new HtmlClass();
    $itemsClass->is(isset($_SESSION['IS_HOME_SLIDER_SCROLLED']), 'scrolled');
?>
<div class="home-slider">
    <div class="home-slider__slides-wrapper">
        <div class="home-slider__slides-container">
            <div class="home-slider__slides <?= $itemsClass; ?>" id="homeSlider" data-effect="change" data-duration="1500">
                <? for ($i = 0; $i < $itemsCount; $i++) : ?>
                    <?
                        $item = $items[$i];
                        $itemClass = new HtmlClass();
                        $itemClass->is($i == 0, 'active');
                    ?>
                    <div
                        style="background-image: url(<?= $item->image; ?>)"
                        class="home-slider__slide <?= $itemClass; ?>"
                        ></div>
                <? endfor; ?>
            </div>
            <div class="home-slider__effect"></div>
        </div>
        <script type="text/javascript">
            !(function() {
                var box = document.querySelector('.home-slider__slides');

                var fn = function() {
                    var width = box.clientWidth;
                    box.style.height = width + 'px';
                };

                window.addEventListener('resize', fn);
                fn();
            })();
        </script>
    </div>
    <div class="home-slider__dots" data-dots="homeSlider" data-effect="next">
        <? for ($i = 0; $i < $itemsCount; $i++) : ?>
            <?
                $itemClass = $i === 0 ? 'active' : '';
            ?>
            <button
                class="home-slider__dot <?= $itemClass; ?>"
                type="button"
                ></button>
        <? endfor; ?>
    </div>
    <div class="home-slider__static">
        <div style="background-image: url(<?= $staticItem->image; ?>)"></div>
    </div>
</div>