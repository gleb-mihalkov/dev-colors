<?
    if (!defined('B_PROLOG_INCLUDED') || B_PROLOG_INCLUDED !== true) die();

    use App\Helpers\Template;
    use App\Model\Course;

    $item = new Course($arResult);
    $teacher = $item->getTeacher();
    $lessons = $item->getLessons();
    $results = $item->getResults();
?>
<div class="course">
    <div class="course__header">
        <div class="course-lead">
            <div
                style="background-image: url(<?= $item->image; ?>)"
                class="course-lead__container"
                >
                <div class="course-lead__main">
                    <h1 class="course-lead__title"><?= $item->title; ?></h1>
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
    </div>
    <div class="course__content">
        <div class="course-grid">
            <div class="course-grid__about"><?= $item->text; ?></div>
            <? if ($results) : ?>
                <div class="course-grid__results">
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
                                    <div class="course-lesson__price"><?= $lesson->price; ?> руб.</div>
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
    <script type="text/javascript">
        !(function() {
            var fn = function() {
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
            setTimeout(fn, 1);
        })();
    </script>
    <div class="course__footer">
        <div class="course-baner">
            <div
                class="course-baner__container"
                >
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
        </div>
    </div>
</div>