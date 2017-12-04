<?php
namespace App\Model;

use Bitrix\Main\Type\DateTime;
use App\Helpers\Template;
use CFile;
use CIBlock;
use CIBlockElement;

/**
 * Модель новости инфоблока.
 */
class News
{
    /**
     * Идентификатор инфоблока.
     *
     * @var string
     */
    public $iblockId;

    /**
     * Идентификатор новости.
     *
     * @var string
     */
    public $id;

    /**
     * Название новости.
     *
     * @var string
     */
    public $title;

    /**
     * Ссылка на детальную страницу новости.
     *
     * @var string
     */
    public $link;

    /**
     * Описание курса.
     *
     * @var string
     */
    public $desc;

    /**
     * Полный текст новости.
     *
     * @var string
     */
    public $text;

    /**
     * Ссылка на страницу редактирования элемента.
     *
     * @var string
     */
    public $editLink;

    /**
     * Ссылка на страницу удаления элемента.
     *
     * @var string
     */
    public $deleteLink;

    /**
     * Ссылка на страницу компонента новостей.
     *
     * @var string
     */
    public $listLink;

    /**
     * Создает экземпляр класса.
     *
     * @param array $data Данные, которые пришли от компонента news.list.
     */
    public function __construct(array $data)
    {
        $this->iblockId = $data['IBLOCK_ID'];
        $this->editLink = $data['EDIT_LINK'];
        $this->deleteLink = $data['DELETE_LINK'];
        $this->id = $data['ID'];
        $this->title = $data['NAME'];
        $this->desc = strip_tags($data['PREVIEW_TEXT']);
        $this->text = $data['DETAIL_TEXT'];
        $this->listLink = $data['LIST_PAGE_URL'];
        $this->link = $data['DETAIL_PAGE_URL'];
    }

    /**
     * Получает Id области редактирования элемента.
     *
     * @param  mixed  $template Шаблон компонента.
     * @return string           Id области редактирования.
     */
    public function getEditId($template)
    {
        $iblockId = $this->iblockId;
        $elementId = $this->id;

        $editLink = $this->editLink;
        $editParams = CIBlock::GetArrayByID($iblockId, 'ELEMENT_EDIT');

        $deleteLink = $this->deleteLink;
        $deleteParams = CIBlock::GetArrayByID($iblockId, 'ELEMENT_DELETE');
        $deleteOpts = array('CONFIRM' => GetMessage('CT_BNL_ELEMENT_DELETE_CONFIRM'));

        $template->AddEditAction($elementId, $editLink, $editParams);
        $template->AddDeleteAction($elementId, $deleteLink, $deleteParams, $deleteOpts);

        return $template->GetEditAreaId($elementId);
    }



    /**
     * Список новостей.
     *
     * @param  array $list Список, полученный от компонента новостей.
     * @return array       Массив моделей.
     */
    public static function getList(array $list)
    {
        $result = [];

        foreach ($list as $item)
        {
            $model = new static($item);
            $result[] = $model;
        }

        return $result;
    }

    /**
     * Получает значение свойства.
     *
     * @param  array  $data Данные от компонента.
     * @param  string $name Имя свойства.
     * @return mixed        Значение свойства.
     */
    public static function getProperty(array $data, string $name, bool $isPlain = false)
    {
        $key = $isPlain ? '~VALUE' : 'VALUE';
        return $data['PROPERTIES'][$name][$key];
    }

    /**
     * Получает ссылку на изображение с измененым размером.
     *
     * @param  string $image  Данные об изображении.
     * @param  int    $width  Максимальная ширина изображения.
     * @param  int    $height Максимальная высота изображения.
     * @return string         Ссылка на изображение.
     */
    public static function getImageResize($image, int $width = null, int $height = null)
    {
        $size = [];

        if ($height !== null)
        {
            $size['height'] = $height;
        }

        if ($width !== null)
        {
            $size['width'] = $width;
        }

        $image = CFile::ResizeImageGet($image, $size, BX_RESIZE_IMAGE_PROPORTIONAL, false);
        return $image['src'] ?? null;
    }

    /**
     * Получает объект даты / времени из строкового значения.
     *
     * @param  string               $value Строковое значение.
     * @return Bitrix\Main\DateTime        Объект даты / времени.
     */
    public static function getDate(string $value)
    {
        return new DateTime($value);
    }

    /**
     * Получает один результат из БД.
     *
     * @param  CDBResult $result Результат запроса к БД.
     * @return array             Данные для модели.
     */
    protected static function fetch($result)
    {
        $data = $result->GetNextElement();
        if (!$data) return null;

        $fields = $data->GetFields();
        $props = $data->GetProperties();

        $data = $fields;
        $data['PROPERTIES'] = $props;

        return $data;
    }

    /**
     * Получает массив элементов по фильтру.
     *
     * @param  string $iblockId ID инфоблока.
     * @param  array  $filter   Фильтр.
     * @return array            Массив элементов.
     */
    protected static function getByFilter(string $iblockId, array $filter)
    {
        $defaults = [
            'IBLOCK_ID' => $iblockId,
            'ACTIVE' => 'Y'
        ];

        $filter = array_merge($defaults, $filter);
        $result = CIBlockElement::GetList(['SORT' => 'ASC'], $filter);

        $list = [];

        while ($data = self::fetch($result))
        {
            $list[] = $data;
        }

        return $list;
    }

    /**
     * Получает элемент по его идентификатору.
     *
     * @param  string $id Идентификатор элемента.
     * @return array      Элемент.
     */
    public static function getById(string $id)
    {
        $result = CIBlockElement::GetByID($id);
        return self::fetch($result);
    }

    /**
     * Получает массив элементов по массиву их ID.
     *
     * @param  string $iblockId ID инфоблока.
     * @param  array  $ids      Массив ID.
     * @return array            Массив элементов.
     */
    public static function getByIds(string $iblockId, array $ids)
    {
        return self::getByFilter($iblockId, ['ID' => $ids]);
    }

    /**
     * Получает массив элементов из раздела.
     *
     * @param  string $iblockId  ID инфоблока.
     * @param  string $sectionId ID раздела.
     * @return array             Массив элементов.
     */
    public static function getBySection(string $iblockId, string $sectionId)
    {
        return self::getByFilter($iblockId, ['SECTION_ID' => $sectionId]);
    }
}