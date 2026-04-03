# LashMaker MVP

MVP веб-приложения для мастера по наращиванию ресниц на `Next.js App Router`, `TypeScript` и `Supabase`.

## Что умеет MVP

### Для клиента

- Главная страница с описанием услуги и формой записи
- Выбор только из свободных слотов
- Создание публичной ссылки вида `/booking/[token]`
- Просмотр деталей записи
- Отмена записи клиентом
- После отмены слот снова становится доступным

### Для мастера

- Страница `/admin` с расписанием по дням
- Видно свободные и занятые окна
- Видно имя, телефон и стиль клиента
- Можно добавлять окна для записи
- Можно удалять свободные окна
- Видно отмененные записи

### Интеграции

- Абстракция под SMS-провайдера
- Отправка SMS-подтверждения после бронирования
- Серверный маршрут для напоминаний на завтра
- Защита от повторной отправки через `reminder_sent`

## Стек

- `Next.js` App Router
- `TypeScript`
- `Supabase`
- `Zod`
- Подготовка к деплою на `Vercel`

## Быстрый запуск

1. Установите зависимости:

```bash
npm install
```

2. Скопируйте окружение:

```bash
cp .env.example .env.local
```

3. Заполните переменные:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `CRON_SECRET`

4. Примените SQL из файла [20260403210000_init.sql](/Users/esfirpr/Documents/Project/lashmaker/supabase/migrations/20260403210000_init.sql) в Supabase SQL Editor или через Supabase CLI.

5. Запустите проект:

```bash
npm run dev
```

6. Откройте [http://localhost:3000](http://localhost:3000)

## Настройка Supabase

Используется две таблицы:

- `time_slots`
- `bookings`

Приложение работает через серверные функции и API routes, поэтому доступ к Supabase идет только на сервере через `SUPABASE_SERVICE_ROLE_KEY`. На клиенте сервисный ключ не используется.

Для production позже стоит добавить полноценную защиту страницы `/admin`.

## Как работают SMS

Сейчас подключен `console`-провайдер:

- подтверждение записи просто логируется в серверную консоль
- напоминание на завтра тоже логируется

Чтобы подключить реальный сервис, достаточно добавить новый провайдер в директории [lib/sms](/Users/esfirpr/Documents/Project/lashmaker/lib/sms) и переключить `SMS_PROVIDER`.

## Напоминания на завтра

Маршрут:

- `POST /api/reminders`

Заголовок:

- `x-cron-secret: <CRON_SECRET>`

Поведение:

- ищет подтвержденные записи на завтрашнюю дату
- отправляет SMS
- помечает `reminder_sent = true`
- повторно такие записи не шлет

Пример вызова:

```bash
curl -X POST http://localhost:3000/api/reminders \
  -H "x-cron-secret: change-me"
```

## Деплой на Vercel

1. Создайте проект в Vercel и подключите репозиторий.
2. Добавьте переменные окружения из `.env.example`.
3. В Supabase выполните миграцию.
4. Установите `NEXT_PUBLIC_APP_URL` на production-домен Vercel.
5. Для напоминаний создайте Cron Job в Vercel, который вызывает `POST /api/reminders` с заголовком `x-cron-secret`.

## Структура проекта

```text
app/
  admin/
  api/
  booking/[token]/
components/
lib/
  sms/
  supabase/
supabase/migrations/
```

## Архитектура

- `app/` содержит страницы, серверные actions и API routes
- `components/` содержит UI-компоненты форм
- `lib/booking-service.ts` хранит основную бизнес-логику бронирований и слотов
- `lib/supabase/admin.ts` создает серверный Supabase-клиент
- `lib/sms/` содержит абстракцию под SMS-провайдера
- `supabase/migrations/` содержит SQL для схемы БД

## Что стоит сделать следующим шагом

- Закрыть `/admin` базовой авторизацией
- Подключить реальный SMS-провайдер
- Добавить тесты и логирование ошибок
