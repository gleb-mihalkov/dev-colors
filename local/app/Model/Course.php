<?php
namespace App\Model;

use stdClass;

/**
 * Модель курсов.
 */
class Course extends PicturedNews
{
    const TEACHER = '8';
    const RESULT = '10';
    const LESSON = '9';

    /**
     * Описание названия.
     *
     * @var string
     */
    public $subtitle;

    /**
     * Текст "Как получить скидку".
     *
     * @var string
     */
    public $sale;

    /**
     * Программа курса.
     *
     * @var string
     */
    public $program;

    /**
     * Идентификатор преподавателя.
     *
     * @var string
     */
    protected $teacherId;

    /**
     * Массив ID для блока "Что вы получите от курса".
     *
     * @var array
     */
    protected $results;

    /**
     * ID раздела с описанием занятий.
     *
     * @var string
     */
    protected $lessons;

    /**
     * Создает экземпляр класса.
     *
     * @param array $data Данные от компонента.
     */
    public function __construct(array $data)
    {
        parent::__construct($data);
        $this->subtitle = self::getProperty($data, 'SUBTITLE');
        $this->teacherId = self::getProperty($data, 'TEACHER');
        $this->sale = self::getProperty($data, 'SALE_INFO', true);
        $this->program = self::getProperty($data, 'PROGRAM', true);
        $this->results = self::getProperty($data, 'RESULTS');
        $this->lessons = self::getProperty($data, 'LESSONS');

        $this->program = $this->program['TEXT'] ?? '';
        $this->sale = $this->sale['TEXT'] ?? '';
    }

    /**
     * Получает модель преподавателя курса.
     *
     * @return Teacher Модель преподавателя.
     */
    public function getTeacher()
    {
        $data = self::getById($this->teacherId);
        return $data ? new Teacher($data) : null;
    }

    /**
     * Получает массив моделей результатов курса.
     *
     * @return array Массив моделей.
     */
    public function getResults()
    {
        if (!$this->results)
        {
            return [];
        }
        
        $list = self::getByIds(self::RESULT, $this->results);
        return Result::getList($list);
    }

    /**
     * Получает массив моделей описаний типов уроков.
     *
     * @return array Массив моделей.
     */
    public function getLessons()
    {
        if (!$this->lessons)
        {
            return [];
        }
        
        $list = self::getBySection(self::LESSON, $this->lessons);
        return Lesson::getList($list);
    }
}