<?php
namespace App\Helpers;

/**
 * Содержит методы для работы с представлениями.
 */
class Template
{
    /**
     * Отображает шаблон с указанными параметрами.
     *
     * @param  string $path     Путь к файлу шаблона.
     * @param  array  $arParams Параметры шаблона.
     * @return void
     */
    public static function show(string $path, array $arParams = [])
    {
        global $APPLICATION;

        $APPLICATION->IncludeFile($path, $arParams, array(
            'SHOW_BORDER' => false,
            'MODE' => 'php'
        ));
    }

    /**
     * Получает HTML-код шаблона с указанными параметрами.
     *
     * @param  string $path     Путь к файлу шаблона.
     * @param  array  $arParams Параметры шаблона.
     * @return string           HTML-код шаблона.
     */
    public static function render(string $path, array $arParams = [])
    {
        ob_start();
        self::show($path, $arParams);
        $result = ob_get_contents();
        ob_end_clean();

        return $result;
    }

    /**
     * Получает ID элемента HTML в представлении для подключения возможности
     * редактировать элемент в публичной части.
     * 
     * @param  Bitrix\Template $template Шаблон компонента.
     * @param  array           $element  Элемент.
     * @return string                    ID для вставки в HTML.
     */
    public static function getEditId($template, $element)
    {
        $iblockId = $element['IBLOCK_ID'];
        $elementId = $element['ID'];

        $editLink = $element['EDIT_LINK'];
        $editParams = CIBlock::GetArrayByID($iblockId, 'ELEMENT_EDIT');

        $deleteLink = $element['DELETE_LINK'];
        $deleteParams = CIBlock::GetArrayByID($iblockId, 'ELEMENT_DELETE');
        $deleteOpts = array('CONFIRM' => GetMessage('CT_BNL_ELEMENT_DELETE_CONFIRM'));

        $template->AddEditAction($elementId, $editLink, $editParams);
        $template->AddDeleteAction($elementId, $deleteLink, $deleteParams, $deleteOpts);

        return $template->GetEditAreaId($elementId);
    }

    /**
     * Получает адрес страницы списка элементов.
     *
     * @param  array  $arResult Данные от компонента новостей.
     * @return string           Адрес страницы.
     */
    public static function getPageLink(array $arResult)
    {
        $sitePath = '';
        $link = $arResult['LIST_PAGE_URL'];
        $link = str_replace('#SITE_DIR#', $sitePath, $link);
        return $link;
    }

    /**
     * Записывает значение по ключу в кэш компонента.
     * 
     * @param  Bitrix\Template $template  Шаблон компонента Bitrix.
     * @param  array           &$arResult Массив данных для отображения в представлении.
     * @param  string          $key      Имя свойства в массиве данных.
     * @param  mixed           $value     Значение.
     * @return mixed                      Значение.
     */
    public static function setCache($template, &$arResult, $key, $value)
    {
        $isNew = !in_array($key, $template->__component->arResultCacheKeys);

        if ($isNew) {
            $newKeys = array_merge($template->__component->arResultCacheKeys, array($key));
            $template->__component->arResultCacheKeys = $newKeys;
        }

        $template->__component->arResult[$key] = $value;
        $arResult[$key] = $value;
    }
}