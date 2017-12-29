<?
    if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true) die();

    use App\Helpers\HtmlClass;
    use App\Helpers\Template;
    use App\Model\Course;

    $item = $arResult['MODEL'];
    $teachers = $item->getTeachers();
    $teachersCount = count($teachers);
    $lessons = $item->getLessons();
    $results = $item->getResults();

    $titleClass = $item->isSmallTitle ? 'course-lead__title--small' : '';
?>
<div class="course">
    <div class="course__header">
        <div
            <? if ($item->backgroundColor) : ?>
                style="background-color: <?= $item->backgroundColor; ?>"
            <? endif; ?>
            class="course-lead"
            >
            <div class="course-lead__container">
                <div
                    style="background-image: url(<?= $item->imageLarge; ?>)"
                    class="course-lead__aside"
                    ></div>
                <div class="course-lead__main">
                    <h1 class="course-lead__title <?= $titleClass; ?>"><?= $item->title; ?></h1>
                    <p class="course-lead__text"><?= $item->desc; ?></p>
                    <div class="course-lead__actions">
                        <button type="button" class="course-lead__button" data-modal="feedback">
                            <span>Записаться</span>
                        </button>
                        <div class="course-lead__share">
                            <? Template::show(SITE_TEMPLATE_PATH.'/views/share.php', [
                                'TYPE' => 'inline',
                                'TITLE' => $item->title,
                                'TEXT' => $item->desc,
                                'IMAGE' => $item->image
                            ]); ?>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="course-lead-small">
            <h1 class="course-lead-small__title"><?= $item->title; ?></h1>
            <div class="course-lead-small__share-top">
                <? Template::show(SITE_TEMPLATE_PATH.'/views/share.php', [
                    'TYPE' => 'buttons',
                    'TITLE' => $item->title,
                    'TEXT' => $item->desc,
                    'IMAGE' => $item->image
                ]); ?>
            </div>
            <p class="course-lead-small__text"><?= $item->desc; ?></p>
            <div class="course-lead-small__actions">
                <button type="button" class="course-lead-small__button" data-modal="feedback">
                    <span>Записаться</span>
                </button>
            </div>
            <figure class="course-lead-small__image-group">
                <span
                    style="<?= $item->imageStyle; ?>"
                    class="course-lead-small__image"
                    ></span>
            </figure>
        </div>
    </div>
    <div class="course__content">
        <div class="course-grid">
            <div class="course-grid__about"><?= $item->text; ?></div>
            <? if ($results) : ?>
                <div
                    <? if ($item->backgroundColor) : ?>
                        style="border-color: <?= $item->backgroundColor; ?>"
                    <? endif; ?>
                    class="course-grid__results"
                    >
                    <div class="course-results">
                        <h3 class="course-results__title">Что вы получите от нашего курса:</h3>
                        <? foreach ($results as $result) : ?>
                            <div
                                style="background-image: url(<?= $result->image; ?>)"
                                class="course-results__item"
                                >
                                <h4 class="course-results__subtitle"><?= $result->title; ?></h4>
                                <p class="course-results__value"><?= $result->desc; ?></p>
                            </div>
                        <? endforeach; ?>
                    </div>
                </div>
            <? endif; ?>
            <? if ($item->program) : ?>
                <div class="course-grid__program">
                    <h2>Программа курса:</h2>
                    <?= $item->program; ?>
                </div>
            <? endif; ?>
            <div data-breaker=""></div>
            <? if ($lessons) : ?>
                <div class="course-grid__lessons">
                    <? foreach ($lessons as $lesson) : ?>
                        <div class="course-grid__lessons-item">
                            <div class="course-lesson  active">
                                <div class="course-lesson__header">
                                    <h3 class="course-lesson__title"><?= $lesson->title; ?></h3>
                                    <div class="course-lesson__price">
                                        <span class="course-lesson__price-text"><?= $lesson->price; ?> руб.</span>
                                        <? if ($lesson->notes) : ?>
                                            <span class="course-lesson__popup">
                                                <span class="course-lesson__popup-box">
                                                    <span class="course-lesson__popup-content">
                                                        <?= $lesson->notes; ?>
                                                    </span>
                                                </span>
                                            </span>
                                        <? endif; ?>
                                    </div>
                                </div>
                                <div class="course-lesson__content">
                                    <div class="course-lesson__item">
                                        <h4 class="course-lesson__subtitle">Количество человек:</h4>
                                        <div class="course-lesson__value"><?= $lesson->peoples; ?></div>
                                    </div>
                                    <div class="course-lesson__item">
                                        <h4 class="course-lesson__subtitle">Занятий:</h4>
                                        <div class="course-lesson__value"><?= $lesson->lessons; ?></div>
                                    </div>
                                    <div class="course-lesson__item">
                                        <h4 class="course-lesson__subtitle">График:</h4>
                                        <div class="course-lesson__value"><?= $lesson->schedule; ?></div>
                                    </div>
                                </div>
                                <div class="course-lesson__footer">
                                    <button type="button" class="course-lesson__button" data-modal="feedback">
                                        <span>Записаться на курс</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    <? endforeach; ?>
                </div>
            <? endif; ?>
            <? if ($item->sale) : ?>
                <div class="course-grid__sale">
                    <div class="course-sale">
                        <h3 class="course-sale__title">Как получить скидку?</h3>
                        <p class="course-sale__text"><?= $item->sale; ?></p>
                    </div>
                </div>
            <? endif; ?>
        </div>
    </div>
    <div class="course__footer">
        <div
            <? if ($item->backgroundColor) : ?>
                style="background-color: <?= $item->backgroundColor; ?>"
            <? endif; ?>
            class="course-baner"
            >
            <div class="course-baner__items-wrapper">
                <div class="course-baner__items" id="teachersSlider" data-duration="1000">
                    <? for ($i = 0; $i < $teachersCount; $i++) : ?>
                        <?
                            $teacher = $teachers[$i];
                            $teacherClass = new HtmlClass();
                            $teacherClass->is($i == 0, 'active');
                        ?>
                        <div class="course-baner__item  <?= $teacherClass; ?>">
                            <div
                                style="background-image: url(<?= $teacher->image; ?>)"
                                class="course-baner__image"
                                ></div>
                            <div class="course-baner__main">
                                <p class="course-baner__subtitle"><?= $teacher->desc; ?></p>
                                <h2 class="course-baner__title"><?= $teacher->title; ?></h2>
                                <p class="course-baner__text"><?= $teacher->text; ?></p>
                                <button type="button" class="course-baner__button" data-modal="feedback">
                                    <span>Записаться на курс</span>
                                </button>
                            </div>
                        </div>
                    <? endfor; ?>
                </div>
                <div class="course-baner__arrows">
                    <button type="button" class="course-baner__prev" data-back="teachersSlider"></button>
                    <button type="button" class="course-baner__next" data-next="teachersSlider"></button>
                </div>
            </div>
        </div>
    </div>
    <script type="text/javascript">
        !(function() {
            var fixHeight = function() {
                var container = document.querySelector('.course-grid');
                var firstHeight = 0;
                var lastHeight = 0;
                var breaker = null;

                for (var i = 0; i < container.childNodes.length; i++) {
                    var item = container.childNodes[i];
                    if (item.nodeType !== 1) continue;

                    if (item.hasAttribute('data-breaker')) {
                        breaker = item;
                        continue;
                    }

                    var styles = getComputedStyle(item);
                    var marginTop = styles.marginTop.replace('px', '') * 1;
                    var marginBottom = styles.marginBottom.replace('px', '') * 1;
                    var height = styles.height.replace('px', '') * 1;

                    var value = height + marginTop + marginBottom;

                    if (breaker == null) {
                        firstHeight += value;
                        continue;
                    }

                    lastHeight += value;
                }

                var maxHeight = 0;

                if (firstHeight < lastHeight) {
                    breaker.style.height = (lastHeight - firstHeight) + 'px';
                    maxHeight = lastHeight;
                }
                else {
                    maxHeight = firstHeight;
                }

                container.style.height = maxHeight + 'px';
            };
            setTimeout(fixHeight, 1);

            var teachersSlider = document.querySelector('.course-baner__items');
            var teachers = document.querySelectorAll('.course-baner__item');

            var updateTeachers = function() {
                var maxHeight = 0;

                for (var i = 0; i < teachers.length; i++) {
                    var teacher = teachers[i];
                    var height = teacher.offsetHeight;

                    if (height < maxHeight) {
                        continue;
                    }

                    maxHeight = height;
                }

                teachersSlider.style.height = maxHeight + 'px';
            }
            
            window.addEventListener('resize', updateTeachers);
            updateTeachers();

            var popups = document.querySelectorAll('.course-lesson__popup');
            var windowOffset = 10;

            if (!popups.length) {
                return;
            }

            var setPopupBoxOffset = function(box, value) {
                if (!value) {
                    box.style.transform = '';
                    return;
                }

                var value = 'translateX(-' + value + 'px)';
                box.style.transform = value;
            };

            var updatePopups = function() {
                var windowWidth = window.innerWidth
                    || document.body.clientWidth
                    || document.documentElement.clientWidth;

                var maxRight = windowWidth - windowOffset;

                for (var i = 0; i < popups.length; i++) {
                    var popup = popups[i];
                    var box = popup.querySelector('.course-lesson__popup-box');

                    setPopupBoxOffset(box, 0);

                    var boxRect = box.getBoundingClientRect();
                    var boxRight = Math.ceil(boxRect.right);

                    if (boxRect.right <= maxRight) {
                        continue;
                    }

                    var diff = boxRight - maxRight;
                    setPopupBoxOffset(box, diff);
                }
            };

            window.addEventListener('resize', updatePopups);
            updatePopups();
        })();
    </script>
</div>