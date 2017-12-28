<?php
namespace App\Model;

/**
 * Модель описания урока курса.
 */
class Lesson extends News
{
    /**
     * Цена урока.
     *
     * @var string
     */
    public $price;

    /**
     * Количество человек.
     *
     * @var string
     */
    public $peoples;

    /**
     * Количество уроков.
     *
     * @var string
     */
    public $lessons;

    /**
     * Расписание.
     *
     * @var string
     */
    public $schedule;

    /**
     * Примечания.
     *
     * @var string
     */
    public $notes;

    /**
     * Создает экземпляр класса.
     *
     * @param array $data Данные от компонента.
     */
    public function __construct(array $data)
    {
        parent::__construct($data);
        $this->price = self::getProperty($data, 'PRICE');
        $this->peoples = self::getProperty($data, 'PEOPLES');
        $this->lessons = self::getProperty($data, 'COUNT');
        $this->schedule = self::getProperty($data, 'SCHEDULE', true);
        $this->notes = self::getProperty($data, 'NOTES');

        $this->schedule = $this->schedule['TEXT'] ?? '';

        $this->notes = preg_replace('/\*(.*)\*/', '<strong>$1</strong>', $this->notes);
    }
}